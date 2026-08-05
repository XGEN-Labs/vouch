import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'

import { config } from './config.js'
import { getProfile, saveProfile, deleteProfile, countUsers } from './db.js'
import {
  register, login, signToken, setAuthCookie, clearAuthCookie,
  requireAuth, publicUser,
} from './auth.js'
import { rateLimit, byUser, byIp } from './rateLimit.js'
import { forwardChat } from './llm.js'
import { handleSearch } from './search.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')

const app = express()
// 在 Nginx 后面，取 X-Forwarded-For 的真实 IP 才能正确限流
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const api = express.Router()

api.get('/health', (req, res) => res.json({ ok: true, users: countUsers() }))

/* ---------- auth ---------- */

const authLimit = rateLimit(byIp, [{ tag: 'auth', limit: config.rate.authPerMin, windowMs: 60_000 }])

api.post('/auth/register', authLimit, async (req, res, next) => {
  try {
    const { username, password, inviteCode } = req.body || {}
    const out = await register({ username: String(username || '').trim(), password, inviteCode })
    if (out.error) return res.status(out.status).json({ error: out.error })
    setAuthCookie(res, signToken(out.user))
    res.json({ user: publicUser(out.user) })
  } catch (e) { next(e) }
})

api.post('/auth/login', authLimit, async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    const out = await login({ username: String(username || '').trim(), password })
    if (out.error) return res.status(out.status).json({ error: out.error })
    setAuthCookie(res, signToken(out.user))
    res.json({ user: publicUser(out.user) })
  } catch (e) { next(e) }
})

api.post('/auth/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

api.get('/auth/me', (req, res) => {
  // 未登录不是错误，前端据此决定进登录页还是主页
  requireAuth(req, res, () => res.json({ user: publicUser(req.user) }))
})

/* ---------- profile（替代原来的 localStorage） ---------- */

api.get('/profile', requireAuth, (req, res) => {
  const row = getProfile(req.user.id)
  res.json({ profile: row?.data ?? null, updatedAt: row?.updatedAt ?? null })
})

api.put('/profile', requireAuth, (req, res) => {
  const profile = req.body?.profile
  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ error: 'profile required' })
  }
  const row = saveProfile(req.user.id, profile)
  res.json({ ok: true, updatedAt: row.updatedAt })
})

api.delete('/profile', requireAuth, (req, res) => {
  deleteProfile(req.user.id)
  res.json({ ok: true })
})

/* ---------- LLM / 搜索：必须登录才能用，否则 Key 会被白嫖 ---------- */

const llmLimit = rateLimit(byUser, [
  { tag: 'llm-min', limit: config.rate.llmPerMin, windowMs: 60_000 },
  { tag: 'llm-day', limit: config.rate.llmPerDay, windowMs: 24 * 60 * 60 * 1000 },
])

// 检索走的是外部付费/限额接口，跟着 LLM 一起限
const searchLimit = rateLimit(byUser, [
  { tag: 'search-min', limit: config.rate.llmPerMin, windowMs: 60_000 },
])

api.post('/llm/chat/completions', requireAuth, llmLimit, forwardChat)
api.get('/search', requireAuth, searchLimit, handleSearch)

app.use('/api', api)

/* ---------- 静态站点（生产由 Nginx 直接托管，这里保留便于单机自检） ---------- */

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '7d' }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((req, res) => res.status(404).json({ error: 'not found' }))

app.use((err, req, res, _next) => {
  console.error('[error]', err)
  res.status(500).json({ error: 'internal error' })
})

app.listen(config.port, config.host, () => {
  console.log(`vouch-api listening on http://${config.host}:${config.port}`)
  console.log(`  db=${path.resolve(config.dbPath)} llm=${config.llm.base} model=${config.llm.model}`)
  console.log(`  search=${config.search.provider} openRegister=${config.openRegister}`)
  if (!config.llm.key) console.warn('  [warn] VOUCH_API_KEY 为空，中转若校验 Key 会 401')
})
