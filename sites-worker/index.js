import { appProfileFromStored, buildIntegratedRecord, visibleFragments } from './memory.js'
import { matchUser } from './matching.js'

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

async function ensureSchema(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, username TEXT, created_at TEXT NOT NULL, last_seen_at TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated_at TEXT NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at)'),
  ])
}

function identity(request) {
  const id = request.headers.get('oai-authenticated-user-id')
  const email = request.headers.get('oai-authenticated-user-email') || ''
  let name = email.split('@')[0]
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { name = decodeURIComponent(request.headers.get('oai-authenticated-user-full-name') || '') || name } catch { /* fallback */ }
  }
  return id ? { id, email, username: name } : null
}

async function touchUser(db, user) {
  const now = new Date().toISOString()
  await db.prepare(`INSERT INTO users (id,email,username,created_at,last_seen_at) VALUES (?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET email=excluded.email,username=excluded.username,last_seen_at=excluded.last_seen_at`)
    .bind(user.id, user.email, user.username, now, now).run()
}

async function storedProfile(db, id) {
  const row = await db.prepare('SELECT data,updated_at FROM profiles WHERE user_id=?').bind(id).first()
  if (!row) return null
  try { return { data: JSON.parse(row.data), updatedAt: row.updated_at } } catch { return null }
}

async function allRows(db) {
  const result = await db.prepare(`SELECT u.id,u.email,u.username,u.created_at,u.last_seen_at,p.data,p.updated_at
    FROM users u LEFT JOIN profiles p ON p.user_id=u.id ORDER BY COALESCE(p.updated_at,u.created_at) DESC`).all()
  return (result.results || []).map((r) => { let record=null; try { record=r.data ? JSON.parse(r.data) : null } catch {} return { id:r.id,email:r.email,username:r.username,createdAt:r.created_at,lastSeenAt:r.last_seen_at,updatedAt:r.updated_at,record } })
}

function isAdmin(user, env) {
  const configured = String(env.VOUCH_ADMIN_EMAIL || '').trim().toLowerCase()
  return !!user && !!configured && user.email.toLowerCase() === configured
}

async function api(request, env, path) {
  const user = identity(request)
  if (!user) return json({ error: '请先使用 ChatGPT 登录' }, 401)
  await touchUser(env.DB, user)

  if (path === '/api/auth/me') return json({ user: { id: user.id, username: user.username, email: user.email } })
  if (path === '/api/auth/logout') return json({ ok: true })
  if (path === '/api/auth/login' || path === '/api/auth/register') return json({ user: { id:user.id, username:user.username, email:user.email } })
  if (path === '/api/health') return json({ ok: true })

  if (path === '/api/profile' && request.method === 'GET') {
    const row = await storedProfile(env.DB, user.id)
    return json({ profile: appProfileFromStored(row?.data), updatedAt: row?.updatedAt || null })
  }
  if (path === '/api/profile' && request.method === 'PUT') {
    const body = await request.json().catch(() => ({})); if (!body.profile || typeof body.profile !== 'object') return json({ error:'profile required' },400)
    const previous = (await storedProfile(env.DB,user.id))?.data
    const record = buildIntegratedRecord(user, body.profile, previous); const now = new Date().toISOString()
    await env.DB.prepare(`INSERT INTO profiles (user_id,data,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at`).bind(user.id,JSON.stringify(record),now).run()
    return json({ ok:true, updatedAt:now })
  }
  if (path === '/api/memory/fragments') return json({ fragments: visibleFragments((await storedProfile(env.DB,user.id))?.data) })
  if (path === '/api/matches') return json({ result: matchUser(user.id, await allRows(env.DB)) })

  if (path.startsWith('/api/admin/')) {
    if (!isAdmin(user,env)) return json({ error:'admin access required' },403)
    const rows=await allRows(env.DB)
    if (path === '/api/admin/overview') {
      const records=rows.filter((x)=>x.record), frags=records.flatMap((x)=>x.record?._app_profile?.fragments||[]), visible=frags.filter((f)=>f.permissions?.display!==false)
      return json({ totals:{users:rows.length,profiles:records.length,fragments:frags.length,visibleFragments:visible.length,hiddenFragments:frags.length-visible.length,active7d:rows.filter((x)=>x.lastSeenAt&&Date.now()-new Date(x.lastSeenAt).getTime()<604800000).length}, users:rows.map((x)=>({id:x.id,username:x.username,createdAt:x.createdAt,lastSeenAt:x.lastSeenAt,updatedAt:x.updatedAt,nickname:x.record?.['00_Core_Profile']?.identity?.nickname||'',city:x.record?.['00_Core_Profile']?.residence?.city||'',fragmentCount:x.record?._app_profile?.fragments?.length||0,hiddenCount:(x.record?._app_profile?.fragments||[]).filter((f)=>f.permissions?.display===false).length})) })
    }
    const m=path.match(/^\/api\/admin\/users\/([^/]+)$/); if(m){const row=rows.find((x)=>String(x.id)===decodeURIComponent(m[1])); return row?json({user:row,matching:matchUser(row.id,rows)}):json({error:'user not found'},404)}
  }
  if (path.startsWith('/api/llm/') || path.startsWith('/api/search')) return json({ error:'AI service is not configured for this beta' },503)
  return json({ error:'not found' },404)
}

export default {
  async fetch(request, env) {
    await ensureSchema(env.DB)
    const url=new URL(request.url)
    if(url.pathname.startsWith('/api/')) return api(request,env,url.pathname)
    const assetResponse = await env.ASSETS.fetch(request)
    if (assetResponse.status !== 404 || request.method !== 'GET') return assetResponse

    // Vite produces a single-page app. Sites' asset binding does not always
    // map `/` or client-side routes such as `/admin` to index.html, so provide
    // the HTML shell explicitly while preserving real missing-asset 404s.
    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html')
    if (!acceptsHtml) return assetResponse
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))
  }
}
