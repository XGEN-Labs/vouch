// 联网检索。原实现在 vite.config.js 的 dev 中间件里，这里搬到生产后端并加 provider 开关。
//
// 注意：阿里云国内节点访问 duckduckgo.com 不通，默认 provider=off，
// 前端 webSearch 失败有兜底不会崩。需要联网能力时改用 bocha（博查，境内可直连）。
import { config } from './config.js'

async function fetchJson(url, opts = {}, timeoutMs = config.search.timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function duckduckgo(q) {
  const res = await fetchJson(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
    { headers: { 'User-Agent': 'VouchApp/0.1' } }
  )
  const data = await res.json()
  const results = []

  if (data.AbstractText) {
    results.push({ title: data.Heading || q, snippet: data.AbstractText, url: data.AbstractURL || '' })
  }
  for (const t of data.RelatedTopics || []) {
    if (t.Text) {
      results.push({ title: (t.Text || '').split(' - ')[0] || '相关', snippet: t.Text, url: t.FirstURL || '' })
    } else if (Array.isArray(t.Topics)) {
      for (const x of t.Topics.slice(0, 3)) {
        if (x.Text) {
          results.push({ title: (x.Text || '').split(' - ')[0] || '相关', snippet: x.Text, url: x.FirstURL || '' })
        }
      }
    }
    if (results.length >= 6) break
  }

  if (results.length < 2) {
    try {
      const htmlRes = await fetchJson(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VouchBot/0.1)' },
      })
      const html = await htmlRes.text()
      const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
      const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      let m
      while ((m = re.exec(html)) && results.length < 5) {
        results.push({ title: strip(m[2]), snippet: strip(m[3]), url: m[1] })
      }
    } catch { /* ignore html fallback */ }
  }
  return results
}

async function bocha(q) {
  if (!config.search.bochaKey) throw new Error('missing VOUCH_BOCHA_KEY')
  const res = await fetchJson('https://api.bochaai.com/v1/web-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.search.bochaKey}`,
    },
    body: JSON.stringify({ query: q, count: 6, summary: true }),
  })
  if (!res.ok) throw new Error(`bocha ${res.status}`)
  const data = await res.json()
  const pages = data?.data?.webPages?.value || []
  return pages.map((p) => ({
    title: p.name || '',
    snippet: p.summary || p.snippet || '',
    url: p.url || '',
  }))
}

export async function handleSearch(req, res) {
  const q = String(req.query.q || '').trim()
  if (!q) return res.status(400).json({ results: [], error: 'missing q' })

  const provider = config.search.provider
  if (provider === 'off') return res.json({ query: q, results: [], disabled: true })

  try {
    const results = provider === 'bocha' ? await bocha(q) : await duckduckgo(q)
    res.json({ query: q, results })
  } catch (e) {
    console.error(`[search:${provider}] ${e.message}`)
    // 检索失败不该让对话挂掉，返回空结果让前端走兜底
    res.json({ query: q, results: [], error: 'search unavailable' })
  }
}
