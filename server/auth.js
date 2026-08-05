// 邀请码注册 / 账号密码登录 / JWT（httpOnly cookie）
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import {
  findUserByName, findUserById, createUser, touchUser,
  consumeInvite, releaseInvite,
} from './db.js'

const USERNAME_RE = /^[a-zA-Z0-9_一-龥]{2,20}$/

export function validateCredentials(username, password) {
  if (!USERNAME_RE.test(username || '')) {
    return '用户名 2–20 位，只能用中英文、数字、下划线'
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
    return '密码至少 6 位'
  }
  return null
}

export function signToken(user) {
  return jwt.sign({ uid: user.id, name: user.username }, config.jwtSecret, {
    expiresIn: `${config.tokenDays}d`,
  })
}

export function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookie,
    maxAge: config.tokenDays * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, { path: '/' })
}

/** 认证中间件：无有效 token 直接 401 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[config.cookieName]
  if (!token) return res.status(401).json({ error: 'unauthenticated' })
  let payload
  try {
    payload = jwt.verify(token, config.jwtSecret)
  } catch {
    clearAuthCookie(res)
    return res.status(401).json({ error: 'invalid token' })
  }
  const user = findUserById(payload.uid)
  if (!user) {
    clearAuthCookie(res)
    return res.status(401).json({ error: 'user gone' })
  }
  req.user = user
  next()
}

export async function register({ username, password, inviteCode }) {
  const bad = validateCredentials(username, password)
  if (bad) return { error: bad, status: 400 }

  const code = (inviteCode || '').trim()
  if (!config.openRegister) {
    if (!code) return { error: '需要邀请码', status: 400 }
    if (!consumeInvite(code)) return { error: '邀请码无效或已用完', status: 403 }
  }

  try {
    if (findUserByName(username)) {
      if (!config.openRegister && code) releaseInvite(code)
      return { error: '这个名字已经有人用了', status: 409 }
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = createUser({ username, passwordHash, inviteCode: code || null })
    return { user }
  } catch (e) {
    // 建号失败要把名额还回去，否则邀请码白白消耗
    if (!config.openRegister && code) releaseInvite(code)
    if (/UNIQUE/i.test(String(e.message))) return { error: '这个名字已经有人用了', status: 409 }
    throw e
  }
}

export async function login({ username, password }) {
  const user = findUserByName(username || '')
  // 用户不存在时也跑一次 hash 比对，避免用响应时间区分「用户名存在与否」
  const hash = user?.password_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv'
  const ok = await bcrypt.compare(String(password || ''), hash)
  if (!user || !ok) return { error: '用户名或密码不对', status: 401 }
  touchUser(user.id)
  return { user }
}

export const publicUser = (user) => ({ id: user.id, username: user.username })
