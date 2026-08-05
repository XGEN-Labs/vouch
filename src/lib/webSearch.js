/** 轻量网页搜索（经自家后端），给 LLM 作实时补充 */
import { searchWeb } from './api.js'

export async function webSearch(query, { limit = 5 } = {}) {
  const q = String(query || '').trim()
  if (!q) return []

  const data = await searchWeb(q)
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
