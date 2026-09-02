import BackButton from '../components/BackButton.jsx'
import { agentNameOf, fragmentById } from '../data/social.js'

export default function FragmentDiary({ profile, fragmentId, back }) {
  const frag = fragmentById(profile, fragmentId)
  const agent = agentNameOf(profile)

  if (!frag) {
    return (
      <div className="screen">
        <div className="topbar">
          <BackButton onClick={back} />
          <div className="topbar-title">过往碎片</div>
        </div>
        <p className="nc-empty" style={{ padding: 24 }}>找不到这条碎片。</p>
      </div>
    )
  }

  const dateLabel = frag.date.replace(/-/g, '/')

  return (
    <div className="screen">
      <div className="topbar">
        <BackButton onClick={back} />
        <div className="topbar-title">{agent}的日记</div>
      </div>

      <div className="diary-body">
        <div className="diary-meta">
          <span className="diary-date">{dateLabel}</span>
        </div>
        <h1 className="diary-title">{frag.title}</h1>
        <blockquote className="diary-quote">
          <span className="q q-open" aria-hidden>“</span>
          {frag.quote}
          <span className="q q-close" aria-hidden>”</span>
        </blockquote>

        <div className="diary-text">
          {(frag.body || []).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  )
}
