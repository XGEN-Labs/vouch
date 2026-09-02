import { useEffect, useRef, useState } from 'react'
import monsterSvg from '../assets/healing/monster.svg'
import monsterClosedSvg from '../assets/healing/monster-closed.svg'
import splashSvg from '../assets/healing/splash.svg'
import DateWheel from '../components/DateWheel.jsx'
import SendButton from '../components/SendButton.jsx'
import HourPicker from '../components/HourPicker.jsx'
import BirthTimePicker from '../components/BirthTimePicker.jsx'
import BackButton from '../components/BackButton.jsx'
import BaziElementChart from '../components/BaziElementChart.jsx'
import { computeBazi } from '../bazi.js'
import { computeAstro } from '../astro.js'
import { toReading, phaseReading, teaserFor } from '../data/persona.js'
import { toAstroReading, astroTeaser, astroPhaseReading } from '../data/astroPersona.js'
import { generateReading, generatePhase, generateAstroReading, generateAstroPhase, enrichGuardianProfile } from '../lib/llm.js'
import { matchGuardian, applyGuardianName } from '../lib/guardianSpirit.js'
import { startFireCrackle } from '../lib/bgm.js'
import { buildFrankProfile } from '../data/demoFrank.js'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function cloneData(d) {
  try { return JSON.parse(JSON.stringify(d)) } catch { return { ...d } }
}

export default function Onboarding({ onDone, onBgVariant }) {
  const [msgs, setMsgs] = useState([])
  const [flameState, setFlameState] = useState('orb') // orb | sign | flame | waking | awake | creature
  const [scene, setScene] = useState('awaken') // awaken | reading | meet | named
  const [inputMode, setInputMode] = useState(null)
  const [suggestionKind, setSuggestionKind] = useState(null)
  const [draft, setDraft] = useState('')
  const [readCards, setReadCards] = useState([]) // [{key,title,body}]
  const [readIdx, setReadIdx] = useState(0)
  const [signId, setSignId] = useState('leo')
  const [agentName, setAgentName] = useState('')
  const [canBack, setCanBack] = useState(false)
  const [pickerKey, setPickerKey] = useState(0)
  const scrollRef = useRef(null)
  const dataRef = useRef({
    unlocked: ['bazi'],
    activeSystem: 'bazi',
    systemChoice: 'bazi',
    birthday: { y: 2000, m: 1, d: 1 },
  })
  const started = useRef(false)
  const touchX = useRef(0)
  const msgsRef = useRef([])
  const historyRef = useRef([])
  const cacheRef = useRef({ reading: {}, phase: {} })
  const seqRef = useRef(0)
  const uiRef = useRef({})

  const push = (m) => setMsgs(prev => {
    const next = [...prev, { id: prev.length + '-' + Math.random(), ...m }]
    msgsRef.current = next
    return next
  })
  const wantsBazi = () => dataRef.current.unlocked.includes('bazi')
  const wantsAstro = () => dataRef.current.unlocked.includes('astro')

  const setFlame = (s) => {
    setFlameState(s)
    if (s === 'orb') onBgVariant?.('orb')
    else onBgVariant?.('default')
  }

  const nextSeq = () => {
    seqRef.current += 1
    return seqRef.current
  }
  const alive = (seq) => seqRef.current === seq

  const botLines = async (lines, opts = {}, seq) => {
    for (const t of lines) {
      await sleep(opts.fast ? 420 : 720)
      if (seq != null && !alive(seq)) return false
      push({ from: 'bot', text: t, dim: opts.dim })
    }
    return true
  }

  // 同步最新 UI，供历史快照
  uiRef.current = {
    msgs, scene, flameState, inputMode, suggestionKind, draft,
    readCards, readIdx, signId, agentName,
  }
  useEffect(() => { msgsRef.current = msgs }, [msgs])

  const capture = (overrides = {}) => {
    const ui = uiRef.current
    return {
      msgs: cloneData(overrides.msgs ?? msgsRef.current),
      scene: overrides.scene ?? ui.scene,
      flameState: overrides.flameState ?? ui.flameState,
      inputMode: overrides.inputMode ?? ui.inputMode,
      suggestionKind: overrides.suggestionKind ?? ui.suggestionKind,
      draft: overrides.draft ?? ui.draft,
      readCards: cloneData(overrides.readCards ?? ui.readCards),
      readIdx: overrides.readIdx ?? ui.readIdx,
      signId: overrides.signId ?? ui.signId,
      agentName: overrides.agentName ?? ui.agentName,
      data: cloneData(overrides.data ?? dataRef.current),
    }
  }

  const pushHistory = (overrides = {}) => {
    historyRef.current.push(capture(overrides))
    setCanBack(true)
  }

  const restoreSnapshot = (snap) => {
    dataRef.current = cloneData(snap.data)
    msgsRef.current = snap.msgs || []
    setMsgs(snap.msgs || [])
    setScene(snap.scene || 'awaken')
    setFlameState(snap.flameState || 'orb')
    if (snap.flameState === 'orb') onBgVariant?.('orb')
    else onBgVariant?.('default')
    setInputMode(snap.inputMode || null)
    setSuggestionKind(snap.suggestionKind || null)
    setDraft(snap.draft || '')
    setReadCards(snap.readCards || [])
    setReadIdx(snap.readIdx || 0)
    setSignId(snap.signId || 'leo')
    setAgentName(snap.agentName || '')
    setPickerKey((k) => k + 1)
  }

  const goBack = () => {
    if (!historyRef.current.length) return
    nextSeq() // 取消进行中的动画 / 请求写回
    const prev = historyRef.current.pop()
    setCanBack(historyRef.current.length > 0)
    restoreSnapshot(prev)
  }

  const readingFingerprint = () => {
    const d = dataRef.current
    const b = d.birthday || {}
    return JSON.stringify({
      unlocked: d.unlocked || [],
      y: b.y, m: b.m, d: b.d,
      hour: d.hour ?? '',
      minute: d.minute ?? 0,
      gender: d.gender || 'male',
      place: d.place || '',
    })
  }

  const phaseFingerprint = () => {
    const d = dataRef.current
    return JSON.stringify({
      reading: readingFingerprint(),
      userName: d.userName || '',
      flameName: d.activeSystem === 'astro'
        ? (d.astro?.flameName || '')
        : (d.flameName || ''),
      active: d.activeSystem || 'bazi',
    })
  }

  useEffect(() => {
    onBgVariant?.('default')
    return () => onBgVariant?.('default')
  }, [onBgVariant])

  useEffect(() => {
    const transcript = scrollRef.current
    if (!transcript) return
    if (scene === 'reading' && readCards.length) return
    transcript.scrollTo({ top: 1e6, behavior: 'smooth' })
  }, [msgs, suggestionKind, inputMode, readCards, readIdx, scene])

  useEffect(() => {
    if (started.current) return
    started.current = true
    const seq = nextSeq()
    ;(async () => {
      await sleep(400)
      if (!alive(seq)) return
      onBgVariant?.('orb')
      await sleep(900)
      if (!alive(seq)) return
      if (!await botLines(['我好像刚刚醒来…', '我还看不清你，你大概也看不清我。'], {}, seq)) return
      await sleep(500)
      if (!alive(seq)) return
      // 不再让用户选八字/星盘，直接走八字流程
      dataRef.current.systemChoice = 'bazi'
      dataRef.current.unlocked = ['bazi']
      dataRef.current.activeSystem = 'bazi'
      push({ from: 'bot', text: '你还记得你的生日吗…' })
      setInputMode('date')
    })()
  }, [onBgVariant])

  const submitDate = async (val) => {
    const m = String(val).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
    if (!m) return
    const [, y, mo, d] = m
    pushHistory({
      inputMode: 'date',
      suggestionKind: null,
      draft: '',
      data: { ...cloneData(dataRef.current), birthday: { y: +y, m: +mo, d: +d } },
    })
    const seq = nextSeq()
    dataRef.current.birthday = { y: +y, m: +mo, d: +d }
    setInputMode(null)
    setDraft('')
    push({ from: 'user', pill: true, text: `${y}/${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}` })
    if (!await botLines(['唔…有点记起来。'], {}, seq)) return
    await sleep(400)
    if (!alive(seq)) return
    if (wantsAstro()) {
      push({ from: 'bot', text: '那…出生时间呢？尽量精确到分钟，记不清也可以跳过。' })
      setInputMode('birthTime')
    } else {
      push({ from: 'bot', text: '那…出生的时辰呢？记不清也可以跳过。' })
      setInputMode('hour')
    }
  }

  const afterTimeKnown = async (known, seq) => {
    if (known) {
      if (!await botLines(['嗯，这一下清楚多了。'], {}, seq)) return
    } else if (!await botLines(['没关系。轮廓已经够亮了。'], {}, seq)) return
    await sleep(400)
    if (!alive(seq)) return
    if (wantsBazi()) {
      push({ from: 'bot', text: '你是…？' })
      setInputMode('gender')
      setSuggestionKind('gender')
    } else {
      dataRef.current.gender = 'male'
      push({ from: 'bot', text: '或许还记得你的出生地吗？' })
      setInputMode('place')
    }
  }

  const submitBirthTime = async (t) => {
    pushHistory({
      inputMode: 'birthTime',
      suggestionKind: null,
      draft: '',
      data: cloneData({
        ...dataRef.current,
        ...(t
          ? { hour: t.hour, minute: t.minute, hourLabel: t.label }
          : { hour: '', minute: 0, hourLabel: null }),
      }),
    })
    const seq = nextSeq()
    setInputMode(null)
    if (t) {
      dataRef.current.hour = t.hour
      dataRef.current.minute = t.minute
      dataRef.current.hourLabel = t.label
      push({ from: 'user', pill: true, text: t.label })
      await afterTimeKnown(true, seq)
    } else {
      dataRef.current.hour = ''
      dataRef.current.minute = 0
      dataRef.current.hourLabel = null
      push({ from: 'user', pill: true, text: '记不清了' })
      await afterTimeKnown(false, seq)
    }
  }

  const submitHour = async (shichen) => {
    pushHistory({
      inputMode: 'hour',
      suggestionKind: null,
      draft: '',
      data: cloneData({
        ...dataRef.current,
        hour: shichen ? shichen.hour : '',
        minute: 0,
        hourLabel: shichen ? shichen.label : null,
      }),
    })
    const seq = nextSeq()
    dataRef.current.hour = shichen ? shichen.hour : ''
    dataRef.current.minute = 0
    dataRef.current.hourLabel = shichen ? shichen.label : null
    setInputMode(null)
    if (shichen) {
      push({ from: 'user', pill: true, text: shichen.label })
      await afterTimeKnown(true, seq)
    } else {
      push({ from: 'user', pill: true, text: '记不清了' })
      await afterTimeKnown(false, seq)
    }
  }

  const submitGender = async (gender) => {
    pushHistory({
      inputMode: 'gender',
      suggestionKind: 'gender',
      draft: '',
      data: cloneData({ ...dataRef.current, gender }),
    })
    const seq = nextSeq()
    setSuggestionKind(null)
    dataRef.current.gender = gender
    setInputMode(null)
    push({ from: 'user', pill: true, text: gender === 'female' ? '女' : '男' })
    await sleep(400)
    if (!alive(seq)) return
    push({ from: 'bot', text: '或许还记得你的出生地吗？' })
    setInputMode('place')
  }

  const applyReadingResult = async (payload, seq, { fromCache }) => {
    dataRef.current.bazi = payload.bazi
    dataRef.current.astro = payload.astro
    dataRef.current.reading = payload.reading
    if (payload.guardian) dataRef.current.guardian = payload.guardian
    else if (payload.bazi && !dataRef.current.guardian?.baziIdentity) {
      dataRef.current.guardian = matchGuardian(payload.bazi)
    }
    if (payload.signId) setSignId(payload.signId)

    if (!fromCache) {
      await sleep(300)
      if (!alive(seq)) return
    }
    setMsgs([])
    msgsRef.current = []
    setSuggestionKind(null)
    setScene('reading')
    setReadCards(payload.cards)
    setReadIdx(0)

    const first = payload.cards[0]?.key || dataRef.current.activeSystem
    dataRef.current.activeSystem = first
    if (first === 'astro') setFlame('sign')
    else {
      setFlame('flame')
      startFireCrackle()
    }
    await sleep(fromCache ? 80 : 400)
    if (!alive(seq)) return
    setSuggestionKind('disbelief')
  }

  const runReading = async (place, seq) => {
    const b = dataRef.current.birthday
    const hour = dataRef.current.hour ?? ''
    const minute = dataRef.current.minute ?? 0
    const gender = dataRef.current.gender || 'male'
    dataRef.current.place = place

    const fp = readingFingerprint()
    const cached = cacheRef.current.reading[fp]
    if (cached) {
      await applyReadingResult(cached, seq, { fromCache: true })
      return
    }

    const cards = []
    const dual = wantsBazi() && wantsAstro()
    const complete = !dual
    let bazi = null
    let astro = null
    let reading = null
    let nextSign = signId

    if (wantsBazi()) {
      bazi = computeBazi({
        year: b.y, month: b.m, day: b.d, hour, minute, gender, place,
      })
      const base = toReading(bazi)
      const teaser = teaserFor(bazi)
      dataRef.current.bazi = bazi
      push({ from: 'bot', text: '解读中……', dim: true })
      try {
        reading = await generateReading({
          bazi, title: base.title, fallbackBody: base.body, teaser, complete,
        })
      } catch {
        reading = { title: base.title, body: base.body, teaser, source: 'template' }
      }
      if (!alive(seq)) return
      dataRef.current.reading = reading
      dataRef.current.guardian = matchGuardian(bazi)
      cards.push({ key: 'bazi', label: '八字', title: reading.title, body: reading.body, teaser })
    }

    if (wantsAstro()) {
      astro = computeAstro({ year: b.y, month: b.m, day: b.d, hour, minute, place })
      const base = toAstroReading(astro)
      const teaser = astroTeaser(astro)
      dataRef.current.astro = { ...astro }
      nextSign = astro.sunSign
      setSignId(astro.sunSign)
      if (!wantsBazi()) push({ from: 'bot', text: '解读中……', dim: true })
      try {
        const aReading = await generateAstroReading({
          astro, title: base.title, fallbackBody: base.body, teaser, complete,
        })
        astro = { ...astro, reading: aReading }
        if (!reading) reading = aReading
        cards.push({ key: 'astro', label: '星盘', title: aReading.title, body: aReading.body, teaser })
      } catch {
        const aReading = { title: base.title, body: base.body, teaser, source: 'template' }
        astro = { ...astro, reading: aReading }
        if (!reading) reading = aReading
        cards.push({ key: 'astro', label: '星盘', title: aReading.title, body: aReading.body, teaser })
      }
      if (!alive(seq)) return
      dataRef.current.astro = astro
    }

    if (!cards.length) {
      cards.push({
        key: 'bazi',
        label: '解读',
        title: '还在对光',
        body: ['我刚才晃了一下，先按你留下的轮廓说。', '光已经够亮了，我们慢慢对。'],
        teaser: '',
      })
    }

    const payload = {
      cards, bazi, astro, reading, signId: nextSign,
      guardian: dataRef.current.guardian || null,
    }
    cacheRef.current.reading[fp] = payload
    await applyReadingResult(payload, seq, { fromCache: false })
  }

  const submitPlace = async (val) => {
    const place = val.trim()
    if (!place) return
    pushHistory({
      inputMode: 'place',
      suggestionKind: null,
      draft: place,
      data: cloneData({ ...dataRef.current, place }),
    })
    const seq = nextSeq()
    dataRef.current.place = place
    setInputMode(null)
    push({ from: 'user', pill: true, text: place })

    const fp = readingFingerprint()
    if (cacheRef.current.reading[fp]) {
      await applyReadingResult(cacheRef.current.reading[fp], seq, { fromCache: true })
      return
    }

    if (!await botLines(['我在想。', '有些地方开始连起来了。'], {}, seq)) return
    await sleep(300)
    if (!alive(seq)) return
    await runReading(place, seq)
  }

  const syncVisualToCard = (i) => {
    const key = readCards[i]?.key
    if (!key) return
    dataRef.current.activeSystem = key
    if (key === 'astro') setFlame('sign')
    else {
      setFlame('flame')
      startFireCrackle()
    }
  }

  const afterDisbelief = async () => {
    pushHistory({
      scene: 'reading',
      suggestionKind: 'disbelief',
      inputMode: null,
      draft: '',
      readCards: cloneData(readCards),
      readIdx,
    })
    const seq = nextSeq()
    setSuggestionKind(null)
    if (readCards[readIdx]?.key) {
      dataRef.current.activeSystem = readCards[readIdx].key
    }
    setReadCards([])
    setReadIdx(0)
    setMsgs([])
    msgsRef.current = []
    setScene('meet')
    push({ from: 'user', text: '……你怎么知道' })
    await sleep(500)
    if (!alive(seq)) return
    push({ from: 'bot', text: '等等让我来见你…..', dim: true })
    await sleep(1400)
    if (!alive(seq)) return

    if (dataRef.current.activeSystem === 'astro') {
      setFlame('sign')
      await sleep(500)
      if (!alive(seq)) return
      push({ from: 'bot', text: '（星座的纹路亮起来…）', dim: true })
      await sleep(900)
      if (!alive(seq)) return
      setFlame('creature')
      startFireCrackle()
      await sleep(1400)
    } else {
      setFlame('waking')
      await sleep(600)
      if (!alive(seq)) return
      push({ from: 'bot', text: '（慢慢睁开眼睛…）', dim: true })
      await sleep(700)
      if (!alive(seq)) return
      setFlame('awake')
      await sleep(2000)
    }
    if (!alive(seq)) return
    push({ from: 'bot', text: '你叫什么名字？' })
    setInputMode('name')
  }

  const submitName = async (val) => {
    const name = val.trim()
    if (!name) return
    pushHistory({
      scene: 'meet',
      inputMode: 'name',
      suggestionKind: null,
      draft: name,
      data: cloneData({ ...dataRef.current, userName: name }),
    })
    const seq = nextSeq()
    dataRef.current.userName = name
    setInputMode(null)
    push({ from: 'user', pill: true, text: name })
    await sleep(500)
    if (!alive(seq)) return
    push({ from: 'bot', text: `${name}你好呀，我刚刚出生，还没有名字，你想给我取一个吗？` })
    const g = dataRef.current.guardian
    if (g?.name) {
      setDraft(g.name)
      setSuggestionKind('flameName')
    }
    setInputMode('flameName')
  }

  const applyPhaseResult = async (payload, seq, { fromCache }) => {
    dataRef.current.phase = payload.phase
    if (payload.phaseBazi) dataRef.current.phaseBazi = payload.phaseBazi
    if (payload.astro) dataRef.current.astro = payload.astro
    if (payload.flameName) dataRef.current.flameName = payload.flameName
    if (payload.guardian) dataRef.current.guardian = payload.guardian

    setMsgs([])
    msgsRef.current = []
    setSuggestionKind(null)
    setAgentName(payload.agentName)
    setScene('named')
    setFlame(payload.flameState)
    await sleep(fromCache ? 80 : 350)
    if (!alive(seq)) return

    if (!fromCache) {
      push({ from: 'bot', text: '让我看看你现在…', dim: true })
      await sleep(200)
      if (!alive(seq)) return
      setMsgs((m) => {
        const next = m.filter((x) => x.text !== '让我看看你现在…')
        msgsRef.current = next
        return next
      })
    }

    const ph = payload.phase
    if (!await botLines([ph.opener], {}, seq)) return
    await sleep(300)
    if (!alive(seq)) return
    if (!await botLines([ph.middle], {}, seq)) return
    await sleep(300)
    if (!alive(seq)) return
    setSuggestionKind('how')
  }

  const submitFlameName = async (val) => {
    const fname = val.trim()
    if (!fname) return
    const active = dataRef.current.activeSystem
    pushHistory({
      scene: 'meet',
      inputMode: 'flameName',
      suggestionKind: null,
      draft: fname,
      data: cloneData(dataRef.current),
    })
    const seq = nextSeq()
    setInputMode(null)
    push({ from: 'user', pill: true, text: fname })

    if (active === 'astro') {
      dataRef.current.astro = { ...dataRef.current.astro, flameName: fname }
    } else {
      dataRef.current.flameName = fname
      dataRef.current.guardian = applyGuardianName(dataRef.current.guardian, fname)
    }
    if (wantsAstro() && !dataRef.current.astro?.flameName) {
      dataRef.current.astro = {
        ...dataRef.current.astro,
        flameName: `${dataRef.current.astro?.sunSignCn || '星'}灵`,
      }
    }
    if (wantsBazi() && !dataRef.current.flameName) {
      dataRef.current.flameName = '小火苗'
    }

    const fp = phaseFingerprint()
    const cached = cacheRef.current.phase[fp]
    if (cached) {
      await sleep(200)
      if (!alive(seq)) return
      await applyPhaseResult(cached, seq, { fromCache: true })
      return
    }

    await sleep(700)
    if (!alive(seq)) return
    setMsgs([])
    msgsRef.current = []
    setSuggestionKind(null)
    setAgentName(fname)
    setScene('named')
    const flame = active === 'astro' ? 'creature' : 'awake'
    setFlame(flame)
    await sleep(350)
    if (!alive(seq)) return
    push({ from: 'bot', text: '让我看看你现在…', dim: true })

    let phase
    let astro = dataRef.current.astro
    if (active === 'astro') {
      const fallback = astroPhaseReading(dataRef.current.astro, fname)
      phase = await generateAstroPhase({
        astro: dataRef.current.astro,
        flameName: fname,
        fallback,
      })
      if (!alive(seq)) return
      astro = { ...dataRef.current.astro, phase }
      dataRef.current.astro = astro
      dataRef.current.phase = phase
    } else {
      const fallback = phaseReading(dataRef.current.bazi, fname)
      const [phaseRes, guardianRes] = await Promise.all([
        generatePhase({
          bazi: dataRef.current.bazi,
          flameName: fname,
          fallback,
          guardian: dataRef.current.guardian,
        }),
        dataRef.current.guardian
          ? enrichGuardianProfile({
            userBazi: dataRef.current.bazi,
            guardian: dataRef.current.guardian,
            flameName: fname,
          })
          : Promise.resolve(null),
      ])
      if (!alive(seq)) return
      phase = phaseRes
      dataRef.current.phase = phase
      if (guardianRes) dataRef.current.guardian = guardianRes
    }

    let phaseBazi = dataRef.current.phaseBazi
    if (wantsBazi() && active !== 'bazi' && dataRef.current.bazi) {
      phaseBazi = phaseReading(dataRef.current.bazi, dataRef.current.flameName)
      dataRef.current.phaseBazi = phaseBazi
    }
    if (wantsAstro() && active !== 'astro' && dataRef.current.astro) {
      const fb = astroPhaseReading(dataRef.current.astro, dataRef.current.astro.flameName)
      astro = { ...dataRef.current.astro, phase: dataRef.current.astro.phase || fb }
      dataRef.current.astro = astro
    }

    const payload = {
      phase,
      phaseBazi,
      astro,
      flameName: dataRef.current.flameName,
      guardian: dataRef.current.guardian,
      agentName: fname,
      flameState: flame,
    }
    cacheRef.current.phase[fp] = payload

    setMsgs((m) => {
      const next = m.filter((x) => x.text !== '让我看看你现在…')
      msgsRef.current = next
      return next
    })
    await sleep(200)
    if (!alive(seq)) return
    if (!await botLines([phase.opener], {}, seq)) return
    await sleep(300)
    if (!alive(seq)) return
    if (!await botLines([phase.middle], {}, seq)) return
    await sleep(300)
    if (!alive(seq)) return
    setSuggestionKind('how')
  }

  const afterHow = async () => {
    pushHistory({
      scene: 'named',
      suggestionKind: 'how',
      inputMode: null,
      draft: '',
      agentName,
    })
    const seq = nextSeq()
    setSuggestionKind(null)
    push({ from: 'user', text: '那怎么办呢' })
    await sleep(600)
    if (!alive(seq)) return
    if (!await botLines([dataRef.current.phase.advice], {}, seq)) return
    await sleep(400)
    if (!alive(seq)) return
    setSuggestionKind('remember')
  }

  const finish = () => {
    onDone({
      ...dataRef.current,
      unlocked: dataRef.current.unlocked,
      activeSystem: dataRef.current.activeSystem,
      systemChoice: dataRef.current.systemChoice,
    })
  }

  const skipOnboarding = () => {
    nextSeq()
    onDone(buildFrankProfile())
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

  const suggestions = (() => {
    switch (suggestionKind) {
      case 'gender':
        return [
          { label: '男', onPick: () => submitGender('male') },
          { label: '女', onPick: () => submitGender('female') },
        ]
      case 'disbelief':
        return [{ label: '……你怎么知道', onPick: afterDisbelief }]
      case 'how':
        return [{ label: '那怎么办呢', onPick: afterHow }]
      case 'remember':
        return [{ label: '好，我记住了', onPick: finish }]
      case 'flameName':
        return dataRef.current.guardian?.name
          ? [{ label: `就叫${dataRef.current.guardian.name}`, onPick: () => submitFlameName(dataRef.current.guardian.name) }]
          : []
      default:
        return []
    }
  })()

  const placeholder = {
    place: '你的出生地',
    name: '你的名字',
    flameName: dataRef.current.guardian?.name ? `就叫${dataRef.current.guardian.name}，或换一个` : '给我取个名字…',
  }[inputMode]

  const showAgent = flameState !== 'orb'
  const eyesClosed = flameState === 'flame' || flameState === 'sign' || flameState === 'waking'
  const agentSize = scene === 'reading' ? 150 : (scene === 'meet' || scene === 'named' ? 270 : 220)
  const card = readCards[readIdx]
  const showReadCards = scene === 'reading' && readCards.length > 1
  const showReadPlain = scene === 'reading' && readCards.length === 1 && card
  const bday = dataRef.current.birthday

  return (
    <div
      className={`screen onboard-screen scene-${scene}${showAgent ? '' : ' orb-phase'}${showReadPlain ? ' reading-plain' : ''}`}
    >
      <div className="topbar">
        {canBack ? <BackButton onClick={goBack} /> : null}
        <span className="logo">Vouch._.</span>
        <button type="button" className="skip-onboard" onClick={skipOnboarding}>
          跳过
        </button>
      </div>

      <div className={`flame-stage${showAgent ? '' : ' flame-stage-empty'}`}>
        {showAgent && (
          <div className={`ob-agent${eyesClosed ? '' : ' ob-opening'}`} style={{ width: agentSize }}>
            <img className="ob-splash" src={splashSvg} alt="" draggable={false} />
            <img
              className="ob-monster ob-monster-face"
              src={monsterClosedSvg}
              alt=""
              draggable={false}
              style={{ opacity: eyesClosed ? 1 : 0 }}
            />
            <img
              className="ob-monster ob-monster-face"
              src={monsterSvg}
              alt=""
              draggable={false}
              style={{ opacity: eyesClosed ? 0 : 1 }}
            />
          </div>
        )}
        {scene === 'named' && agentName && (
          <div className="agent-name-reveal">{agentName}</div>
        )}
      </div>

      {showReadCards && (
        <div
          className="read-swipe"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current
            if (dx < -40 && readIdx < readCards.length - 1) {
              const n = readIdx + 1
              setReadIdx(n)
              syncVisualToCard(n)
            }
            if (dx > 40 && readIdx > 0) {
              const n = readIdx - 1
              setReadIdx(n)
              syncVisualToCard(n)
            }
          }}
        >
          <div className="read-card">
            <div className="read-card-tag">{card.label}</div>
            <div className="reveal-title">{card.title}</div>
            {card.key === 'bazi' && <BaziElementChart bazi={dataRef.current.bazi} />}
            {card.body.map((line, i) => (
              <p key={i} className="read-card-p">{line}</p>
            ))}
          </div>
          <div className="dots agent-dots read-dots">
            {readCards.map((c, i) => (
              <i
                key={c.key}
                className={i === readIdx ? 'on' : ''}
                onClick={() => { setReadIdx(i); syncVisualToCard(i) }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="transcript" ref={scrollRef}>
        {showReadPlain && (
          <>
            <div className="reveal-title">{card.title}</div>
            {card.key === 'bazi' && <BaziElementChart bazi={dataRef.current.bazi} />}
            {card.body.map((line, i) => (
              <div key={i} className="msg bot fade-in">{line}</div>
            ))}
          </>
        )}
        {!showReadCards && !showReadPlain && msgs.map(m => {
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
          <DateWheel
            key={`date-${pickerKey}`}
            onConfirm={submitDate}
            initial={bday || { y: 2000, m: 1, d: 1 }}
          />
        </div>
      )}

      {inputMode === 'hour' && (
        <HourPicker
          key={`hour-${pickerKey}`}
          mode="bazi"
          onPick={submitHour}
          onSkip={() => submitHour(null)}
        />
      )}

      {inputMode === 'birthTime' && (
        <div className="date-entry">
          <BirthTimePicker
            key={`bt-${pickerKey}`}
            onConfirm={submitBirthTime}
            onSkip={() => submitBirthTime(null)}
            initial={{
              hour: typeof dataRef.current.hour === 'number' ? dataRef.current.hour : 12,
              minute: typeof dataRef.current.minute === 'number' ? dataRef.current.minute : 0,
            }}
          />
        </div>
      )}

      {inputMode && inputMode !== 'date' && inputMode !== 'hour' && inputMode !== 'birthTime' && (
        <form className="inputbar" onSubmit={onSubmit}>
          <div className="field">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              enterKeyHint="send"
              autoComplete="off"
            />
            <SendButton disabled={!draft.trim()} />
          </div>
        </form>
      )}
    </div>
  )
}
