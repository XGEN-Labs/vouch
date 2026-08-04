/** 轻量网页搜索（经 Vite 代理），给 LLM 作实时补充 */

export async function webSearch(query, { limit = 5 } = {}) {
  const q = String(query || '').trim()
  if (!q) return []

  const url = `/api/search?q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`search ${res.status}`)
  const data = await res.json()
  const items = Array.isArray(data?.results) ? data.results : []
  return items.slice(0, limit).map((r) => ({
    title: r.title || '',
    snippet: r.snippet || r.body || '',
    url: r.url || r.href || '',
  }))
}

export function formatSearchResults(results) {
  if (!results?.length) return '（未检索到有效结果）'
  return results.map((r, i) =>
    `${i + 1}. ${r.title}\n${r.snippet}${r.url ? `\n${r.url}` : ''}`
  ).join('\n\n')
}

/** 粗判是否可能需要联网 */
export function needsSearch(text) {
  return /今天|今日|昨天|明天|最近|本周|这个月|今年|新闻|天气|股价|热点|实时|现在几点|几号|世界杯|选举|疫情|金价|汇率/.test(text || '')
}
