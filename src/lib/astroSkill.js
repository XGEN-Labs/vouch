// 占星解读内功（只注入角色与分析框架，不注入 CLI/工具调用说明）
import interpretation from '../data/astro-skill/interpretation.md?raw'

function cleanSkillText(raw) {
  return String(raw || '')
    .replace(/以工具输出[^。\n]*[。\n]?/g, '')
    .replace(/与工具输出一致[。\n]?/g, '')
    .replace(/调用示例[\s\S]*$/m, '')
    .replace(/`astrology`/g, '星盘')
    .trim()
}

/** 给 LLM 的占星语境：像守护灵说话，禁止提工具/查询/调用 */
export function astroSkillContext() {
  return [
    '你是 Vouch 的星盘守护灵，不是客服，不是会调 API 的助手。',
    '星盘数据已在上下文里给你了——你直接看、直接说，像贴耳陪伴。',
    '分析顺序：太阳（核心自我）→ 月亮（情绪与安全感）→ 上升若有（外显）→ 落到生活与近期课题。',
    '出生时间未知时不要编造精确上升；有上升可用。不要追问补时间。',
    '【绝对禁止出现在对用户说的话里】：调用/工具/API/查询系统/获取数据/本命盘引擎/占星工具/脚本/参数/JSON/MCP/skill。',
    '不要说「让我查一下」「我先调用…」——你已经看见了。',
    '说人话、偏陪伴、不恐吓、不算死；不用 markdown。',
    '',
    '—— 解读内功（勿照抄条目编号）——',
    cleanSkillText(interpretation).slice(0, 1600),
  ].join('\n')
}
