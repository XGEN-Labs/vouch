/** Shared invite + Gemini/search gateway for Vite and Cloud Functions. */

export function allowedInvites() {
  const raw = process.env.VOUCH_INVITE_CODE || process.env.VOUCH_INVITE_CODES || ''
  return new Set(String(raw).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))
}

export function validInvite(code) {
  const c = String(code || '').trim()
  return c.length > 0 && allowedInvites().has(c)
}

export async function duckSearch(q) {
  const query = String(q || '').trim()
  if (!query) return { query: '', results: [], error: 'missing q' }

  const ddg = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    { headers: { 'User-Agent': 'VouchApp/0.1' } },
  )
  const data = await ddg.json()
  const results = []

  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      snippet: data.AbstractText,
      url: data.AbstractURL || '',
    })
  }
  for (const t of data.RelatedTopics || []) {
    if (t.Text) {
      results.push({
        title: (t.Text || '').split(' - ')[0] || '相关',
        snippet: t.Text,
        url: t.FirstURL || '',
      })
    } else if (Array.isArray(t.Topics)) {
      for (const x of t.Topics.slice(0, 3)) {
        if (x.Text) {
          results.push({
            title: (x.Text || '').split(' - ')[0] || '相关',
            snippet: x.Text,
            url: x.FirstURL || '',
          })
        }
      }
    }
    if (results.length >= 6) break
  }

  if (results.length < 2) {
    try {
      const htmlRes = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VouchBot/0.1)' } },
      )
      const html = await htmlRes.text()
      const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
      let m
      while ((m = re.exec(html)) && results.length < 5) {
        const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        results.push({ title: strip(m[2]), snippet: strip(m[3]), url: m[1] })
      }
    } catch { /* ignore html fallback */ }
  }

  return { query, results }
}

export async function proxyChatCompletions(body) {
  const base = String(process.env.VOUCH_API_BASE || '').replace(/\/$/, '')
  const key = process.env.VOUCH_API_KEY || ''
  if (!base || !key) {
    return { status: 503, text: JSON.stringify({ error: 'llm not configured' }) }
  }
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: payload,
    signal: AbortSignal.timeout(25000),
  })
  return { status: res.status, text: await res.text() }
}

function inviteFromReq(req) {
  const h = req.headers || {}
  return String(h['x-vouch-invite'] || h['X-Vouch-Invite'] || '').trim()
}

function routePath(req) {
  const raw = String(req.path || req.url || '')
  return raw.split('?')[0]
}

export async function handleGateway(req, res, { body, json } = {}) {
  const path = routePath(req)
  const method = req.method || 'GET'

  if (method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Vouch-Invite')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.end('')
    return
  }

  const send = (status, obj) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(typeof obj === 'string' ? obj : JSON.stringify(obj))
  }

  if (path.endsWith('/invite') || path === '/api/invite') {
    if (method !== 'POST') return send(405, { error: 'method' })
    const code = String(json?.code || '').trim()
    if (!validInvite(code)) return send(401, { error: 'invalid invite' })
    return send(200, { ok: true })
  }

  if (!validInvite(inviteFromReq(req))) {
    return send(401, { error: 'invite required' })
  }

  if (path.includes('/search')) {
    const url = new URL(req.url || path, 'http://localhost')
    const q = url.searchParams.get('q') || json?.q || ''
    try {
      const data = await duckSearch(q)
      return send(data.error && !data.results?.length ? 400 : 200, data)
    } catch (e) {
      return send(502, { results: [], error: String(e?.message || e) })
    }
  }

  if (path.includes('/llm') || path.includes('/chat/completions')) {
    try {
      const out = await proxyChatCompletions(json ?? body)
      res.statusCode = out.status
      res.setHeader('Content-Type', 'application/json')
      res.end(out.text)
    } catch (e) {
      send(502, { error: String(e?.message || e) })
    }
    return
  }

  send(404, { error: 'not found' })
}
