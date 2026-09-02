import { KE, SHENG } from '../bazi.js'

const ELEMENT_COLOR = {
  木: '#7fc879',
  火: '#ee8e7d',
  土: '#d1aa72',
  金: '#e2c46f',
  水: '#78b5dc',
}

const VIEW = { w: 320, h: 290 }
const CENTER = { x: 160, y: 145 }
const NODE_R = 90
const RING_R = 128

function pentagonPoints() {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / 5)
    return {
      x: CENTER.x + NODE_R * Math.cos(angle),
      y: CENTER.y + NODE_R * Math.sin(angle),
    }
  })
}

function pct(point) {
  return {
    x: (point.x / VIEW.w) * 100,
    y: (point.y / VIEW.h) * 100,
  }
}

function percentagesFor(counts = {}) {
  const elements = ['木', '火', '土', '金', '水']
  const total = elements.reduce((sum, element) => sum + Number(counts[element] || 0), 0) || 1
  const parts = elements.map((element) => {
    const raw = Number(counts[element] || 0) * 100 / total
    return { element, value: Math.floor(raw), remainder: raw % 1 }
  })
  let points = 100 - parts.reduce((sum, part) => sum + part.value, 0)
  for (const part of [...parts].sort((a, b) => b.remainder - a.remainder)) {
    if (points <= 0) break
    part.value += 1
    points -= 1
  }
  return Object.fromEntries(parts.map((part) => [part.element, part.value]))
}

function relationFor(element, dayElement) {
  if (element === dayElement) return '同气'
  if (SHENG[element] === dayElement) return '生我'
  if (SHENG[dayElement] === element) return '我生'
  if (KE[element] === dayElement) return '克我'
  return '我克'
}

export default function BaziElementChart({ bazi }) {
  if (!bazi?.dayMasterWuXing) return null

  const dayElement = bazi.dayMasterWuXing
  const order = [dayElement]
  while (order.length < 5) order.push(SHENG[order[order.length - 1]])
  const percentages = percentagesFor(bazi.wuXingScores || bazi.wuXingCounts)
  const maxPercentage = Math.max(...Object.values(percentages), 1)
  const nodes = pentagonPoints()
  const keStar = [0, 2, 4, 1, 3]
    .map((i) => `${nodes[i].x.toFixed(1)},${nodes[i].y.toFixed(1)}`)
    .join(' ')
  const pillars = [
    ['年柱', bazi.pillars?.year?.ganZhi],
    ['月柱', bazi.pillars?.month?.ganZhi],
    ['日柱', bazi.pillars?.day?.ganZhi],
    ['时柱', bazi.hourKnown ? bazi.pillars?.time?.ganZhi : '未定'],
  ]

  return (
    <section className="bazi-chart" aria-label="五行八字排盘">
      <header className="bazi-chart-head">
        <span className="bazi-chart-kicker">五行排盘</span>
        <span className="bazi-chart-day">日主 · {bazi.dayMaster}{dayElement}</span>
      </header>

      <div className="bazi-pillars" aria-label="四柱">
        {pillars.map(([label, value]) => (
          <div key={label} className="bazi-pillar">
            <span>{label}</span>
            <strong>{value || '—'}</strong>
          </div>
        ))}
      </div>

      <div className="bazi-orbit">
        <svg className="bazi-orbit-lines" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden>
          <circle className="bazi-sheng-ring" cx={CENTER.x} cy={CENTER.y} r={RING_R} fill="none" />
          <polygon className="bazi-ke-star" points={keStar} fill="none" />
        </svg>

        <div className="bazi-orbit-core" aria-hidden>
          <span>五行</span>
          <small>相生 · 相克</small>
        </div>

        {order.map((element, index) => {
          const pos = pct(nodes[index])
          const isDay = element === dayElement
          const size = Math.round(46 + percentages[element] / maxPercentage * 28)
          return (
            <div
              key={element}
              className="bazi-element"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                '--element-color': ELEMENT_COLOR[element],
                '--element-size': `${size}px`,
              }}
            >
              {isDay && <span className="bazi-element-badge">日主</span>}
              <strong>{element}</strong>
              <span className="bazi-element-percent">{percentages[element]}%</span>
              <small>{relationFor(element, dayElement)}</small>
            </div>
          )
        })}
      </div>

      <footer className="bazi-chart-foot">
        <span>身{bazi.strength || '中和'}</span>
        <i aria-hidden />
        <span>喜用</span>
        <div className="bazi-use-elements">
          {(bazi.xiYong || []).map((element) => (
            <b key={element} style={{ '--element-color': ELEMENT_COLOR[element] }}>{element}</b>
          ))}
        </div>
      </footer>
    </section>
  )
}
