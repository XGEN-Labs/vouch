import { useEffect, useMemo, useRef, useState } from 'react'
import BackButton from '../components/BackButton.jsx'
import SendButton from '../components/SendButton.jsx'
import RoomScene, { RoomBlobs } from '../components/RoomScene.jsx'
import monsterAvatar from '../assets/healing/monster-avatar.svg'
import monsterSvg from '../assets/healing/monster.svg'
import userAvatar from '../assets/chat/user-avatar.svg'
import { agentNameOf, bumpChatVolume, captureChatFragment, clearBadge, findContact, fragmentsWith, MY_PHOTO } from '../data/social.js'
import { threadFor } from '../data/dmThreads.js'
import { groupRoomVariantFor } from '../data/groupRoomVariants.js'
import { roomVars } from './Chat.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const dmStore = {}

function fillTalk(text, names) {
  return String(text).replace(/\{(me|myAgent|peer|peerAgent)\}/g, (_, k) => names[k] || '')
}

function seedMsgs(contact, unreadCount, names) {
  const raw = threadFor(contact?.id) || [
    { speaker: 'myAgent', text: '房间已经开好了，打个招呼就行。' },
  ]
  const msgs = raw.map((m, i) => ({
    id: `${contact.id}-${i}`,
    ...m,
    text: fillTalk(m.text, names),
    reaction: m.reaction ? fillTalk(m.reaction, names) : m.reaction,
  }))
  return msgs
}

/**
 * 四人房间：我 / 我的 agent / 对方 / 对方的 agent。
 * 空间感版：每个人最新说的一句漂浮在自己身边；不同的人是不同颜色的房间。
 * speaker: me | myAgent | peer | peerAgent
 */
export default function DirectChat({ profile, setProfile, contactId, back, go }) {
  const contact = findContact(profile, contactId)
  const myAgent = agentNameOf(profile)
  const peerAgent = contact?.agentName || '对方精灵'
  const me = (profile?.userName || '我')
  const names = {
    me,
    myAgent,
    peer: (contact?.name || '对方').split(' ')[0],
    peerAgent,
  }
  const [msgs, setMsgs] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [showMem, setShowMem] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [caps, setCaps] = useState(true)
  const [visibleCount, setVisibleCount] = useState(0)
  const [bubbleStates, setBubbleStates] = useState({})
  const [turnCue, setTurnCue] = useState(null)
  const started = useRef(null)
  const bubbleTimers = useRef(new Map())
  const threadRef = useRef(null)

  const clearBubbleTimers = () => {
    for (const timers of bubbleTimers.current.values()) {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
    bubbleTimers.current.clear()
  }

  useEffect(() => () => clearBubbleTimers(), [])

  useEffect(() => {
    if (!contact || started.current === contact.id) return
    started.current = contact.id
    const unread = contact.badge || 0
    const canned = seedMsgs(contact, unread, names)
    const cached = dmStore[contact.id]
    const sameSeed = cached?.[0]?.text === canned[0]?.text
    const seeded = sameSeed ? cached : canned
    dmStore[contact.id] = seeded
    setMsgs(seeded)
    setVisibleCount(0)
    setTurnCue(null)
    setBubbleStates({})
    clearBubbleTimers()
    if (unread) setProfile?.((p) => clearBadge(p, contact.id))
  }, [contact, setProfile])

  // 每一轮先停顿、思考、打字，再把正式气泡放出来；读完后气泡会自己淡出。
  useEffect(() => {
    if (!contact || visibleCount >= msgs.length) return undefined
    const next = msgs[visibleCount]
    if (!next || next.speaker === 'divider') {
      setVisibleCount((count) => Math.min(count + 1, msgs.length))
      return undefined
    }

    const showMessage = () => {
      setTurnCue(null)
      setBubbleStates((current) => ({ ...current, [next.id]: 'visible' }))
      setVisibleCount((count) => Math.min(count + 1, msgs.length))

      const beginExit = window.setTimeout(() => {
        setBubbleStates((current) => (
          current[next.id] ? { ...current, [next.id]: 'leaving' } : current
        ))
        const finishExit = window.setTimeout(() => {
          setBubbleStates((current) => {
            if (!current[next.id]) return current
            const remaining = { ...current }
            delete remaining[next.id]
            return remaining
          })
          bubbleTimers.current.delete(next.id)
        }, 900)
        const stored = bubbleTimers.current.get(next.id) || []
        bubbleTimers.current.set(next.id, [...stored, finishExit])
      }, 6200)
      bubbleTimers.current.set(next.id, [beginExit])
    }

    if (next.instant) {
      const instantTimer = window.setTimeout(showMessage, 120)
      return () => window.clearTimeout(instantTimer)
    }

    const pause = visibleCount === 0 ? 1150 : 1850
    const thinkFor = 1050
    const typeFor = Math.min(3000, 1450 + next.text.length * 24)
    const thinkingTimer = window.setTimeout(() => {
      setTurnCue({ speaker: next.speaker, phase: 'thinking', id: next.id })
    }, pause)
    const typingTimer = window.setTimeout(() => {
      setTurnCue({ speaker: next.speaker, phase: 'typing', id: next.id })
    }, pause + thinkFor)
    const revealTimer = window.setTimeout(showMessage, pause + thinkFor + typeFor)

    return () => {
      window.clearTimeout(thinkingTimer)
      window.clearTimeout(typingTimer)
      window.clearTimeout(revealTimer)
    }
  }, [contact, msgs.length, visibleCount])

  // 每个人最新的一句话，挂在各自身边
  const latestBy = useMemo(() => {
    const out = {}
    for (const m of msgs.slice(0, visibleCount)) {
      if (m.speaker === 'divider') continue
      if (!bubbleStates[m.id]) continue
      out[m.speaker] = m
    }
    return out
  }, [bubbleStates, msgs, visibleCount])

  const send = async () => {
    const v = draft.trim()
    if (!v || busy || !contact) return
    setBusy(true)
    setDraft('')
    setMsgs((m) => {
      const next = [...m, { id: `${Date.now()}-me`, speaker: 'me', text: v, instant: true }]
      if (contact) dmStore[contact.id] = next
      return next
    })
    setProfile?.((p) => captureChatFragment(bumpChatVolume(p, contact.id, 1), contact, v))

    await sleep(450)
    setMsgs((m) => {
      const next = [...m, {
        id: `${Date.now()}-ma`,
        speaker: 'myAgent',
        text: `我帮你把话递过去——「${v.slice(0, 24)}${v.length > 24 ? '…' : ''}」`,
      }]
      dmStore[contact.id] = next
      return next
    })
    await sleep(700)
    setMsgs((m) => {
      const next = [...m, {
        id: `${Date.now()}-pa`,
        speaker: 'peerAgent',
        text: `${contact.name}听完了，我让${contact.name.split(' ')[0]}自己回一句。`,
      }]
      dmStore[contact.id] = next
      return next
    })
    await sleep(650)
    const replies = [
      '哈哈有意思，继续说。',
      '我也刚好在想类似的事。',
      '周末有空的话，可以再聊深一点。',
      '你的 agent 说话好温柔。',
    ]
    setMsgs((m) => {
      const next = [...m, {
        id: `${Date.now()}-p`,
        speaker: 'peer',
        text: replies[Math.floor(Math.random() * replies.length)],
      }]
      dmStore[contact.id] = next
      return next
    })
    setProfile?.((p) => bumpChatVolume(p, contact.id, 1))
    setBusy(false)
  }

  useEffect(() => {
    if (voiceOn) return
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [busy, msgs, voiceOn])

  if (!contact) {
    return (
      <div className="screen scene-chat">
        <div className="topbar">
          <BackButton onClick={back} />
          <div className="topbar-title">私聊</div>
        </div>
        <p className="nc-empty" style={{ padding: 24 }}>找不到这个人。</p>
      </div>
    )
  }

  const roomVariant = groupRoomVariantFor(contact.id)
  const theme = roomVariant.theme
  const showCaps = !voiceOn || caps

  const avatars = {
    me: MY_PHOTO || userAvatar,
    myAgent: monsterAvatar,
    peer: contact.photo || userAvatar,
    peerAgent: roomVariant.peerAgent,
  }

  const bubbleOf = (speaker, extra = '') => {
    const m = latestBy[speaker]
    const cue = turnCue?.speaker === speaker ? turnCue : null
    if ((!m && !cue) || !showCaps) return null
    const stateClass = cue ? `is-${cue.phase}` : (bubbleStates[m.id] === 'leaving' ? 'is-leaving' : 'is-visible')
    return (
      <span
        key={cue ? `${cue.id}-${cue.phase}` : m.id}
        className={`float-bubble gp-bubble gp-bubble--${speaker} ${stateClass} ${extra}`}
        aria-label={cue ? `${names[speaker]}${cue.phase === 'thinking' ? '正在思考' : '正在输入'}` : undefined}
      >
        {cue ? (
          <span className={`gp-cue-dots gp-cue-dots--${cue.phase}`} aria-hidden>
            <i /><i /><i />
          </span>
        ) : m.text}
      </span>
    )
  }

  return (
    <div
      className={`screen scene-voice room-screen room-screen--group group-layout--${roomVariant.id} group-agent--${roomVariant.peerAgentShape}${voiceOn ? '' : ' group-text'}`}
      style={roomVars(theme)}
      data-room-variant={roomVariant.id}
    >
      <RoomScene variant="group" />

      <div className="topbar chat-topbar">
        <BackButton onClick={back} />
        <div className="chat-top-center">
          <div className="topbar-title dm-title">{contact.name}</div>
          <div className="chat-top-sub">
            {turnCue
              ? `${names[turnCue.speaker]}${turnCue.phase === 'thinking' ? '正在想…' : '正在输入…'}`
              : (busy ? '正在回复…' : `4人在${myAgent}的房间里聊天`)}
          </div>
        </div>
        <button type="button" className="dm-info" aria-label="关于你们的记忆碎片" onClick={() => setShowMem(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <rect x="5" y="4" width="14" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="room-pills">
        <button type="button" className={`room-pill${voiceOn ? ' room-pill-voice' : ''}`} onClick={() => setVoiceOn(!voiceOn)}>
          {voiceOn ? (
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
              <rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M6.5 12.5a5.5 5.5 0 0 0 11 0M12 18v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
              <path d="M6 6.5h12M12 6.5V18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          )}
          <span>{voiceOn ? '语音模式' : '打字模式'}</span>
        </button>
        {voiceOn && (
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

      {/* 四个人聚在奶油色块上：左上我的精灵、右上对方精灵、左下对方、右下我 */}
      <div className="room-space group-space">
        <div className="group-stage">
          <RoomBlobs variant="group" />

          <div className="gp gp--my-agent">
            {voiceOn && bubbleOf('myAgent')}
            <img className="gp-monster gp-monster--mine" src={monsterSvg} alt="" draggable={false} />
            <span className="gp-name">{myAgent}</span>
          </div>
          <div className="gp gp--peer-agent">
            {voiceOn && bubbleOf('peerAgent')}
            <img
              className={`gp-monster gp-monster--peer gp-monster--${roomVariant.peerAgentShape}`}
              src={roomVariant.peerAgent}
              alt=""
              draggable={false}
            />
            <span className="gp-name">{peerAgent}</span>
          </div>

          <div className="gp gp--peer">
            {voiceOn && bubbleOf('peer')}
            <img className="gp-photo" src={contact.photo || userAvatar} alt="" draggable={false} />
            <span className="gp-name">{names.peer}</span>
          </div>
          <div className="gp gp--me">
            {voiceOn && bubbleOf('me')}
            <img className="gp-photo" src={MY_PHOTO || userAvatar} alt="" draggable={false} />
            <span className="gp-name">{me}</span>
          </div>
        </div>

        {!voiceOn && (
          <>
            <div className="group-dim" aria-hidden />
            <div className="transcript chat-thread group-thread" ref={threadRef}>
              <div className="group-thread-spacer" aria-hidden />
              {msgs.map((m) => {
                if (m.speaker === 'divider') return null
                const mineSide = m.speaker === 'me' || m.speaker === 'myAgent'
                return (
                  <div key={m.id} className={`msg dm-msg fade-in speaker-${m.speaker}${mineSide ? ' group-mine' : ''}${m.speaker === 'me' ? ' user' : ''}`}>
                    <img
                      className={`chat-ava dm-avatar-img${m.speaker === 'myAgent' || m.speaker === 'peerAgent' ? ' agent-ava' : ''}${m.speaker === 'myAgent' ? ' agent-ava--mine' : ''}`}
                      src={avatars[m.speaker]}
                      alt=""
                      draggable={false}
                    />
                    <div className="dm-message-content">
                      {m.speaker !== 'me' && <span className="gp-who">{names[m.speaker]}</span>}
                      <span className="bubble">{m.text}</span>
                    </div>
                  </div>
                )
              })}
              {busy && (
                <div className="msg dm-msg fade-in dim speaker-myAgent group-mine">
                  <img className="chat-ava dm-avatar-img agent-ava agent-ava--mine" src={avatars.myAgent} alt="" draggable={false} />
                  <div className="dm-message-content">
                    <span className="gp-who">{myAgent}</span>
                    <span className="bubble">…</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {voiceOn ? (
        <div className="room-voicebar group-voicebar">
          <span className="voice-wave" aria-hidden>
            <i /><i /><i /><i /><i />
          </span>
          <p className="voice-hint">语音中</p>
        </div>
      ) : (
        <form className="inputbar chat-inputbar room-inputbar" onSubmit={(e) => { e.preventDefault(); send() }}>
          <div className="field">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="四个人的房间里，说点什么…"
              enterKeyHint="send"
              disabled={busy}
            />
            <span className="input-gallery" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <rect x="3.5" y="4" width="17" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="9" cy="9" r="1.6" fill="currentColor" />
                <path d="M5.5 17l4.2-4 3.1 2.8 2.2-2 3.5 3.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <SendButton disabled={busy || !draft.trim()} />
          </div>
        </form>
      )}

      {showMem && (
        <PairMemorySheet
          profile={profile}
          contact={contact}
          myAgent={myAgent}
          names={names}
          onClose={() => setShowMem(false)}
          onOpen={(id) => {
            setShowMem(false)
            go?.('fragment', { fragmentId: id, from: 'dm', contactId: contact.id })
          }}
        />
      )}
    </div>
  )
}

function PairMemorySheet({ profile, contact, myAgent, names, onClose, onOpen }) {
  const peer = names.peer
  const frags = fragmentsWith(profile, contact.id)
  return (
    <div className="dm-mem">
      <div className="topbar dm-mem-topbar">
        <BackButton onClick={onClose} />
        <div className="topbar-title">关于你们</div>
      </div>
      <div className="dm-mem-intro">
        <img className="chat-ava agent-ava agent-ava--mine dm-mem-ava" src={monsterAvatar} alt="" draggable={false} />
        <div className="dm-mem-intro-copy">
          <span className="dm-mem-kicker">{peer} · {frags.length} 个共同碎片</span>
          <p>
            我是{myAgent}。这些是我帮你收着的、和 {peer} 有关的碎片。聊出新的，也会并进你自己的记忆里。
          </p>
        </div>
      </div>
      <div className="dm-mem-list">
        {frags.length === 0 && (
          <p className="nc-empty">你们才刚认识，碎片还很少。再聊几句，我会帮你记下。</p>
        )}
        {frags.map((f) => (
          <button
            key={f.id}
            type="button"
            className="frag-day-item dm-mem-card"
            style={{ '--memory-accent': f.tagColor || '#7F9C91' }}
            onClick={() => onOpen(f.id)}
          >
            <span className="frag-day-main">
              <span className="dm-mem-card-head">
                <span className="frag-day-date">
                  <i className="frag-day-dot" />
                  {(f.date || '').replace(/-/g, ' / ')}
                </span>
                {!!f.tag && <span className="frag-day-tag">{f.tag}</span>}
              </span>
              <span className="frag-day-title">{f.title}</span>
              <span className="dm-mem-summary">{f.summary || f.quote}</span>
            </span>
            <i className="dm-mem-open-arrow" aria-hidden>↗</i>
          </button>
        ))}
        {frags.length > 0 && (
          <div className="dm-mem-end" aria-hidden>
            <i />
            <span>聊出的新片段会继续落在这里</span>
            <i />
          </div>
        )}
      </div>
    </div>
  )
}
