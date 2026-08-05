// 内存限流。单机部署够用；将来多实例要换 Redis，替换 hit() 实现即可。

const buckets = new Map() // key -> { count, resetAt }

function hit(key, limit, windowMs) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true, remaining: limit - b.count, retryAfter: 0 }
}

// 定期清理过期桶，避免长期运行内存缓慢增长
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k)
}, 5 * 60 * 1000).unref()

/**
 * @param {(req) => string} keyFn  取限流主体（用户 id 或 IP）
 * @param {Array<{limit:number, windowMs:number, tag:string}>} rules
 */
export function rateLimit(keyFn, rules) {
  return (req, res, next) => {
    const base = keyFn(req)
    for (const r of rules) {
      const { ok, retryAfter } = hit(`${r.tag}:${base}`, r.limit, r.windowMs)
      if (!ok) {
        res.setHeader('Retry-After', String(retryAfter))
        return res.status(429).json({ error: '有点急，歇一下再说', retryAfter })
      }
    }
    next()
  }
}

export const byUser = (req) => String(req.user?.id ?? req.ip)
export const byIp = (req) => String(req.ip)
