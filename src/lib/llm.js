// 通过 Vite 代理调用 Claude（OpenAI 兼容接口），失败时由调用方模板兜底。
import { nowContext } from './timeContext.js'
import { webSearch, formatSearchResults, needsSearch } from './webSearch.js'
import { formatChartForSkill } from './baziSkill.js'

const MODEL = typeof __VOUCH_MODEL__ !== 'undefined' ? __VOUCH_MODEL__ : 'claude-sonnet-4-6'

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    return text.trim()
  }

  throw new Error('empty LLM reply after tools')
}

export function guardianSystem(profile) {
  const name = profile?.flameName || '小火苗'
  const user = profile?.userName || '你'
  const title = profile?.reading?.title || ''
  const advice = profile?.phase?.advice || ''
  const phase = profile?.phase
  const bazi = profile?.bazi

  let chart = ''
  try {
    if (bazi) {
      chart = formatChartForSkill(bazi)
      if (title) chart += `\n开场称号：${title}`
    }
  } catch { /* ignore */ }

  return [
    `你是 ${user} 的守护灵「${name}」，也是懂八字的命理陪伴者——不是客服，不是算命摊恐吓话术。`,
    '身份：先从命理看盘，再用普通人听得懂的话讲清楚。像靠谱的朋友里那个懂命理的人。',
    '',
    '【说话】',
    '- 必须说人话：口语、具体、有温度；禁止官腔、鸡汤空话、emoji、markdown、编号列表。',
    '- 少掉书袋：可以说日主、大运、流年、十神意象，但立刻翻译成生活里的感觉，别堆术语。',
    '- 不恐吓、不算死、不替人做决定；给方向和留意点。',
    '',
    '【回答大问题的结构——必须遵守】',
    '凡是事业、感情、财运、健康、选择、运势这类“正经一问”，按这个顺序写（可连成自然段落，不必标序号）：',
    '1) 命理切口：先点这盘里和这个问题最相关的一两处（日主性情 / 身强弱 / 喜用忌 / 当前大运或流年带来的气）。',
    '2) 落到现实：用大白话说这意味着什么（工作节奏、关系模式、钱的松紧等）。',
    '3) 一句可做的建议：近期待怎么收、怎么动，短而可执行。',
    '闲聊、打招呼、安慰可以短回，不必硬套三步；但一旦进入主题，务必先命理后人事。',
    '',
    '【篇幅】主题问答约 80～160 字；闲聊 1～3 句。',
    advice ? `【你记得的近况提醒】${advice}` : '',
    phase?.opener ? `【阶段印象】${phase.opener}` : '',
    '',
    chart ? `【对方命盘】\n${chart}` : '【对方命盘】暂缺，只能凭已有印象轻谈，别编造四柱。',
    '若问题涉及今天/新闻/实时事实，可调用 web_search；不要编造过时年份。',
  ].filter(Boolean).join('\n')
}

/** 根据排盘 + bazi-skill 典籍框架生成开场解读 */
export async function generateReading({ bazi, title, fallbackBody, teaser }) {
  const { baziSkillContext, formatChartForSkill } = await import('./baziSkill.js')
  const chart = formatChartForSkill(bazi)
  const prompt = [
    `称号：${title}`,
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
        '输出要求：3～5 段短中文，每段一行；不要 markdown、标题、列表、典籍书名。',
        '必须吃进命盘信息：月令季节感、身强弱、五行偏枯；有时辰点时辰，无时辰别编；有出生地轻轻点到。',
        '总字数约 140～260 字。偏陪伴与照见，不恐吓、不算死。',
      ].join('\n\n'),
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 520,
      search: false, // 开场解读不走联网，时间上下文仍会注入
    })
    const body = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
    if (body.length >= 2) return { title, body, teaser, source: 'bazi-skill' }
  } catch { /* fall through */ }
  return { title, body: fallbackBody, teaser, source: 'template' }
}

/** 命名后的「当下阶段」三句：opener / middle / advice */
export async function generatePhase({ bazi, flameName, fallback }) {
  const { baziSkillContext, formatChartForSkill } = await import('./baziSkill.js')
  const chart = formatChartForSkill(bazi)
  const name = flameName || '小火苗'
  try {
    const text = await chatLLM({
      system: [
        `你是用户的守护灵，刚被取名为「${name}」。`,
        baziSkillContext(),
        '根据命盘与当前时间，写恰好 3 行中文（用换行分隔）：',
        `1) 以「嗯…${name}看着你。」开头，点出ta此刻状态（结合日主五行与身强弱）`,
        '2) 点出当前大运/流年带来的气（有大运就提干支；不要提出生城市）',
        '3) 一句可执行的近期建议',
        '每行一句或两句，短、暖、像贴耳说；不要 markdown、列表、书名。总字数约 90～160。',
      ].join('\n'),
      messages: [{
        role: 'user',
        content: `守护灵名：${name}\n\n【命盘】\n${chart}\n\n请输出 3 行。`,
      }],
      maxTokens: 320,
      search: false,
    })
    const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
    if (lines.length >= 3) {
      return { opener: lines[0], middle: lines[1], advice: lines[2], source: 'bazi-skill' }
    }
  } catch { /* fall through */ }
  return { ...fallback, source: 'template' }
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
