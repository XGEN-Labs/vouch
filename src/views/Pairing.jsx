import { useEffect, useMemo, useRef, useState } from 'react'
import Flame from '../components/Flame.jsx'
import Logo from '../components/Logo.jsx'
import BackButton from '../components/BackButton.jsx'
import { computeBazi } from '../bazi.js'
import { GAN_PROFILE } from '../data/persona.js'
import { chatLLM, pairAgentSystem } from '../lib/llm.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function pairReading(you, other) {
  const yGan = you.bazi.dayMaster, oGan = other.dayMaster
  const yEl = GAN_PROFILE[yGan].element, oEl = GAN_PROFILE[oGan].element
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  const youName = you.userName || '你'
  const line1 = `${other.name}是${oGan}${oEl}，${youName}是${yGan}${yEl}。`
  let line2
  if (yEl === oEl) line2 = `同是${yEl}，同频共振。你们太懂彼此，好起来是知己，也最容易在对方身上看见自己的执拗。`
  else if (SHENG[oEl] === yEl) line2 = `${oEl}生${yEl}，${oEl}${yEl}相生。一个赋予生命，一个带来光亮，是天生契合的组合。`
  else if (SHENG[yEl] === oEl) line2 = `${yEl}生${oEl}，${yEl}${oEl}相生。你会不自觉地照顾对方、给对方力量，是很暖的一段关系。`
  else if (KE[yEl] === oEl) line2 = `${yEl}克${oEl}，你天生管得住对方。张力也是吸引，就看谁先松手。`
  else line2 = `${oEl}克${yEl}，对方容易压到你。相处时记得多护着自己一点，别把光全给出去。`
  return { line1, line2 }
}

function TypeLine({ who, text, active, onDone }) {
  const [shown, setShown] = useState(active ? '' : text)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!active) {
      setShown(text)
      return
    }
    setShown('')
    let i = 0
    let timer
    const tick = () => {
      i += 1
      setShown(text.slice(0, i))
      if (i < text.length) {
        const pause = text[i - 1] === '。' || text[i - 1] === '，' ? 90 : 0
        timer = setTimeout(tick, 28 + pause)
      } else {
        onDoneRef.current?.()
      }
    }
    timer = setTimeout(tick, 60)
    return () => clearTimeout(timer)
  }, [active, text])

  return (
    <p className="pair-line show">
      <span className="who">{who}：</span>{shown}
      {active && shown.length < text.length && <span className="cursor">▍</span>}
    </p>
  )
}

export default function Pairing({ profile, back, goHome }) {
  const you = profile || {
    userName: 'Frank', flameName: '小火苗',
    bazi: computeBazi({ year: 1995, month: 9, day: 23, hour: '', minute: 0, gender: 'male' })
  }
  const yourAgent = you.flameName || '小火苗'
  const youName = you.userName || 'Frank'

  const tressi = useMemo(() => ({
    name: 'Tressi',
    agentName: '木木',
    ...computeBazi({ year: 1993, month: 4, day: 3, hour: '', minute: 0, gender: 'female' })
  }), [])

  // match | loading | chat
  const [stage, setStage] = useState('match')
  const [other, setOther] = useState(null)
  const [draft, setDraft] = useState('')
  const [speaker, setSpeaker] = useState(null) // 'youAgent' | 'otherAgent' | null
  const [lineIdx, setLineIdx] = useState(-1)
  const [scriptDone, setScriptDone] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [loadHint, setLoadHint] = useState(0)
  const scrollRef = useRef(null)
  const playRef = useRef(0)

  const LOAD_HINTS = ['正在感应附近的频率…', '对齐守护灵的光…', '快了，有人回应了…']

  const rd = useMemo(() => (other ? pairReading(you, other) : null), [you, other])
  const script = useMemo(() => {
    if (!other || !rd) return []
    return [
      { speaker: 'youAgent', who: yourAgent, text: `${rd.line1}${rd.line2}` },
      { speaker: 'otherAgent', who: other.agentName || '木木', text: `最近${other.name}工作遇到了一些卡点，你们可以聊聊。` },
    ]
  }, [rd, yourAgent, other])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' })
  }, [lineIdx, msgs, speaker])

  useEffect(() => {
    if (stage !== 'loading') return
    setLoadHint(0)
    const id = setInterval(() => {
      setLoadHint(h => (h + 1) % LOAD_HINTS.length)
    }, 900)
    return () => clearInterval(id)
  }, [stage])

  const onLineDone = () => {
    const next = lineIdx + 1
    if (next < script.length) {
      setTimeout(() => {
        setLineIdx(next)
        setSpeaker(script[next].speaker)
      }, 400)
    } else {
      setTimeout(() => {
        setSpeaker(null)
        setScriptDone(true)
      }, 200)
    }
  }

  const startPair = async () => {
    setOther(null)
    setLineIdx(-1)
    setMsgs([])
    setSpeaker(null)
    setScriptDone(false)
    setStage('loading')
    await sleep(2800)
    // loading 结束才揭晓配对对象
    setOther(tressi)
    setStage('chat')
  }

  // 进入结果页且已揭晓对方后，再开群聊打字
  useEffect(() => {
    if (stage !== 'chat' || !other || !script.length || lineIdx >= 0) return
    const token = ++playRef.current
    ;(async () => {
      await sleep(450)
      if (playRef.current !== token) return
      setLineIdx(0)
      setSpeaker(script[0].speaker)
    })()
  }, [stage, other, script, lineIdx])

  const typeBotReply = (who, text, sp) => {
    const id = `${Date.now()}-${Math.random()}`
    setSpeaker(sp)
    setMsgs(prev => [...prev, { id, from: 'bot', who, text, shown: '', speaking: sp }])
    let i = 0
    const tick = () => {
      i += 1
      setMsgs(prev => prev.map(m => m.id === id ? { ...m, shown: text.slice(0, i) } : m))
      if (i < text.length) setTimeout(tick, 28)
      else setSpeaker(null)
    }
    setTimeout(tick, 40)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const v = draft.trim()
    if (!v || !scriptDone || speaker) return
    setDraft('')
    setMsgs(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: v }])
    const replySpeaker = Math.random() > 0.5 ? 'youAgent' : 'otherAgent'
    const who = replySpeaker === 'youAgent' ? yourAgent : (other.agentName || '木木')
    const fallback = replySpeaker === 'youAgent'
      ? `嗯，我听见了。${youName}，你想跟${other.name}说点什么吗？`
      : `我跟${other.name}说一声。你们最近确实该聊聊。`
    setSpeaker(replySpeaker)
    try {
      const reading = rd ? `${rd.line1}${rd.line2}` : ''
      const reply = await chatLLM({
        system: pairAgentSystem({
          who,
          side: replySpeaker === 'youAgent' ? 'you' : 'other',
          youName,
          otherName: other.name,
          yourAgent,
          otherAgent: other.agentName || '木木',
          reading,
        }),
        messages: [{ role: 'user', content: v }],
        maxTokens: 160,
      })
      typeBotReply(who, reply, replySpeaker)
    } catch {
      typeBotReply(who, fallback, replySpeaker)
    }
  }

  const youAgentOn = speaker === 'youAgent'
  const otherAgentOn = speaker === 'otherAgent'

  if (stage === 'match') {
    return (
      <div className="screen">
        <div className="topbar">
          <BackButton onClick={back} />
          <Logo onHome={goHome} />
        </div>

        <div className="pair-match">
          <div className="pair-card alone">
            <Flame state="awake" size={160} />
            <div className="pair-card-name">{youName}</div>
            <div className="pair-card-sub">守护灵 · {yourAgent}</div>
          </div>
          <p className="pair-match-hint">让守护灵去找一个频率相近的人。</p>
          <button type="button" className="wheel-confirm pair-start" onClick={startPair}>开始配对</button>
        </div>
      </div>
    )
  }

  if (stage === 'loading') {
    return (
      <div className="screen pair-loading">
        <div className="topbar">
          <BackButton onClick={back} />
          <Logo onHome={goHome} />
        </div>
        <div className="pair-loading-body">
          <div className="pair-loading-orb" aria-hidden />
          <Flame state="orb" size={140} />
          <p className="pair-loading-title">配对中</p>
          <p className="pair-loading-hint">{LOAD_HINTS[loadHint]}</p>
          <div className="pair-loading-dots"><i /><i /><i /></div>
        </div>
      </div>
    )
  }

  if (!other) return null

  return (
    <div className="screen pair-chat">
      <div className="topbar">
        <BackButton onClick={back} />
        <Logo onHome={goHome} />
      </div>

      <div className="pair-orbit">
        {/* 星球环：扁椭圆 + 倾角；四头像沿环均分、互不遮挡 */}
        <svg className="pair-links" viewBox="0 0 360 300" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <g className="pair-ring-g" transform="translate(180 148) rotate(-18)">
            <ellipse className="pair-ring pair-ring-outer" cx="0" cy="0" rx="156" ry="72" />
            <ellipse className="pair-ring pair-ring-inner" cx="0" cy="0" rx="138" ry="60" />
          </g>
        </svg>

        <div className={`pair-slot flame-a agent-slot${youAgentOn ? ' speaking' : ''}`}>
          <Flame state="awake" size={youAgentOn ? 88 : 78} />
        </div>
        <div className="node mid pair-slot you">{youName}</div>
        <div className="node big pair-slot other">{other.name}</div>
        <div className={`pair-slot flame-b agent-slot${otherAgentOn ? ' speaking' : ''}`}>
          <Flame state="orb" size={otherAgentOn ? 70 : 62} />
        </div>
      </div>

      <div className="pair-read" ref={scrollRef}>
        {script.map((line, i) => (
          i <= lineIdx ? (
            <TypeLine
              key={`${other.name}-${i}`}
              who={line.who}
              text={line.text}
              active={i === lineIdx && !scriptDone}
              onDone={i === lineIdx ? onLineDone : undefined}
            />
          ) : null
        ))}
        {msgs.map((m) => (
          m.from === 'user'
            ? (
              <div key={m.id} className="msg user fade-in pair-user-msg">
                <span className="bubble">{m.text}</span>
              </div>
            )
            : (
              <p key={m.id} className="pair-line show">
                <span className="who">{m.who}：</span>{m.shown ?? ''}
                {m.shown !== m.text && <span className="cursor">▍</span>}
              </p>
            )
        ))}
      </div>

      <form className="inputbar" onSubmit={onSubmit}>
        <div className="field">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={scriptDone ? '跟他们说点什么…' : '听他们说完…'}
            disabled={!scriptDone || !!speaker}
          />
        </div>
      </form>
    </div>
  )
}
