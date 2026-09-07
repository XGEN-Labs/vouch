/** 与后端 /api 通信的统一入口。同域部署，cookie 自动带上。 */

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/** 未登录时抛出，App 据此把用户送回登录页 */
export const isUnauthorized = (e) => e instanceof ApiError && e.status === 401

// 任何一个请求撞上 401（cookie 过期等），都通知 App 把人送回登录页，
// 免得用户对着一个只会说兜底话术的火苗发呆。
let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

async function request(path, { method = 'GET', body, signal, headers } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }

  if (!res.ok) {
    // /auth/me 的 401 是「还没登录」的正常应答，不触发掉线处理
    if (res.status === 401 && path !== '/auth/me') onUnauthorized?.()
    throw new ApiError(data?.error || `请求失败 (${res.status})`, res.status)
  }
  return data
}

export const api = {
  get: (p, opts) => request(p, opts),
  post: (p, body, opts) => request(p, { ...opts, method: 'POST', body: body ?? {} }),
  put: (p, body, opts) => request(p, { ...opts, method: 'PUT', body: body ?? {} }),
  del: (p, opts) => request(p, { ...opts, method: 'DELETE' }),
}

/* ---------- auth ---------- */

export const me = () => api.get('/auth/me').then(r => r.user)
export const login = (username, password) => api.post('/auth/login', { username, password }).then(r => r.user)
export const register = (username, password, inviteCode) =>
  api.post('/auth/register', { username, password, inviteCode }).then(r => r.user)
export const logout = () => api.post('/auth/logout')

/* ---------- profile ---------- */

export const fetchProfile = () => api.get('/profile').then(r => r.profile)
export const pushProfile = (profile) => api.put('/profile', { profile })
export const dropProfile = () => api.del('/profile')
export const fetchVisibleFragments = () => api.get('/memory/fragments').then(r => r.fragments)
export const fetchMatches = () => api.get('/matches').then(r => r.result)

export const adminOverview = (key) => request('/admin/overview', { headers: { 'x-admin-key': key } })
export const adminUser = (key, id) => request(`/admin/users/${encodeURIComponent(id)}`, { headers: { 'x-admin-key': key } })

/** LLM 与搜索走同一套凭证，透传原始 Response 语义给调用方 */
export const chatCompletions = (body) => api.post('/llm/chat/completions', body)
export const searchWeb = (q) => api.get(`/search?q=${encodeURIComponent(q)}`)
