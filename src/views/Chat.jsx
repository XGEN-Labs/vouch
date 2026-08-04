import { useEffect, useRef, useState } from 'react'
import Flame from '../components/Flame.jsx'
import Logo from '../components/Logo.jsx'
import BackButton from '../components/BackButton.jsx'
import { phaseReading } from '../data/persona.js'
import { chatLLM, guardianSystem } from '../lib/llm.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const QUICK_PROMPTS = [
  { label: '问事业', text: '我想问问最近的事业运，有什么该留意的？' },
  { label: '问感情', text: '我想问问最近的感情运，心里有点拿不准。' },
  { label: '问财运', text: '我想问问最近的财运，钱和机会方面怎么样？' },
]

function replyFor(text, profile) {
  const t = text.trim()
  const name = profile?.flameName || '小火苗'
  const user = profile?.userName || '你'
  const ph = profile?.phase || (profile?.bazi ? phaseReading(profile.bazi, name) : null)

  const day = profile?.bazi?.dayMaster
    ? `${profile.bazi.dayMaster}${profile.bazi.dayMasterWuXing || ''}`
    : ''
  const dy = profile?.bazi?.currentDaYun?.ganZhi
  const cut = day
    ? `先从盘上看，你日主是${day}${profile?.bazi?.strength ? `、身${profile.bazi.strength}` : ''}${dy ? `，眼下走${dy}运` : ''}。`
    : '先从气上看——'

  if (/你好|嗨|在吗|hello|hi/i.test(t)) return `${user}，我在。想聊事业感情还是别的，我都听着。`
  if (/累|难受|烦|困|压力|焦虑/.test(t)) {
    return `${cut}这阵子像灯一直开着，芯容易干。先把最耗你的那一件放慢半拍，喘口气再谈别的。`
  }
  if (/喜欢|爱|心动|暗恋|感情/.test(t)) {
    return `${cut}感情上你容易把光先给别人。近一点的关系，适合先看自己稳不稳，再谈要不要再靠近。`
  }
  if (/事业|工作|职场/.test(t)) {
    return `${cut}事业上别同时摊太多。${ph?.advice || '先把手里已经亮着的那件事做深，比再开一盏新的更稳。'}`
  }
  if (/财|钱|机会/.test(t)) {
    return `${cut}财气要聚才看得见。最近先收该收的、清该清的，比追新的风口踏实。`
  }
  if (/运势|最近|怎么样|阶段/.test(t)) {
    return `${cut}${ph?.advice || '最近适合把已经亮着的那一点护好，别急着再点新的。'}`
  }
  if (/谢谢|多谢/.test(t)) return '嗯。你记得我就好。'
  if (/名字|叫什么/.test(t)) return `我是${name}呀。是你给我取的。`
  return [
    `${cut}你再说具体一点，我帮你从盘上对一下。`,
    `${cut}我先听你把事儿说圆，再跟你对大运这层气。`,
  ][Math.floor(Math.random() * 2)]
}

export default function Chat({ profile, back, goHome }) {
  const flameName = profile?.flameName || '小火苗'
  const userName = profile?.userName || '你'
  const [msgs, setMsgs] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const scrollRef = useRef(null)
  const started = useRef(false)
  const historyRef = useRef([])

  const push = (m) => setMsgs(prev => [...prev, { id: prev.length + '-' + Math.random(), ...m }])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' })
  }, [msgs, showQuick])

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      await sleep(400)
      const openers = [`${userName}，你来啦。`, '想跟我聊点什么？可以从下面选，也可以直接说。']
      for (const t of openers) {
        push({ from: 'bot', text: t })
        historyRef.current.push({ role: 'assistant', content: t })
        await sleep(700)
      }
      setShowQuick(true)
    })()
  }, [userName])

  const ask = async (text) => {
    const v = text.trim()
    if (!v || busy) return
    setShowQuick(false)
    setDraft('')
    push({ from: 'user', text: v })
    historyRef.current.push({ role: 'user', content: v })
    setBusy(true)
    try {
      const reply = await chatLLM({
        system: guardianSystem(profile),
        messages: historyRef.current.slice(-12),
        maxTokens: 520,
      })
      push({ from: 'bot', text: reply })
      historyRef.current.push({ role: 'assistant', content: reply })
    } catch {
      const fallback = replyFor(v, profile)
      push({ from: 'bot', text: fallback })
      historyRef.current.push({ role: 'assistant', content: fallback })
    }
    setBusy(false)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    await ask(draft)
  }

  return (
    <div className="screen">
      <div className="topbar">
        <BackButton onClick={back} />
        <Logo onHome={goHome} />
      </div>

      <div className="flame-stage chat-flame">
        <Flame state="awake" size={160} />
        <div className="home-name" style={{ fontSize: 18, letterSpacing: 3 }}>{flameName}</div>
      </div>

      <div className="transcript" ref={scrollRef}>
        {msgs.map(m => (
          m.from === 'user'
            ? (
              <div key={m.id} className="msg user fade-in">
                <span className="bubble">{m.text}</span>
              </div>
            )
            : <div key={m.id} className="msg bot fade-in">{m.text}</div>
        ))}
        {busy && <div className="msg bot dim fade-in">…</div>}
      </div>

      {showQuick && !busy && (
        <div className="suggestions chat-quick">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              type="button"
              className="suggestion"
              onClick={() => ask(p.text)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <form className="inputbar" onSubmit={onSubmit}>
        <div className="field">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="跟我说点什么…"
            disabled={busy}
          />
        </div>
      </form>
    </div>
  )
}
