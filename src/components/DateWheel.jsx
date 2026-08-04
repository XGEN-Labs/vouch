import { useEffect, useMemo, useRef, useState } from 'react'

const ITEM_H = 38
const VISIBLE = 5
const MID = Math.floor(VISIBLE / 2) // 2

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

function clampToOptions(n, options) {
  if (!options.length) return n
  if (options.includes(n)) return n
  // 找最近的合法值
  let best = options[0], dist = Math.abs(options[0] - n)
  for (const o of options) {
    const d = Math.abs(o - n)
    if (d < dist) { best = o; dist = d }
  }
  return best
}

function WheelColumn({ options, value, onChange, pad = 2 }) {
  const drag = useRef(null)
  const idx = Math.max(0, options.indexOf(value))
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')

  const fmt = (n) => (pad ? String(n).padStart(pad, '0') : String(n))

  const commitText = (raw) => {
    const n = parseInt(String(raw).replace(/\D/g, ''), 10)
    if (Number.isNaN(n)) {
      setEditing(false)
      setText('')
      return
    }
    onChange(clampToOptions(n, options))
    setEditing(false)
    setText('')
  }

  const onPointerDown = (e) => {
    if (e.target.closest('input')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, startIdx: idx }
  }

  const onPointerMove = (e) => {
    if (!drag.current) return
    const delta = Math.round((drag.current.y - e.clientY) / ITEM_H)
    const next = Math.max(0, Math.min(options.length - 1, drag.current.startIdx + delta))
    if (options[next] !== value) onChange(options[next])
  }

  const onPointerUp = () => { drag.current = null }

  // 渲染：中心上下各 MID 项
  const cells = []
  for (let off = -MID; off <= MID; off++) {
    const i = idx + off
    const empty = i < 0 || i >= options.length
    const v = empty ? null : options[i]
    cells.push({ off, empty, value: v, key: empty ? `e${off}` : `${v}-${off}` })
  }

  return (
    <div
      className="wheel-col"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {cells.map((c) => {
        if (c.off === 0) {
          return (
            <div key="center" className="wheel-item on">
              <input
                className="wheel-input"
                inputMode="numeric"
                value={editing ? text : fmt(value)}
                onFocus={() => { setEditing(true); setText(String(value)) }}
                onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, pad || 4))}
                onBlur={() => commitText(text)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitText(text)
                    e.currentTarget.blur()
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    const next = Math.max(0, idx - 1)
                    onChange(options[next])
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    const next = Math.min(options.length - 1, idx + 1)
                    onChange(options[next])
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="直接输入"
              />
            </div>
          )
        }
        return (
          <div
            key={c.key}
            className={`wheel-item${c.empty ? ' empty' : ''}`}
            style={{ opacity: c.empty ? 0 : 1 - Math.abs(c.off) * 0.32 }}
            onClick={() => { if (!c.empty) onChange(c.value) }}
          >
            {c.empty ? '' : fmt(c.value)}
          </div>
        )
      })}
    </div>
  )
}

export default function DateWheel({ onConfirm }) {
  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: now - 1940 + 1 }, (_, i) => 1940 + i)
  }, [])
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])

  const [year, setYear] = useState(1995)
  const [month, setMonth] = useState(9)
  const [day, setDay] = useState(23)

  const days = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month]
  )

  useEffect(() => {
    if (day > days.length) setDay(days.length)
  }, [days, day])

  return (
    <div className="date-wheel">
      <div className="wheel-frame">
        <div className="wheel-head">
          <span>年</span><span>月</span><span>日</span>
        </div>
        <div className="wheel-body">
          <div className="wheel-highlight" aria-hidden />
          <div className="wheel-cols">
            <WheelColumn options={years} value={year} onChange={setYear} pad={0} />
            <WheelColumn options={months} value={month} onChange={setMonth} />
            <WheelColumn options={days} value={day} onChange={setDay} />
          </div>
        </div>
      </div>
      <button
        type="button"
        className="wheel-confirm"
        onClick={() => onConfirm(`${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`)}
      >
        就是这一天
      </button>
    </div>
  )
}
