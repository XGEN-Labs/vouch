import { useEffect, useRef, useState } from 'react'
import Flame from '../components/Flame.jsx'
import DateWheel from '../components/DateWheel.jsx'
import HourPicker from '../components/HourPicker.jsx'
import { computeBazi } from '../bazi.js'
import { toReading, phaseReading, teaserFor } from '../data/persona.js'
import { generateReading, generatePhase } from '../lib/llm.js'
import { startFireCrackle } from '../lib/bgm.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export default function Onboarding({ onDone, onBgVariant }) {
  const [msgs, setMsgs] = useState([])
  const [flameState, setFlameState] = useState('orb')
  // awaken | reading | meet | named
  const [scene, setScene] = useState('awaken')
  const [inputMode, setInputMode] = useState(null)   // date | hour | gender | place | name | flameName | null
  const [suggestions, setSuggestions] = useState([])
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)
  const dataRef = useRef({})
  const started = useRef(false)

  const push = (m) => setMsgs(prev => [...prev, { id: prev.length + '-' + Math.random(), ...m }])

  const setFlame = (s) => {
    setFlameState(s)
    if (s !== 'orb') onBgVariant?.('default')
  }

  const botLines = async (lines, opts = {}) => {
    for (const t of lines) {
      await sleep(opts.fast ? 420 : 720)
      push({ from: 'bot', text: t, dim: opts.dim })
    }
  }

  useEffect(() => {
    onBgVariant?.('default')
    return () => onBgVariant?.('default')
  }, [onBgVariant])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' })
  }, [msgs, suggestions, inputMode])

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      await sleep(400)
      onBgVariant?.('orb')
      await sleep(900)
      await botLines(['我好像刚刚醒来…', '我还看不清你，你大概也看不清我。'])
      await sleep(600)
      push({ from: 'bot', text: '你还记得你的生日吗…' })
      await sleep(800)
      setInputMode('date')
    })()
  }, [onBgVariant])

  const submitDate = async (val) => {
    const m = String(val).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
    if (!m) return
    const [, y, mo, d] = m
    dataRef.current.birthday = { y: +y, m: +mo, d: +d }
    setInputMode(null)
    setDraft('')
    push({ from: 'user', pill: true, text: `${y}/${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}` })
    await botLines(['唔…有点记起来。'])
    await sleep(400)
    push({ from: 'bot', text: '那…出生的时辰呢？记不清也可以跳过。' })
    setInputMode('hour')
  }

  const submitHour = async (shichen) => {
    // shichen: {label, hour} | null（跳过）
    dataRef.current.hour = shichen ? shichen.hour : ''
    dataRef.current.hourLabel = shichen ? shichen.label : null
    setInputMode(null)
    if (shichen) {
      push({ from: 'user', pill: true, text: shichen.label })
      await botLines(['嗯，这一下清楚多了。'])
    } else {
      push({ from: 'user', pill: true, text: '记不清了' })
      await botLines(['没关系。没有时辰，日主也够亮了。'])
    }
    await sleep(400)
    push({ from: 'bot', text: '你是…？' })
    setInputMode('gender')
    setSuggestions([
      { label: '男', onPick: () => submitGender('male') },
      { label: '女', onPick: () => submitGender('female') },
    ])
  }

  const submitGender = async (gender) => {
    setSuggestions([])
    dataRef.current.gender = gender
    setInputMode(null)
    push({ from: 'user', pill: true, text: gender === 'female' ? '女' : '男' })
    await sleep(400)
    push({ from: 'bot', text: '或许还记得你的出生地吗？' })
    setInputMode('place')
  }

  const runReading = async (place) => {
    const b = dataRef.current.birthday
    const hour = dataRef.current.hour ?? ''
    const gender = dataRef.current.gender || 'male'
    const bazi = computeBazi({
      year: b.y, month: b.m, day: b.d,
      hour,
      minute: 0,
      gender,
      place,
    })
    const base = toReading(bazi)
    dataRef.current.bazi = bazi
    dataRef.current.place = place

    const teaser = teaserFor(bazi)
    await botLines(['我在想。', '有些地方开始连起来了。'])
    await sleep(400)
    push({ from: 'bot', text: '等等…' })
    await sleep(600)
    push({ from: 'bot', text: teaser })
    await sleep(500)
    push({ from: 'bot', text: '解读中……', dim: true })

    const reading = await generateReading({
      bazi,
      title: base.title,
      fallbackBody: base.body,
      teaser,
    })
    dataRef.current.reading = reading

    await sleep(400)
    // 新页：解读（bazi-skill + 用户录入）
    setMsgs([])
    setSuggestions([])
    setScene('reading')
    setFlame('flame')
    startFireCrackle()
    await sleep(350)
    push({ from: 'reveal', text: reading.title })
    await botLines(reading.body, { fast: true })
    await sleep(300)
    setSuggestions([{ label: '……你怎么知道', onPick: afterDisbelief }])
  }

  const submitPlace = async (val) => {
    const place = val.trim()
    setInputMode(null)
    push({ from: 'user', pill: true, text: place })
    await runReading(place)
  }

  const afterDisbelief = async () => {
    setSuggestions([])
    push({ from: 'user', text: '……你怎么知道' })
    await sleep(500)
    push({ from: 'bot', text: '等等让我来见你…..', dim: true })
    await sleep(1400)
    setMsgs([])
    setSuggestions([])
    setScene('meet')
    setFlame('waking')
    await sleep(500)
    push({ from: 'bot', text: '（慢慢睁开眼睛…）', dim: true })
    await sleep(700)
    setFlame('awake')
    await sleep(1700)
    push({ from: 'bot', text: '你叫什么名字？' })
    setInputMode('name')
  }

  const submitName = async (val) => {
    const name = val.trim()
    dataRef.current.userName = name
    setInputMode(null)
    push({ from: 'user', pill: true, text: name })
    await sleep(500)
    push({ from: 'bot', text: `${name}你好呀，我刚刚出生，还没有名字，你想给我取一个吗？` })
    setInputMode('flameName')
  }

  const submitFlameName = async (val) => {
    const fname = val.trim()
    dataRef.current.flameName = fname
    setInputMode(null)
    push({ from: 'user', pill: true, text: fname })
    await sleep(700)
    setMsgs([])
    setSuggestions([])
    setScene('named')
    setFlame('awake')
    await sleep(350)
    push({ from: 'reveal', text: fname })
    push({ from: 'bot', text: '让我看看你现在…', dim: true })
    const fallback = phaseReading(dataRef.current.bazi, fname)
    const ph = await generatePhase({
      bazi: dataRef.current.bazi,
      flameName: fname,
      fallback,
    })
    dataRef.current.phase = ph
    // 清掉过渡句，只留名字 + 个性化三句
    setMsgs((m) => m.filter((x) => x.text !== '让我看看你现在…'))
    await sleep(200)
    await botLines([ph.opener])
    await sleep(300)
    await botLines([ph.middle])
    await sleep(300)
    setSuggestions([{ label: '那怎么办呢', onPick: afterHow }])
  }

  const afterHow = async () => {
    setSuggestions([])
    push({ from: 'user', text: '那怎么办呢' })
    await sleep(600)
    await botLines([dataRef.current.phase.advice])
    await sleep(400)
    setSuggestions([{ label: '好，我记住了', onPick: () => onDone(dataRef.current) }])
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const v = draft
    if (!v.trim()) return
    setDraft('')
    if (inputMode === 'place') submitPlace(v)
    else if (inputMode === 'name') submitName(v)
    else if (inputMode === 'flameName') submitFlameName(v)
  }

  const placeholder = {
    place: '你的出生地',
    name: '你的名字',
    flameName: '给我取个名字…'
  }[inputMode]

  const showFlame = flameState !== 'orb'
  const flameSize = scene === 'reading' || scene === 'meet' || scene === 'named' ? 270 : 220

  return (
    <div
      key={scene}
      className={`screen scene-${scene}${showFlame ? '' : ' orb-phase'}`}
    >
      <div className="topbar"><span className="logo">Vouch._.</span></div>

      <div className={`flame-stage${showFlame ? '' : ' flame-stage-empty'}`}>
        {showFlame && <Flame state={flameState} size={flameSize} />}
      </div>

      <div className="transcript" ref={scrollRef}>
        {msgs.map(m => {
          if (m.from === 'reveal') return <div key={m.id} className="reveal-title">{m.text}</div>
          if (m.from === 'user') return (
            <div key={m.id} className="msg user fade-in">
              {m.pill ? <span className="entry-pill">{m.text}</span> : <span className="bubble">{m.text}</span>}
            </div>
          )
          return <div key={m.id} className={`msg bot fade-in${m.dim ? ' dim' : ''}`}>{m.text}</div>
        })}
      </div>

      {suggestions.length > 0 && inputMode !== 'gender' && (
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="suggestion" onClick={s.onPick}>{s.label}</button>
          ))}
        </div>
      )}

      {inputMode === 'gender' && (
        <div className="suggestions gender-pick">
          {suggestions.map((s, i) => (
            <button key={i} className="suggestion" onClick={s.onPick}>{s.label}</button>
          ))}
        </div>
      )}

      {inputMode === 'date' && (
        <div className="date-entry">
          <DateWheel onConfirm={submitDate} />
        </div>
      )}

      {inputMode === 'hour' && (
        <HourPicker
          onPick={submitHour}
          onSkip={() => submitHour(null)}
        />
      )}

      {inputMode && inputMode !== 'date' && inputMode !== 'hour' && (
        <form className="inputbar" onSubmit={onSubmit}>
          <div className="field">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
            />
          </div>
        </form>
      )}
    </div>
  )
}
