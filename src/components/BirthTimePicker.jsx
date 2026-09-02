import { useMemo, useState } from 'react'
import { WheelColumn } from './DateWheel.jsx'

/** 星盘用：精确到分钟的出生时间 */
export default function BirthTimePicker({ onConfirm, onSkip, initial }) {
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), [])
  const [hour, setHour] = useState(initial?.hour ?? 12)
  const [minute, setMinute] = useState(initial?.minute ?? 0)

  const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  return (
    <div className="date-wheel birth-time-wheel">
      <div className="wheel-frame">
        <div className="wheel-head wheel-head-time">
          <span>时</span><span>分</span>
        </div>
        <div className="wheel-body">
          <div className="wheel-highlight" aria-hidden />
          <div className="wheel-cols wheel-cols-time">
            <WheelColumn options={hours} value={hour} onChange={setHour} />
            <WheelColumn options={minutes} value={minute} onChange={setMinute} />
          </div>
        </div>
      </div>
      <button
        type="button"
        className="wheel-confirm"
        onClick={() => onConfirm({ hour, minute, label })}
      >
        就是这个时间
      </button>
      {onSkip && (
        <button type="button" className="hour-skip" onClick={onSkip}>
          记不清了，跳过
        </button>
      )}
    </div>
  )
}
