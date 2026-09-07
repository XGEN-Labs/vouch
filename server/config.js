// 服务端配置。.env 按下面的顺序找第一个存在的，找不到就只用进程环境变量：
//   1. VOUCH_ENV_FILE 指定的路径  —— 线上走这条，systemd 里指到 /opt/vouch/.env，
//                                    放在 releases 外面，发新版不会被覆盖
//   2. 项目根的 .env              —— 本地开发
//   3. 项目根上一级、上两级的 .env —— 手工起服务时的兜底
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const candidates = [
  process.env.VOUCH_ENV_FILE,
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '..', '.env'),
  path.join(projectRoot, '..', '..', '.env'),
].filter(Boolean)

const envFile = candidates.find((p) => fs.existsSync(p))
if (envFile) {
  dotenv.config({ path: envFile })
  // 走 stderr：cli.js 的 stdout 是邀请码本身，会被重定向进文件
  console.error(`[config] 读取 ${envFile}`)
} else {
  console.error(`[config] 没找到 .env，只用进程环境变量。找过：${candidates.join(', ')}`)
}

function required(name) {
  const v = process.env[name]
  if (!v) throw new Error(`缺少必需的环境变量 ${name}（线上放在 /opt/vouch/.env）`)
  return v
}

const num = (v, d) => (v === undefined || v === '' ? d : Number(v))

export const config = {
  port: num(process.env.PORT, 8787),
  // 只监听回环，公网流量一律经 Nginx 进来
  host: process.env.HOST || '127.0.0.1',
  dbPath: process.env.VOUCH_DB_PATH || 'data/vouch.db',

  jwtSecret: required('VOUCH_JWT_SECRET'),
  cookieName: 'vouch_token',
  tokenDays: num(process.env.VOUCH_TOKEN_DAYS, 30),
  // 本地 http 调试时设 VOUCH_SECURE_COOKIE=0，否则 cookie 发不出去
  secureCookie: process.env.VOUCH_SECURE_COOKIE !== '0',
  adminKey: process.env.VOUCH_ADMIN_KEY || '',

  // 开放注册（不要邀请码）。内测默认关闭。
  openRegister: process.env.VOUCH_OPEN_REGISTER === '1',

  llm: {
    base: (process.env.VOUCH_API_BASE || 'https://yibuapi.com').replace(/\/+$/, ''),
    key: process.env.VOUCH_API_KEY || '',
    model: process.env.VOUCH_MODEL || 'claude-sonnet-5',
    maxTokensCap: num(process.env.VOUCH_MAX_TOKENS_CAP, 1200),
    timeoutMs: num(process.env.VOUCH_LLM_TIMEOUT_MS, 90_000),
  },

  // 阿里云国内节点直连 DuckDuckGo 不通，默认关掉；前端有模板兜底不会崩。
  search: {
    provider: process.env.VOUCH_SEARCH_PROVIDER || 'off', // off | duckduckgo | bocha
    bochaKey: process.env.VOUCH_BOCHA_KEY || '',
    timeoutMs: num(process.env.VOUCH_SEARCH_TIMEOUT_MS, 8000),
  },

  rate: {
    llmPerMin: num(process.env.VOUCH_LLM_PER_MIN, 12),
    llmPerDay: num(process.env.VOUCH_LLM_PER_DAY, 300),
    authPerMin: num(process.env.VOUCH_AUTH_PER_MIN, 10),
  },
}
