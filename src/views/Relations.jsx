import { useState } from 'react'
import BackButton from '../components/BackButton.jsx'
import SendButton from '../components/SendButton.jsx'
import mascotScribble from '../assets/relations/mascot-scribble.svg'
import { galaxyLayout, knownContacts, MY_PHOTO } from '../data/social.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const QUICK_ASKS = [
  '谁适合约下周末玩桌游？',
  '我最近和谁走得最近？',
  '上次和我一起聊了很久摄影的是谁？',
]

export default function Relations({ profile, back, go }) {
  const nodes = galaxyLayout(knownContacts(profile))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  const ask = async (text) => {
    const v = text.trim()
    if (!v || busy) return
    setBusy(true)
    setDraft('')
    await sleep(420)
    let reply = '嗯，我在听。你想找谁，直接说名字也行。'
    const contacts = knownContacts(profile)
    const hit = contacts.find((c) => v.includes(c.name) || v.includes(c.name.split(' ')[0]))
    const fresh = contacts.find((c) => c.mutual && (c.chatVolume || 0) <= 1)
    if (hit) {
      reply = `${hit.name}现在离你${hit.chatVolume > 15 ? '很近' : '还有一点距离'}。点开那颗星，四个人一起聊。`
    } else if (/桌游|玩|约/.test(v)) {
      reply = 'Sora 是桌游收藏家，Momo 周末一般有空——要不先拉 Sora 一起聊聊？'
    } else if (/摄影|拍照/.test(v)) {
      reply = '是 Alex Wang——上次你们从胶片聊到构图，聊了快两个小时。她最近还在收藏徒步路线，可以约她边走边拍。'
    } else if (/走得最近|聊得最|最熟/.test(v)) {
      const top = [...contacts].sort((a, b) => (b.chatVolume || 0) - (a.chatVolume || 0))[0]
      reply = top ? `最近你和 ${top.name} 走得最近，星图上她离你也最近。` : '星图上还没有人。'
    } else if (/新的星|新星|那颗|远/.test(v)) {
      reply = fresh
        ? `那是 ${fresh.name} 的精灵——你们刚互相确认认识，还没正式聊过。点开打个招呼，聊起来她就会并入星系。`
        : '现在没有刚认识的新朋友，去问一问里看看推荐吧。'
    } else if (/谁|认识|星系|关系/.test(v)) {
      const names = contacts.map((c) => c.name).join('、') || '暂时还没有'
      reply = `此刻星图上有：${names}。`
    }
    setHint(reply)
    setBusy(false)
  }

  return (
    <div className="screen scene-relations">
      <div className="topbar">
        <BackButton onClick={back} />
        <div className="topbar-title">串门</div>
      </div>

      <div className="galaxy">
        <div className="galaxy-ring" />
        <div className="galaxy-core">
          <img src={MY_PHOTO} alt="我" draggable={false} />
        </div>
        {nodes.map((n) => (
          n.outpost ? (
            <button
              key={n.id}
              type="button"
              className="galaxy-node outpost"
              style={{
                left: `calc(50% + ${n.dx}px)`,
                top: `calc(44% + ${n.dy}px)`,
                width: n.size,
                height: n.size,
                marginLeft: -n.size / 2,
                marginTop: -n.size / 2,
              }}
              onClick={() => go('dm', { contactId: n.id })}
              aria-label={n.name}
            >
              {n.photo
                ? <img src={n.photo} alt="" draggable={false} />
                : <span>{n.name.slice(0, 1)}</span>}
            </button>
          ) : (
            <button
              key={n.id}
              type="button"
              className={`galaxy-node${n.badge > 0 ? ' has-unread' : ''}`}
              style={{
                left: `calc(50% + ${n.dx}px)`,
                top: `calc(44% + ${n.dy}px)`,
                width: n.size,
                height: n.size,
                '--node': n.avatarTone,
                marginLeft: -n.size / 2,
                marginTop: -n.size / 2,
              }}
              onClick={() => go('dm', { contactId: n.id })}
              aria-label={n.name}
            >
              {n.photo
                ? <img src={n.photo} alt="" draggable={false} />
                : <span>{n.name.slice(0, 1)}</span>}
              {n.badge > 0 && <i className="galaxy-badge">{n.badge}</i>}
            </button>
          )
        ))}
      </div>

      {!!hint && <p className="galaxy-hint">{hint}</p>}

      <div className="suggestions rel-quick">
        {QUICK_ASKS.map((q) => (
          <button key={q} type="button" className="suggestion" onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>

      <form
        className="inputbar rel-agent-bar"
        onSubmit={(e) => { e.preventDefault(); ask(draft) }}
      >
        <div className="field rel-field">
          <span className="rel-mascot" aria-hidden>
            <img src={mascotScribble} alt="" draggable={false} />
          </span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="你说谁比较适合约着下周末一起玩儿桌游？"
            enterKeyHint="send"
            disabled={busy}
          />
          <SendButton disabled={busy || !draft.trim()} />
        </div>
      </form>
    </div>
  )
}
