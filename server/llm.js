// 转发到自建 LLM 中转（OpenAI 兼容），在服务端注入 Key。
// 前端路径 /api/llm/chat/completions -> 中转 /v1/chat/completions，与原 Vite 代理保持一致。
import { config } from './config.js'

// 只透传这些字段：model 由服务端决定，避免有人改成更贵的模型刷额度
const PASS_THROUGH = ['messages', 'temperature', 'top_p', 'tools', 'tool_choice', 'stop']

export async function forwardChat(req, res) {
  const src = req.body || {}
  if (!Array.isArray(src.messages) || src.messages.length === 0) {
    return res.status(400).json({ error: 'messages required' })
  }

  const body = { model: config.llm.model }
  for (const k of PASS_THROUGH) if (src[k] !== undefined) body[k] = src[k]
  body.max_tokens = Math.min(Number(src.max_tokens) || 512, config.llm.maxTokensCap)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), config.llm.timeoutMs)

  try {
    const upstream = await fetch(`${config.llm.base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.llm.key ? { Authorization: `Bearer ${config.llm.key}` } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })

    const text = await upstream.text()
    if (!upstream.ok) {
      console.error(`[llm] upstream ${upstream.status}: ${text.slice(0, 300)}`)
      // 上游报错文案可能含内部信息，不原样回给前端
      return res.status(502).json({ error: `upstream ${upstream.status}` })
    }
    res.type('application/json').send(text)
  } catch (e) {
    const timedOut = e.name === 'AbortError'
    console.error(`[llm] ${timedOut ? 'timeout' : 'error'}: ${e.message}`)
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'llm timeout' : 'llm unreachable' })
  } finally {
    clearTimeout(timer)
  }
}
