import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import BackButton from '../components/BackButton.jsx'
import SendButton from '../components/SendButton.jsx'
import PersonCard from '../components/PersonCard.jsx'
import RoomScene, { RoomBlobs } from '../components/RoomScene.jsx'
import userAvatar from '../assets/chat/user-avatar.svg'
import monsterSvg from '../assets/healing/monster.svg'
import splashSvg from '../assets/healing/splash.svg'
import flagSvg from '../assets/healing/flag.svg'
import { phaseReading } from '../data/persona.js'
import { astroPhaseReading } from '../data/astroPersona.js'
import { ROOM_THEMES } from '../data/roomThemes.js'
import { chatLLM, guardianSystem } from '../lib/llm.js'
import { sendIntro, markMutual, findContact } from '../data/social.js'
import { canListen, listenHold, speak, stopSpeaking } from '../lib/voice.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** 会话缓存：退出再进保留记录（刷新页面才重置） */
const chatStore = { msgs: null, history: [], asked: 0, mode: 'room', voice: false, caps: true, seedReveal: 0 }

/**
 * 旧版「气泡聊天页 / 独立语音页」的入口开关：
 * 新设计里语音收进了房间（左上角模式胶囊），text / listen 两种旧模式代码保留，置 true 即恢复入口。
 */
const SHOW_MODE_SWITCH = false

function normalizeMode(m) {
  if (m === 'text' || m === 'listen') return m
  return 'room'
}

/** 内置开场：三句邀请后出现「好啊」，点了再出小名片。 */
function seedIntro() {
  const botTexts = [
    '你不是说最近想找人一起去爬山吗？',
    '我想起来有个人，她把深圳周边的路线收藏了一堆，但一直找不到合适的人一起去。',
    '要不要认识一下～',
  ]
  const msgs = botTexts.map((t, i) => ({ id: `seed-b${i}`, from: 'bot', text: t }))
  const history = botTexts.map((t) => ({ role: 'assistant', content: t }))
  return { msgs, history }
}

const QUICK_PROMPTS = [
  { label: '问事业', text: '我想问问最近的事业运，有什么该留意的？' },
  { label: '问感情', text: '我想问问最近的感情运，心里有点拿不准。' },
  { label: '问财富', text: '我想问问最近的财运，钱和机会方面怎么样？' },
  { label: '问日运', text: '我想问问今天的日运，今天适合做什么、要避开什么？' },
]

function agentMeta(profile) {
  const astro = profile?.activeSystem === 'astro'
  if (astro) {
    const name = profile?.astro?.flameName || `${profile?.astro?.sunSignCn || '星'}灵`
    const ph = profile?.astro?.phase || (profile?.astro ? astroPhaseReading(profile.astro, name) : null)
    return { astro: true, name, ph, signId: profile?.astro?.sunSign || 'leo' }
  }
  const name = profile?.guardian?.name || profile?.flameName || '小火苗'
  const ph = profile?.phase || (profile?.bazi ? phaseReading(profile.bazi, name) : null)
  return { astro: false, name, ph, signId: null }
}

function replyFor(text, profile) {
  const t = text.trim()
  const { astro, name, ph } = agentMeta(profile)
  const user = profile?.userName || '你'

  let cut
  if (astro) {
    const s = profile?.astro
    cut = s?.sunSignCn
      ? `先从星盘上看：太阳${s.sunSignCn}${s.moonSignCn ? `、月亮${s.moonSignCn}` : ''}${s.ascSignCn ? `、上升${s.ascSignCn}` : ''}。`
      : '先从星盘的光上看——'
  } else {
    const day = profile?.bazi?.dayMaster
      ? `${profile.bazi.dayMaster}${profile.bazi.dayMasterWuXing || ''}`
      : ''
    const dy = profile?.bazi?.currentDaYun?.ganZhi
    cut = day
      ? `先从盘上看，你日主是${day}${profile?.bazi?.strength ? `、身${profile.bazi.strength}` : ''}${dy ? `，眼下走${dy}运` : ''}。`
      : '先从气上看——'
  }

  if (/你好|嗨|在吗|hello|hi/i.test(t)) return `${user}，我在。想聊事业感情还是别的，我都听着。`
  if (/累|难受|烦|困|压力|焦虑/.test(t)) {
    return `${cut}这阵子像灯一直开着，芯容易干。先把最耗你的那一件放慢半拍，喘口气再谈别的。`
  }
  if (/日运|今日运|今天的运/.test(t)) {
    return `${cut}今天的气比较细，适合把已经开着的事往前推半步，别新起炉灶。出门见人可以，但别把话说满；晚上早点把灯关掉。`
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
    `${cut}你再说具体一点，我帮你对一下。`,
    `${cut}我先听你把事儿说圆，再跟你对这层气。`,
  ][Math.floor(Math.random() * 2)]
}

function pickRecommend(profile, topic) {
  const list = profile?.contacts || []
  if (!list.length) return null
  if (/感情|喜欢|爱|心动/.test(topic)) {
    return list.find((c) => !c.known) || list[0]
  }
  if (/事业|工作|财/.test(topic)) {
    return list.find((c) => c.id === 'alex') || list.find((c) => c.known) || list[0]
  }
  return list.find((c) => !c.known) || list[Math.floor(Math.random() * list.length)]
}

function acceptsIntro(text) {
  return /^(?:可以(?:啊|呀|哇)?|好啊|好呀|好的)(?:\s*[:：]?[oO0])?\s*[!！。~～]*$/.test(text.trim())
}

/** 主题色注入：房间的所有颜色走 CSS 变量 */
export function roomVars(theme) {
  return {
    '--rm-bg': theme.bg,
    '--rm-ink': theme.ink,
    '--rm-dim': theme.dim,
    '--rm-bloba': theme.blobA,
    '--rm-blobb': theme.blobB,
    '--rm-petal': theme.petal,
    '--rm-bot-bubble': theme.botBubble,
    '--rm-bot-text': theme.botText,
    '--rm-user-bubble': theme.userBubble,
    '--rm-user-text': theme.userText,
    '--rm-pill': theme.pillBg,
    '--rm-accent': theme.accent,
  }
}

export default function Chat({ profile, setProfile, back, go, goHome }) {
  const { name: flameName } = agentMeta(profile)
  const [msgs, setMsgs] = useState(() => {
    if (chatStore.msgs) return chatStore.msgs
    const seed = seedIntro()
    chatStore.msgs = seed.msgs
    chatStore.history = seed.history
    chatStore.asked = 1
    return seed.msgs
  })
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [cardOrigin, setCardOrigin] = useState(null)
  const scrollRef = useRef(null)
  const historyRef = useRef(chatStore.history)
  const askedRef = useRef(chatStore.asked)

  // 「认识一下」滑动确认：把圆箭头从左拖到右
  const [ctaSent, setCtaSent] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [mode, setMode] = useState(() => {
    const m = SHOW_MODE_SWITCH ? normalizeMode(chatStore.mode) : 'room'
    chatStore.mode = m
    return m
  })
  // 房间内的语音子模式 + 字幕开关（对应设计稿左上角的两颗胶囊）
  const [roomVoice, setRoomVoice] = useState(chatStore.voice)
  const [caps, setCaps] = useState(chatStore.caps)
  const roomVoiceRef = useRef(roomVoice)
  const [listening, setListening] = useState(false)
  const [talking, setTalking] = useState(false)
  const [partial, setPartial] = useState('')
  const [micHint, setMicHint] = useState('')
  const agreeTimer = useRef(null)
  const bigRef = useRef(null)
  const overlayRef = useRef(null)
  const smallCardRef = useRef(null)

  const expanded = expandedId ? findContact(profile, expandedId) : null
  const introSent = !!(ctaSent || expanded?.introSent || expanded?.mutual || expanded?.known)

  useEffect(() => {
    setCtaSent(!!(expanded?.introSent || expanded?.mutual || expanded?.known))
    setCelebrating(false)
  }, [expandedId])

  useEffect(() => () => clearTimeout(agreeTimer.current), [])

  // 同步到会话缓存
  useEffect(() => { chatStore.msgs = msgs }, [msgs])
  useEffect(() => {
    chatStore.voice = roomVoice
    roomVoiceRef.current = roomVoice
  }, [roomVoice])
  useEffect(() => { chatStore.caps = caps }, [caps])

  const push = (m) => setMsgs(prev => [...prev, { id: prev.length + '-' + Math.random(), ...m }])

  const offerCard = (person, line) => {
    if (!person || person.known || person.introSent || person.mutual) return false
    if (line) {
      push({ from: 'bot', text: line })
      historyRef.current.push({ role: 'assistant', content: line })
    }
    push({ from: 'card', personId: person.id })
    return true
  }

  const openBig = (personId, node) => {
    if (node) {
      smallCardRef.current = node
      const r = node.getBoundingClientRect()
      setCardOrigin({ x: r.left, y: r.top, w: r.width, h: r.height })
    } else {
      setCardOrigin(null)
    }
    setExpandedId(personId)
  }

  const closeBig = (opts = {}) => {
    const card = bigRef.current
    const overlay = overlayRef.current
    const src = smallCardRef.current
    const finish = () => {
      setExpandedId(null)
      setCardOrigin(null)
      setCelebrating(false)
    }
    if (!card) {
      finish()
      return
    }
    overlay?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: opts.celebrate ? 420 : 280, easing: 'ease', fill: 'forwards' },
    )
    if (opts.celebrate) {
      card.style.transformOrigin = '50% 50%'
      const anim = card.animate(
        [
          { transform: 'scale(1) rotate(0deg)', opacity: 1 },
          { transform: 'scale(1.06) rotate(-3deg)', opacity: 1, offset: 0.28 },
          { transform: 'scale(0.72) rotate(8deg) translateY(18px)', opacity: 0 },
        ],
        { duration: 520, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' },
      )
      anim.onfinish = finish
      anim.oncancel = finish
      return
    }
    const dest = card.getBoundingClientRect()
    const r = src?.getBoundingClientRect()
    if (r && r.width > 8) {
      card.style.transformOrigin = 'top left'
      const anim = card.animate(
        [
          { transform: 'translate(0, 0) scale(1, 1)' },
          { transform: `translate(${r.left - dest.x}px, ${r.top - dest.y}px) scale(${r.width / dest.width}, ${r.height / dest.height})` },
        ],
        { duration: 340, easing: 'cubic-bezier(.4, 0, .7, .2)', fill: 'forwards' },
      )
      anim.onfinish = finish
      anim.oncancel = finish
    } else {
      window.setTimeout(finish, 260)
    }
  }

  useLayoutEffect(() => {
    if (!expandedId || !cardOrigin || !bigRef.current) return undefined
    const el = bigRef.current
    const dest = el.getBoundingClientRect()
    el.style.transformOrigin = 'top left'
    const anim = el.animate(
      [
        { transform: `translate(${cardOrigin.x - dest.x}px, ${cardOrigin.y - dest.y}px) scale(${cardOrigin.w / dest.w}, ${cardOrigin.h / dest.h})` },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.22, .82, .18, 1)' },
    )
    return () => anim.cancel()
  }, [expandedId, cardOrigin])

  useEffect(() => {
    // 连续 push 会打断 smooth 滚动，改成下一帧直接落底
    const el = scrollRef.current
    if (!el) return
    const id = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
    return () => cancelAnimationFrame(id)
  }, [msgs, busy, mode])

  const maybeRecommend = async (topic) => {
    askedRef.current += 1
    chatStore.asked = askedRef.current
    const should = /感情|认识|朋友|人|事业|玩/.test(topic)
    if (!should) return
    const person = pickRecommend(profile, topic)
    if (!person) return
    await sleep(400)
    push({ from: 'bot', text: `对了，我想到一个人——${person.name}。你们也许合得来，看看名片？` })
    push({ from: 'card', personId: person.id })
  }

  const ask = async (text) => {
    const v = text.trim()
    if (!v || busy) return
    setDraft('')
    setPartial('')
    push({ from: 'user', text: v })
    historyRef.current.push({ role: 'user', content: v })
    if (acceptsIntro(v)) {
      const person = findContact(profile, 'alex') || pickRecommend(profile, '认识朋友')
      if (person && offerCard(person, `就是她啦，${person.name}。点开名片看看？`)) return
    }
    setBusy(true)
    stopSpeaking()
    setTalking(false)
    const sayIt = (reply) => {
      if (chatStore.mode !== 'text' && roomVoiceRef.current) {
        setTalking(true)
        speak(reply, { onend: () => setTalking(false) })
      }
    }
    try {
      const reply = await chatLLM({
        system: guardianSystem(profile),
        messages: historyRef.current.slice(-12),
        maxTokens: 520,
      })
      push({ from: 'bot', text: reply })
      historyRef.current.push({ role: 'assistant', content: reply })
      sayIt(reply)
    } catch {
      const fallback = replyFor(v, profile)
      push({ from: 'bot', text: fallback })
      historyRef.current.push({ role: 'assistant', content: fallback })
      sayIt(fallback)
    }
    setBusy(false)
    await maybeRecommend(v)
  }

  const meet = (person) => {
    if (!person || person.introSent || person.mutual || person.known) return
    const id = person.id
    setCtaSent(true)
    setProfile?.((p) => sendIntro(p, id))
    push({ from: 'bot', text: `邀请已发出，等${person.name}也同意之后，就会出现在串门里。` })
    clearTimeout(agreeTimer.current)
    agreeTimer.current = setTimeout(() => {
      setProfile?.((p) => markMutual(p, id))
      push({ from: 'bot', text: `${person.name}也想认识你。去串门里就能看到那颗新的星，点开再一起聊。` })
    }, 2800)
  }

  const confirmMeet = () => {
    if (!expanded || introSent || celebrating) return
    meet(expanded)
    setCelebrating(true)
  }

  useEffect(() => {
    if (!celebrating) return undefined
    const timer = window.setTimeout(() => closeBig({ celebrate: true }), 980)
    return () => window.clearTimeout(timer)
  }, [celebrating])

  const listenRef = useRef(null)
  const heardRef = useRef('')
  const partialRef = useRef('')
  const holdingRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => window.speechSynthesis.getVoices()
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      listenRef.current?.stop()
      stopSpeaking()
    }
  }, [])

  const switchMode = (next) => {
    const modeNext = normalizeMode(next)
    chatStore.mode = modeNext
    setMode(modeNext)
    holdingRef.current = false
    listenRef.current?.stop()
    listenRef.current = null
    setListening(false)
    setPartial('')
    stopSpeaking()
    setTalking(false)
    if (modeNext === 'listen') setExpandedId(null)
  }

  const toggleRoomVoice = () => {
    const next = !roomVoice
    setRoomVoice(next)
    holdingRef.current = false
    listenRef.current?.stop()
    listenRef.current = null
    setListening(false)
    setPartial('')
    setMicHint('')
    if (!next) {
      stopSpeaking()
      setTalking(false)
    }
  }

  const beginListening = (e) => {
    if (busy || talking) {
      stopSpeaking()
      setTalking(false)
    }
    if (!canListen()) {
      setMicHint('这台设备听不到，直接打字就行')
      return
    }
    e?.preventDefault()
    if (e?.pointerId != null) e.currentTarget.setPointerCapture?.(e.pointerId)
    holdingRef.current = true
    heardRef.current = ''
    partialRef.current = ''
    setPartial('')
    setMicHint('')
    setListening(true)
    stopSpeaking()
    listenRef.current = listenHold({
      onPartial: (t) => { partialRef.current = t; setPartial(t) },
      onFinal: (t) => { heardRef.current = t },
      onError: () => {
        holdingRef.current = false
        listenRef.current = null
        setListening(false)
        setMicHint(roomVoiceRef.current ? '没听清，再点击试试' : '没听清，再按住试试，或直接打字')
      },
    })
  }

  const onMicDown = (e) => beginListening(e)

  const onMicUp = () => {
    if (!holdingRef.current) return
    holdingRef.current = false
    listenRef.current?.stop()
    listenRef.current = null
    setListening(false)
    const said = (heardRef.current || partialRef.current).trim()
    heardRef.current = ''
    partialRef.current = ''
    setPartial('')
    if (said) ask(said)
  }

  const onRoomMicClick = (e) => {
    e.preventDefault()
    if (holdingRef.current) onMicUp()
    else beginListening()
  }

  const [seedRevealCount, setSeedRevealCount] = useState(chatStore.seedReveal)
  useEffect(() => {
    if (seedRevealCount >= 3) return undefined
    const timer = setTimeout(() => {
      const next = seedRevealCount + 1
      chatStore.seedReveal = next
      setSeedRevealCount(next)
    }, seedRevealCount === 0 ? 300 : 1400)
    return () => clearTimeout(timer)
  }, [seedRevealCount])

  const visibleBotMessages = msgs.filter((m) => {
    if (m.from !== 'bot' || !m.text) return false
    if (!String(m.id).startsWith('seed-b')) return true
    const seedIndex = Number(String(m.id).slice('seed-b'.length))
    return seedIndex < seedRevealCount
  })
  const lastBot = visibleBotMessages.at(-1)

  // 气泡从下方加入；名片也进同一列，新回复会把它往上顶。
  const tail = msgs.slice(-8)
  const visibleBotIds = new Set(visibleBotMessages.map((m) => m.id))
  const floatStack = msgs.filter((m) => {
    if (m.from === 'card') return true
    if (m.from === 'bot') return visibleBotIds.has(m.id)
    return false
  }).slice(-8).reverse()
  const userFloat = [...tail].reverse().find((m) => m.from === 'user')
  const [openFloatId, setOpenFloatId] = useState(null)
  useEffect(() => { setOpenFloatId(null) }, [lastBot?.id])
  const showCaps = !roomVoice || caps
  const recLiftRef = useRef(null)
  const recTopRef = useRef(null)
  useLayoutEffect(() => {
    const el = recLiftRef.current
    if (!el) return undefined
    const top = el.getBoundingClientRect().top
    const prev = recTopRef.current
    recTopRef.current = top
    if (prev == null || Math.abs(prev - top) < 2) return undefined
    const anim = el.animate(
      [{ transform: `translateY(${prev - top}px)` }, { transform: 'none' }],
      { duration: 480, easing: 'cubic-bezier(.22, .82, .2, 1)' },
    )
    return () => anim.cancel()
  }, [msgs, seedRevealCount])

  const voiceCaption = listening && partial
    ? partial
    : busy
      ? '……'
      : (lastBot?.text || '')
  const voiceStatus = listening ? '在听你说' : talking ? '正在说' : busy ? '正在想…' : '在房间里'
  const latestCard = [...msgs].reverse().find((m) => m.from === 'card')
  const latestCardPerson = latestCard ? findContact(profile, latestCard.personId) : null

  const renderMiniCard = (person, extraClass = '') => {
    if (!person) return null
    const opening = expandedId === person.id
    return (
      <PersonCard
        variant="chat"
        person={person}
        className={`${extraClass}${opening ? ' is-opening' : ''}`.trim()}
        onCta={(e) => openBig(person.id, e.currentTarget)}
      />
    )
  }
  const theme = {
    ...ROOM_THEMES.blue,
    bg: '#A5D9F1',
    blobA: '#A26DDF',
    blobB: '#ED8548',
    botBubble: '#24242D',
    accent: '#9BCEF3',
  }

  /* ── 旧版消息流（text 模式还在用；房间新版不再渲染） ── */
  const thread = (
    <div className="transcript chat-thread" ref={scrollRef}>
      {msgs.map((m) => {
        if (m.from === 'card') {
          const person = findContact(profile, m.personId)
          return (
            <div key={m.id} className="recommend-wrap fade-in">
              {renderMiniCard(person)}
            </div>
          )
        }
        return m.from === 'user'
          ? (
            <div key={m.id} className="msg user fade-in">
              <span className="bubble">{m.text}</span>
              <img className="chat-ava" src={userAvatar} alt="" draggable={false} />
            </div>
          )
          : (
            <div key={m.id} className={`msg bot fade-in${m.dim ? ' dim' : ''}`}>
              <span className="bubble">{m.text}</span>
            </div>
          )
      })}
      {busy && mode !== 'room' && (
        <div className="msg bot dim fade-in">
          <span className="bubble">…</span>
        </div>
      )}
    </div>
  )

  const composerInput = (
    <form className="inputbar chat-inputbar room-inputbar" onSubmit={(e) => { e.preventDefault(); ask(draft) }}>
      <div className="field">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={mode === 'room' ? '' : '聊点什么吧…'}
          disabled={busy}
          enterKeyHint="send"
          autoComplete="off"
        />
        <span className="input-gallery" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="10" r="1.6" fill="currentColor" />
            <path d="M4.5 17.5l4.8-4.6 3.4 3.2 2.9-2.6 4 3.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>
        <SendButton disabled={busy || !draft.trim()} />
      </div>
    </form>
  )

  const introPending = seedRevealCount >= 3
    && !msgs.some((m) => m.from === 'user' || m.from === 'card')

  const roomQuick = !busy && seedRevealCount >= 3 && (
    <div className="suggestions chat-quick room-quick">
      {introPending ? (
        <button
          type="button"
          className="suggestion suggestion-ic"
          onClick={() => ask('好啊')}
        >
          <span>好啊</span>
        </button>
      ) : (
        QUICK_PROMPTS.slice(0, 3).map((p) => (
          <button
            key={p.label}
            type="button"
            className="suggestion suggestion-ic"
            onClick={() => ask(p.text)}
          >
            <span>{p.label}</span>
          </button>
        ))
      )}
    </div>
  )

  const composer = (
    <>
      {roomQuick}
      {composerInput}
    </>
  )

  return (
    <div
      className={`screen ${mode === 'text' ? 'scene-chat' : 'scene-voice room-screen'}${mode === 'room' ? ' room-screen--solo' : ''}${mode === 'room' && roomVoice ? ' room-screen--voice' : ''}${mode === 'listen' ? ' is-listen' : ''}`}
      style={mode === 'text' ? undefined : roomVars(theme)}
    >
      {mode === 'room' && <RoomScene variant="solo" />}

      <div className="topbar chat-topbar">
        <BackButton onClick={mode === 'listen' ? () => switchMode('room') : back} />
        <div className="chat-top-center">
          <div className="topbar-title">{flameName}</div>
          <div className="chat-top-sub">
            {mode === 'text' ? (busy ? '正在想…' : '偷吃零食小饼干中…') : (mode === 'room' ? '在房间里' : voiceStatus)}
          </div>
        </div>
        {SHOW_MODE_SWITCH && mode !== 'listen' && (
          <button
            type="button"
            className="chat-mode-btn"
            onClick={() => switchMode(mode === 'text' ? 'room' : 'text')}
            aria-label={mode === 'text' ? '回到房间' : '气泡聊天'}
          >
            {mode === 'text' ? (
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <rect x="9" y="4.5" width="6" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M7 12.5a5 5 0 0 0 10 0M12 17.5v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path d="M5 6.5h14v9.5H9l-4 3v-3H5V6.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M8.5 10.5h7M8.5 13.5h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}
      </div>

      {mode === 'room' && (
        <>
          {/* 左上角：打字/语音模式切换 + 语音时的字幕开关 */}
          <div className="room-pills">
            <button type="button" className={`room-pill${roomVoice ? ' room-pill-voice' : ''}`} onClick={toggleRoomVoice}>
              {roomVoice ? (
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                  <path d="M12 2.5a3.4 3.4 0 0 0-3.4 3.4v5.8a3.4 3.4 0 1 0 6.8 0V5.9A3.4 3.4 0 0 0 12 2.5Z" fill="currentColor" />
                  <path d="M5.8 11.4a1 1 0 0 1 2 0 4.2 4.2 0 0 0 8.4 0 1 1 0 1 1 2 0 6.2 6.2 0 0 1-5.2 6.12V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.48A6.2 6.2 0 0 1 5.8 11.4Z" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
                  <path d="M6 6.5h12M12 6.5V18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
              <span>{roomVoice ? '语音模式' : '打字模式'}</span>
            </button>
            {roomVoice && (
              <button
                type="button"
                className={`room-pill room-pill-caps${caps ? ' on' : ''}`}
                onClick={() => setCaps(!caps)}
              >
                <i className="caps-dot" />
                <span>字幕{caps ? '开' : '关'}</span>
              </button>
            )}
          </div>

          {/* 房间空间：色块跟着精灵，气泡贴在身边 */}
          <div className="room-space">
            <RoomBlobs variant="solo" />
            {(showCaps || latestCardPerson) && (
              <div className="float-bots-window">
                <div className="float-bots">
                  {showCaps && (busy || (listening && partial)) && (
                    <span className="float-bubble float-bot float-thinking">
                      {listening && partial ? partial : '…'}
                    </span>
                  )}
                  {floatStack.map((m) => {
                    if (m.from === 'card') {
                      const person = findContact(profile, m.personId)
                      if (!person) return null
                      return (
                        <div
                          key={m.id}
                          ref={recLiftRef}
                          className={`room-rec${expandedId === person.id ? ' is-opening' : ''}`}
                        >
                          {renderMiniCard(person)}
                        </div>
                      )
                    }
                    if (!showCaps) return null
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`float-bubble float-bot${openFloatId === m.id ? ' open' : ''}`}
                        onClick={() => setOpenFloatId(openFloatId === m.id ? null : m.id)}
                      >
                        <span className="sb-text">{m.text}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className={`room-monster${talking || busy ? ' is-talking' : ''}${listening ? ' is-listening' : ''}`} aria-hidden>
              <img src={monsterSvg} alt="" draggable={false} />
            </div>

            {showCaps && userFloat && (
              <span className="float-bubble float-user" key={userFloat.id}>{userFloat.text}</span>
            )}

          </div>

          {roomVoice ? (
            <div className="room-voicebar">
              <button
                type="button"
                className={`voice-mic room-mic${listening ? ' on' : ''}`}
                disabled={busy}
                onClick={onRoomMicClick}
                aria-label={listening ? '点击结束并发送' : '点击语音'}
              >
                <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
                  <path d="M12 2.5a3.4 3.4 0 0 0-3.4 3.4v5.8a3.4 3.4 0 1 0 6.8 0V5.9A3.4 3.4 0 0 0 12 2.5Z" fill="currentColor" />
                  <path d="M5.8 11.4a1 1 0 0 1 2 0 4.2 4.2 0 0 0 8.4 0 1 1 0 1 1 2 0 6.2 6.2 0 0 1-5.2 6.12V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.48A6.2 6.2 0 0 1 5.8 11.4Z" fill="currentColor" />
                </svg>
              </button>
              <span className="room-mic-status" aria-live="polite">
                {micHint || (listening ? '正在听 · 点击发送' : talking ? '正在回应…' : busy ? '正在想…' : '点击语音')}
              </span>
            </div>
          ) : composer}
        </>
      )}

      {mode === 'listen' && (
        <>
          <div className="voice-stage">
            <div className="voice-floor" aria-hidden />
            <div
              className={[
                'voice-agent',
                listening ? 'is-listening' : '',
                talking || busy ? 'is-talking' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="voice-ring" aria-hidden />
              <img className="heal-splash" src={splashSvg} alt="" draggable={false} />
              <span className="heal-flagpole" aria-hidden>
                <img className="heal-flag" src={flagSvg} alt="" draggable={false} />
              </span>
              <img className="heal-monster" src={monsterSvg} alt="" draggable={false} />
            </div>
            {!!voiceCaption && (
              <p className={`voice-caption${listening ? ' live' : ''}`}>{voiceCaption}</p>
            )}
          </div>
          <div className="voice-dock voice-dock-listen">
            <p className="voice-hint">{micHint || (canListen() ? '按住说话' : '这台设备听不到，返回打字')}</p>
            <button
              type="button"
              className={`voice-mic${listening ? ' on' : ''}`}
              disabled={busy}
              onPointerDown={onMicDown}
              onPointerUp={onMicUp}
              onPointerCancel={onMicUp}
              aria-label="按住说话"
            >
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
                <rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M6.5 12.5a5.5 5.5 0 0 0 11 0M12 18v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </>
      )}

      {mode === 'text' && (
        <>
          {thread}
          {composer}
        </>
      )}

      {expanded && (
        <div
          ref={overlayRef}
          className={`bigcard-overlay${cardOrigin ? ' is-morph' : ''}${celebrating ? ' is-celebrating' : ''}`}
          onClick={(e) => { if (e.target === e.currentTarget && !celebrating) closeBig() }}
        >
          <div className={`bigcard${celebrating ? ' is-celebrating' : ''}`} ref={bigRef}>
            <div className="bigcard-name">{expanded.name}</div>
            <div className="bigcard-avatar">
              {expanded.photo
                ? <img src={expanded.photo} alt="" draggable={false} />
                : <span>{(expanded.name || '?').slice(0, 1)}</span>}
            </div>
            <p className="bigcard-bio">{expanded.name} 是一个{expanded.intro || expanded.bio}。</p>
            <div className="bigcard-tags">
              {(expanded.tags || []).map((t) => (
                <span key={t.label} className="bigcard-tag" style={{ background: t.color || '#78909c' }}>
                  {t.label}
                </span>
              ))}
              {(expanded.plainTags || []).map((t) => (
                <span key={t} className="bigcard-tag bigcard-tag--plain">{t}</span>
              ))}
            </div>
            <button
              type="button"
              className={`bigcard-cta${introSent || celebrating ? ' sent' : ''}`}
              onClick={confirmMeet}
              disabled={introSent || celebrating}
            >
              <span className="bigcard-cta-label">{celebrating || introSent ? '已打卡' : '认识一下'}</span>
            </button>
            {celebrating && (
              <div className="bigcard-stamp" aria-hidden>
                <i className="bigcard-spark bigcard-spark--a" />
                <i className="bigcard-spark bigcard-spark--b" />
                <i className="bigcard-spark bigcard-spark--c" />
                <i className="bigcard-spark bigcard-spark--d" />
                <span className="bigcard-check">
                  <svg viewBox="0 0 24 24" width="36" height="36">
                    <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            )}
          </div>
          {!celebrating && (
          <button type="button" className="bigcard-close" onClick={closeBig} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
              <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          )}
        </div>
      )}
    </div>
  )
}
