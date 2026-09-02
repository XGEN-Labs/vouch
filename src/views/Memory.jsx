import { useMemo, useState } from 'react'
import BackButton from '../components/BackButton.jsx'
import { fragmentsOnDate } from '../data/social.js'

function monthMatrix(year, month) {
  // month 1-12
  const first = new Date(year, month - 1, 1)
  const start = (first.getDay() + 6) % 7 // Mon=0
  const days = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < start; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  return cells
}

// 标签像有重力一样堆在框底：第一排贴地，后面的叠在上面
const CLOUD_SLOTS = [
  { left: '5%', bottom: 10, rot: -5 },
  { left: '30%', bottom: 12, rot: 3 },
  { left: '56%', bottom: 9, rot: -2 },
  { left: '78%', bottom: 13, rot: 7 },
  { left: '13%', bottom: 44, rot: 8 },
  { left: '44%', bottom: 46, rot: -6 },
  { left: '68%', bottom: 43, rot: 4 },
  { left: '32%', bottom: 78, rot: -9 },
]

export default function Memory({ profile, back, go }) {
  const now = new Date()
  const [y, setY] = useState(2026)
  const [m, setM] = useState(8)
  const [picked, setPicked] = useState(16)
  const tags = profile?.tags || []
  const cells = useMemo(() => monthMatrix(y, m), [y, m])
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(picked).padStart(2, '0')}`
  const dayFrags = fragmentsOnDate(profile, dateStr)
  // 有碎片的日子 → 用那天碎片的标签色画圈
  const marked = useMemo(() => {
    const map = new Map()
    for (const f of profile?.fragments || []) {
      const [fy, fm, fd] = f.date.split('-').map(Number)
      if (fy === y && fm === m) map.set(fd, f.tagColor || '#a5c99b')
    }
    return map
  }, [profile?.fragments, y, m])
  const isThisMonth = now.getFullYear() === y && now.getMonth() + 1 === m
  const today = isThisMonth ? now.getDate() : -1

  const shiftMonth = (dir) => {
    let nm = m + dir
    let ny = y
    if (nm < 1) { nm = 12; ny -= 1 }
    if (nm > 12) { nm = 1; ny += 1 }
    setY(ny)
    setM(nm)
    setPicked(1)
  }

  return (
    <div className="screen memory-screen">
      <div className="topbar">
        <BackButton onClick={back} />
        <div className="topbar-title">记忆碎片</div>
      </div>

      <div className="memory-body">
        <div className="mem-tags-head">
          <h3 className="mem-section-h">我的标签 · {tags.length}</h3>
          <button
            type="button"
            className="mem-manage"
            onClick={() => go('tags', { from: 'memory' })}
            aria-label="管理标签"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <rect x="4" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <rect x="4" y="15" width="7" height="5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M15 6.5h5M15 10h5M15 15h5M15 18.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <section className="mem-tag-cloud" aria-label="我的标签">
          {tags.length === 0 && <span className="nc-empty">去名片里添加一些标签吧</span>}
          {tags.map((t, i) => {
            const s = CLOUD_SLOTS[i % CLOUD_SLOTS.length]
            return (
              <span
                key={t.id}
                className="mem-cloud-pill"
                style={{
                  left: s.left,
                  bottom: s.bottom,
                  transform: `rotate(${s.rot}deg)`,
                  background: t.color || '#aebcc5',
                  '--i': i,
                }}
              >
                {t.label}
              </span>
            )
          })}
        </section>

        <h3 className="mem-section-h">过往碎片</h3>

        <section className="cal-card">
          <div className="cal-card-head">
            <span className="cal-ym">{y}/{String(m).padStart(2, '0')}</span>
            <div className="cal-nav">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="上一月">‹</button>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="下一月">›</button>
            </div>
          </div>
          <div className="cal-week">
            {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="cal-grid">
            {cells.map((d, i) => (
              <button
                key={i}
                type="button"
                className={[
                  'cal-day',
                  !d ? 'empty' : '',
                  d === picked ? 'on' : '',
                  marked.has(d) ? 'has' : '',
                  d === today ? 'today' : '',
                ].filter(Boolean).join(' ')}
                style={marked.has(d) ? { '--ring': marked.get(d) } : undefined}
                disabled={!d}
                onClick={() => d && setPicked(d)}
              >
                {d || ''}
              </button>
            ))}
          </div>
        </section>

        <div className="frag-day-list">
          {dayFrags.length === 0 && (
            <p className="nc-empty">这一天还没有碎片。</p>
          )}
          {dayFrags.map((f) => (
            <button
              key={f.id}
              type="button"
              className="frag-day-item"
              onClick={() => go('fragment', { fragmentId: f.id })}
            >
              <span className="frag-day-main">
                <span className="frag-day-date" style={{ color: f.tagColor }}>
                  {String(m).padStart(2, '0')} / {String(picked).padStart(2, '0')}
                </span>
                <span className="frag-day-title">{f.title}</span>
                {!!f.quote && <span className="frag-day-quote">{f.quote}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
