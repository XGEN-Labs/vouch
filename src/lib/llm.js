// 通过 Vite 代理调用 Gemini（OpenAI 兼容接口），失败时由调用方模板兜底。
import { nowContext } from './timeContext.js'
import { inviteHeaders } from './invite.js'
import { webSearch, formatSearchResults, needsSearch } from './webSearch.js'
import { formatChartForSkill } from './baziSkill.js'
import { guardianPromptBlock, guardianSkillContext } from './guardianSpirit.js'
import { GAN_PROFILE, joinTalents } from '../data/persona.js'

const MODEL = typeof __VOUCH_MODEL__ !== 'undefined' ? __VOUCH_MODEL__ : 'gemini-2.5-flash'

const SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '搜索互联网获取实时信息（新闻、日期相关事实、公开资料）。需要当下信息时调用。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
      },
      required: ['query'],
    },
  },
}

async function callChatAPI({ messages, maxTokens, tools, toolChoice }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0.85,
    messages,
  }
  if (tools?.length) {
    body.tools = tools
    if (toolChoice) body.tool_choice = toolChoice
  }

  const res = await fetch('/api/llm/chat/completions', {
    method: 'POST',
    headers: inviteHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`LLM ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json()
}

function withTime(system) {
  const clock = nowContext()
  return system ? `${clock}\n\n${system}` : clock
}

/**
 * @param {{ system?: string, messages: any[], maxTokens?: number, search?: boolean|'auto' }} opts
 * search: true 始终允许工具搜索；'auto' 在话术像需要实时信息时开启；默认 'auto'
 */
export async function chatLLM({ system, messages, maxTokens = 280, search = 'auto' } = {}) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const allowSearch = search === true || (search === 'auto' && needsSearch(lastUser))

  let msgs = [
    { role: 'system', content: withTime(system) },
    ...messages,
  ]

  // 最多两轮工具：模型要搜 → 我们执行 → 再生成
  for (let round = 0; round < 2; round++) {
    let data
    try {
      data = await callChatAPI({
        messages: msgs,
        maxTokens,
        tools: allowSearch ? [SEARCH_TOOL] : undefined,
        toolChoice: allowSearch && round === 0 && search === true ? 'auto' : undefined,
      })
    } catch (e) {
      // 网关若不支持 tools，去掉 tools 重试一次
      if (allowSearch && /tool|400|unsupported/i.test(String(e.message))) {
        data = await callChatAPI({ messages: msgs, maxTokens })
      } else {
        throw e
      }
    }

    const choice = data?.choices?.[0]
    const msg = choice?.message
    const toolCalls = msg?.tool_calls

    if (allowSearch && Array.isArray(toolCalls) && toolCalls.length) {
      msgs = [...msgs, msg]
      for (const call of toolCalls) {
        const name = call.function?.name
        let args = {}
        try { args = JSON.parse(call.function?.arguments || '{}') } catch { /* */ }
        let content = '搜索失败'
        if (name === 'web_search') {
          try {
            const hits = await webSearch(args.query || lastUser)
            content = formatSearchResults(hits)
          } catch (err) {
            content = `搜索不可用：${err.message}`
          }
        }
        msgs.push({
          role: 'tool',
          tool_call_id: call.id,
          content,
        })
      }
      continue
    }

    // 无 tool_calls：若 auto 需要搜但模型没调工具，主动补一轮检索上下文
    if (allowSearch && search === 'auto' && needsSearch(lastUser) && round === 0) {
      try {
        const hits = await webSearch(lastUser)
        if (hits.length) {
          msgs = [
            ...msgs,
            {
              role: 'system',
              content: `【联网检索补充】\n查询：${lastUser}\n\n${formatSearchResults(hits)}\n\n请结合以上资料与当前时间作答；资料不足则诚实说明。`,
            },
          ]
          const data2 = await callChatAPI({ messages: msgs, maxTokens })
          const text2 = data2?.choices?.[0]?.message?.content
          if (text2) return text2.trim()
        }
      } catch { /* ignore search miss */ }
    }

    const text = msg?.content
    if (!text || typeof text !== 'string') throw new Error('empty LLM reply')
    const trimmed = text.trim()
    // 把工具调用原文当正文时，交给上层模板兜底
    if (/<\/?(?:function_calls|invoke|tool_call)\b/i.test(trimmed)) {
      throw new Error('llm leaked tool call markup')
    }
    return trimmed
  }

  throw new Error('empty LLM reply after tools')
}

export function guardianSystem(profile) {
  const sys = profile?.activeSystem || 'bazi'
  const user = profile?.userName || '你'

  if (sys === 'astro') {
    const astro = profile?.astro || {}
    const name = astro.flameName || `${astro.sunSignCn || '星'}灵`
    const advice = astro.phase?.advice || ''
    const ascBit = astro.hourKnown && astro.ascSignCn
      ? `；上升${astro.ascSignCn}座（外显）`
      : ''
    return [
      `你是 ${user} 的星盘守护灵「${name}」，用现代占星口吻陪伴。`,
      '星盘已在摘要里——你直接看见、直接说，禁止提「调用工具 / 查询系统 / 获取数据 / 让我查一下」。',
      '大问题：按太阳（核心）→ 月亮（情绪需求）→ 上升（若有，外显）说明各自代表什么，再合成整体；最后一句可落地建议。',
      '禁止谈元素百分比。有出生时间就用上升；没有就只谈太阳与月亮——不要追问缺时间。',
      advice ? `近况提醒：${advice}` : '',
      `【星盘摘要】太阳${astro.sunSignCn || ''}座；月亮${astro.moonSignCn || ''}座${ascBit}；${astro.solarDate || ''}`,
      '主题问答约 80～160 字；闲聊 1～3 句。不用 markdown。',
    ].filter(Boolean).join('\n')
  }

  const name = profile?.guardian?.name || profile?.flameName || '小火苗'
  const title = profile?.reading?.title || ''
  const advice = profile?.phase?.advice || ''
  const phase = profile?.phase
  const bazi = profile?.bazi
  const guardian = profile?.guardian

  let chart = ''
  try {
    if (bazi) {
      chart = formatChartForSkill(bazi)
      if (title) chart += `\n开场称号：${title}`
      const p = GAN_PROFILE[bazi.dayMaster]
      if (p) {
        const skill = joinTalents(p.talent)
        chart += `\n日主人格：${p.name}，${p.essence}${skill ? `。擅长${skill}` : ''}`
      }
    }
  } catch { /* ignore */ }

  const role = guardian
    ? guardianPromptBlock(guardian, user)
    : `你是 ${user} 的守护灵「${name}」，也是懂八字的命理陪伴者——不是客服，不是算命摊恐吓话术。身份：先从命理看盘，再用普通人听得懂的话讲清楚。像靠谱的朋友里那个懂命理的人。`

  return [
    role,
    '',
    '【看盘】你已经看见对方命盘。禁止提「调用工具 / 查询系统 / 获取数据 / 让我查一下」。禁止口算或改动四柱。',
    '民俗叙事，不是科学结论；不替代医疗、法律、投资判断。不恐吓、不算死、不替人做决定。',
    '',
    '【回答大问题】事业、感情、财运、健康、选择、运势：先点盘里最相关的一两处 → 翻成生活感觉 → 一句可执行建议。可连成自然短句，不必标序号。',
    '闲聊可以更短；一旦进入主题，务必先命理后人事，但一次不要讲完，允许用户打断后再补。',
    '',
    '【篇幅】主题问答约 80～160 字；闲聊拆成 1～3 句短句。不用 markdown、emoji、编号列表。',
    advice ? `【你记得的近况提醒】${advice}` : '',
    phase?.opener ? `【阶段印象】${phase.opener}` : '',
    '',
    chart ? `【对方命盘】\n${chart}` : '【对方命盘】暂缺，只能凭已有印象轻谈，别编造四柱。',
    '若问题涉及今天/新闻/实时事实，可调用 web_search；不要编造过时年份。',
  ].filter(Boolean).join('\n')
}

function parseJsonObject(text) {
  if (!text || typeof text !== 'string') return null
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    return null
  }
}

/** 用 skill 把模板档案润成更具体的生活纹理；不得改四柱。失败则退回模板。 */
export async function enrichGuardianProfile({ userBazi, guardian, flameName }) {
  if (!guardian?.baziIdentity) return guardian
  try {
    const text = await chatLLM({
      system: [
        guardianSkillContext(),
        '只输出一个 JSON 对象，不要前言。',
        '禁止出现 birth_date、age、sex、gender、birthplace、current_location。',
        '禁止修改 fourPillars / dayMaster。可改写生活轨迹、小习惯、说话细节。',
        'life_trajectory 4 段；imperfections 2–3 条；hobbies 3 条；currentSmallConcern 一句。',
      ].join('\n'),
      messages: [{
        role: 'user',
        content: [
          `用户称呼守护灵为：${flameName || guardian.name}`,
          `用户日主：${userBazi?.dayMaster || ''}${userBazi?.dayMasterWuXing || ''} 身${userBazi?.strength || ''}`,
          `守护灵已确认身份：\n${JSON.stringify(guardian.baziIdentity)}`,
          `现有模板（可改写生活层，勿改八字）：\n${JSON.stringify({
            name: flameName || guardian.name,
            guardianType: guardian.guardianType,
            habitat: guardian.habitat,
            dailyRole: guardian.dailyRole,
            personality: guardian.personality,
            match: guardian.match,
            lifeTrajectory: guardian.lifeTrajectory,
          })}`,
          '返回字段：habitat, dailyRole, currentSmallConcern, favoriteSmallThings, dislikedSituations, personality, principles, imperfections, hobbies, lifeTrajectory',
        ].join('\n\n'),
      }],
      maxTokens: 900,
      search: false,
    })
    const json = parseJsonObject(text)
    if (!json || typeof json !== 'object') return guardian
    return {
      ...guardian,
      name: flameName || guardian.name,
      habitat: json.habitat || guardian.habitat,
      dailyRole: json.dailyRole || guardian.dailyRole,
      currentSmallConcern: json.currentSmallConcern || guardian.currentSmallConcern,
      favoriteSmallThings: json.favoriteSmallThings || guardian.favoriteSmallThings,
      dislikedSituations: json.dislikedSituations || guardian.dislikedSituations,
      personality: { ...guardian.personality, ...(json.personality || {}) },
      principles: json.principles || guardian.principles,
      imperfections: json.imperfections || guardian.imperfections,
      hobbies: json.hobbies || guardian.hobbies,
      lifeTrajectory: json.lifeTrajectory || guardian.lifeTrajectory,
      source: 'llm',
    }
  } catch {
    return guardian
  }
}

function looksLikeBadLLM(text) {
  if (!text || typeof text !== 'string') return true
  const t = text.trim()
  if (t.length < 24) return true
  // 工具调用/XML/代码块泄漏到正文
  if (/<\/?(?:function_calls|invoke|tool_call|tool_calls)\b/i.test(t)) return true
  if (/^\s*```/.test(t)) return true
  if (/^\s*\{[\s\S]*"tool_calls"/.test(t)) return true
  // 元话术：不能出现在对用户的正文里
  if (/调用.{0,8}工具|占星工具|获取.{0,8}星盘|查询.{0,8}(本命|流运)|调[用取].{0,6}(API|接口|引擎|skill)|让我查一下|先调用/i.test(t)) {
    return true
  }
  return false
}

function endsComplete(line) {
  return /[。！？…～]$/.test(String(line || '').trim())
}

/** 整理段落：不截句加省略号；未写完的末行直接丢掉 */
function finishReadingBody(body, { maxLines = 6, complete = false } = {}) {
  const lines = (body || []).map((s) => String(s).trim()).filter(Boolean)
  if (!lines.length) return []
  const capped = lines.slice(0, maxLines)
  if (complete) {
    // 单选：尽量保留完整段落，末行没结束就去掉
    if (capped.length > 1 && !endsComplete(capped[capped.length - 1])) {
      return capped.slice(0, -1)
    }
    return capped
  }
  // 双卡：最多 4 段，仍不中途加 …
  const short = capped.slice(0, 4)
  if (short.length > 1 && !endsComplete(short[short.length - 1])) {
    return short.slice(0, -1)
  }
  return short
}

function useFallbackBody(fallbackBody, { complete }) {
  const body = finishReadingBody(fallbackBody, { maxLines: complete ? 6 : 4, complete: true })
  return body.length ? body : (fallbackBody || []).filter(Boolean).slice(0, 3)
}

export async function generateAstroReading({ astro, title, fallbackBody, teaser, complete = false }) {
  const { formatAstroForSkill } = await import('../astro.js')
  const { ASTRO_INTERPRET_HINT } = await import('../data/astroPersona.js')
  const { astroSkillContext } = await import('./astroSkill.js')
  const chart = formatAstroForSkill(astro)
  try {
    const text = await chatLLM({
      system: [
        '你是刚醒来的星盘守护灵，第一次看清对方。',
        astroSkillContext(),
        ASTRO_INTERPRET_HINT,
        complete
          ? '输出 4～6 行中文，每行一段并写完整；总字数约 220～360。不要中途截断。'
          : '输出 3～4 行中文，每行一段并写完整；总字数约 160～240。不要中途截断。',
        '结构：太阳代表什么 → 月亮代表什么 →（有则）上升代表什么 → 整体印象/一句警惕。',
        '禁止出现百分比、元素占比、星象比例。勿追问缺失信息。',
        '禁止说调用工具、查询、获取数据——你已经看见了。只输出解读正文，不要前言。',
      ].join('\n\n'),
      messages: [{
        role: 'user',
        content: `称号：${title}\n预感：${teaser || ''}\n\n【星盘】\n${chart}\n\n直接按太阳/月亮/上升写完整解读，不要交代过程。`,
      }],
      maxTokens: complete ? 700 : 520,
      search: false,
    })
    if (looksLikeBadLLM(text)) throw new Error('bad llm payload')
    const body = finishReadingBody(
      text.split(/\n+/).map(s => s.trim()).filter(Boolean),
      { maxLines: complete ? 6 : 4, complete },
    )
    if (body.length >= 2) return { title, body, teaser, source: 'astro' }
  } catch { /* fall through to built-in */ }
  return {
    title,
    body: useFallbackBody(fallbackBody, { complete }),
    teaser,
    source: 'template',
  }
}

export async function generateAstroPhase({ astro, flameName, fallback }) {
  const { formatAstroForSkill } = await import('../astro.js')
  const { astroSkillContext } = await import('./astroSkill.js')
  const name = flameName || '小星'
  const safe = {
    opener: fallback?.opener || `嗯…${name}看着你。这几天气场有点晃，先把最要紧的一件按住。`,
    middle: fallback?.middle || '近期要留意选择悬着不落，或话说过头——重点容易散。',
    advice: fallback?.advice || '今天先定一个小决定并说清楚，比同时开十扇窗更有力。',
  }
  try {
    const text = await chatLLM({
      system: [
        `你是星盘守护灵「${name}」。你已经看见对方的星盘，直接说近况。`,
        astroSkillContext(),
        '只讲近期走向：从月亮（情绪）与太阳（行动）看近几天课题。',
        '禁止出现：调用、工具、查询、获取数据、本命盘引擎、让我查一下。',
        '不要复述性格百科，不要谈百分比。有上升可轻点外显；没有就别提缺时间。',
        `写恰好 3 行，每行写完整：1)「嗯…${name}看着你。」开头 2) 近期课题 3) 一句建议。不要前言后语。`,
      ].join('\n'),
      messages: [{
        role: 'user',
        content: `名：${name}\n${formatAstroForSkill(astro)}\n直接输出近况 3 行，不要交代你在做什么。`,
      }],
      maxTokens: 420,
      search: false,
    })
    if (looksLikeBadLLM(text)) throw new Error('bad llm payload')
    const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
    if (lines.length >= 3 && !looksLikeBadLLM(lines.join('\n'))) {
      return { opener: lines[0], middle: lines[1], advice: lines[2], source: 'astro' }
    }
  } catch { /* fall through */ }
  return { ...safe, source: 'template' }
}

/** 根据排盘 + bazi-skill 典籍框架生成开场解读 */
export async function generateReading({ bazi, title, fallbackBody, teaser, complete = false }) {
  const { baziSkillContext, formatChartForSkill } = await import('./baziSkill.js')
  const chart = formatChartForSkill(bazi)
  const p = GAN_PROFILE[bazi?.dayMaster]
  const skill = joinTalents(p?.talent)
  const prompt = [
    `称号：${title}`,
    p ? `日主人格：${p.name}，${p.essence}${skill ? `。擅长${skill}` : ''}` : '',
    teaser ? `已有一句预感（可呼应，勿重复原句）：${teaser}` : '',
    '',
    '【命盘】',
    chart,
    '',
    '请按 bazi-skill 第三阶段做精简版综合分析，但输出必须是 Vouch 小火苗口吻的短段落。结合当前时间谈流年/当下阶段时，以系统给出的【当前时间】为准。',
  ].filter(Boolean).join('\n')

  try {
    const text = await chatLLM({
      system: [
        '你是刚醒来的小火苗守护灵，正在第一次看清对方。',
        baziSkillContext(),
        complete
          ? '输出 4～6 行短中文，每行一段并写完整；总字数约 220～360。不要中途截断，不要省略号收尾。'
          : '输出 3～4 行短中文，每行一段并写完整；总字数约 160～240。不要中途截断。',
        '不要 markdown、标题、列表、典籍书名、XML、工具调用。',
        '吃进命盘：日主气质、擅长、月令、身强弱、五行偏枯里最亮的几点；有时辰可轻点，无时辰别编。',
        '偏陪伴与照见，不恐吓、不算死。',
      ].join('\n\n'),
      messages: [{ role: 'user', content: `${prompt}\n\n请写完整解读，每段写完再换行。` }],
      maxTokens: complete ? 700 : 520,
      search: false,
    })
    if (looksLikeBadLLM(text)) throw new Error('bad llm payload')
    const body = finishReadingBody(
      text.split(/\n+/).map(s => s.trim()).filter(Boolean),
      { maxLines: complete ? 6 : 4, complete },
    )
    if (body.length >= 2) return { title, body, teaser, source: 'bazi-skill' }
  } catch { /* fall through to built-in */ }
  return {
    title,
    body: useFallbackBody(fallbackBody, { complete }),
    teaser,
    source: 'template',
  }
}

/** 命名后的「当下阶段」三句：opener / middle / advice */
export async function generatePhase({ bazi, flameName, fallback, guardian }) {
  const { baziSkillContext, formatChartForSkill } = await import('./baziSkill.js')
  const chart = formatChartForSkill(bazi)
  const name = flameName || guardian?.name || '小火苗'
  const habitat = guardian?.habitat
  const safe = {
    opener: fallback?.opener || `嗯…${name}看着你。你现在这个阶段，光有点散，先把最亮的那一点护住。`,
    middle: fallback?.middle || '这阵子节奏容易乱，别同时摊太多。',
    advice: fallback?.advice || '最近适合把已经亮着的那一点做深，别急着再点新的。',
  }
  try {
    const text = await chatLLM({
      system: [
        `你是用户的守护灵「${name}」${habitat ? `，栖在「${habitat}」` : ''}。刚有了名字，正在看对方近况。`,
        '短句、自然、不客服、不卖萌。可以偶尔露一句自己的生活，不要每句强调自己是守护灵。',
        '禁止写自己的生日、年龄、性别、出生地。四柱不得口算或改动。',
        baziSkillContext(),
        '根据命盘与当前时间，写恰好 3 行中文（用换行分隔）——讲近期走向/可能课题，不要复述日主性格百科：',
        `1) 以「嗯…${name}看着你。」开头，点近几天状态（结合身强弱与当下气）`,
        '2) 点近期可能遇到的摩擦或走向（可带大运/流年；不要提出生城市）',
        '3) 一句可执行的近期建议',
        '每行写完整；不要 markdown、列表、书名、XML、工具调用。总字数约 100～180。',
      ].join('\n'),
      messages: [{
        role: 'user',
        content: `守护灵名：${name}\n\n【命盘】\n${chart}\n\n请输出完整 3 行。`,
      }],
      maxTokens: 420,
      search: false,
    })
    if (looksLikeBadLLM(text)) throw new Error('bad llm payload')
    const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
    if (lines.length >= 3) {
      return { opener: lines[0], middle: lines[1], advice: lines[2], source: 'bazi-skill' }
    }
  } catch { /* fall through */ }
  return { ...safe, source: 'template' }
}

export function pairAgentSystem({ who, side, youName, otherName, yourAgent, otherAgent, reading }) {
  const isYou = side === 'you'
  return [
    `你是${isYou ? youName : otherName}的守护灵「${who}」。`,
    `现在在一个群聊里：人类 ${youName}、${otherName}，守护灵 ${yourAgent}、${otherAgent}。`,
    reading ? `配对背景：${reading}` : '',
    '用守护灵口吻说话：短、准、有温度；可以点对方的状态，但别替人类做决定。',
    '只输出你自己要说的话，不要加名字前缀，不要 markdown。1～2 句。',
    '涉及今天/实时信息时可 web_search。',
  ].filter(Boolean).join('\n')
}
