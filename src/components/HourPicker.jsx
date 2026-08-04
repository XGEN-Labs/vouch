// 十二时辰选择；可跳过（不知时辰）
export const SHICHEN = [
  { label: '子时', range: '23:00–01:00', hour: 0 },
  { label: '丑时', range: '01:00–03:00', hour: 2 },
  { label: '寅时', range: '03:00–05:00', hour: 4 },
  { label: '卯时', range: '05:00–07:00', hour: 6 },
  { label: '辰时', range: '07:00–09:00', hour: 8 },
  { label: '巳时', range: '09:00–11:00', hour: 10 },
  { label: '午时', range: '11:00–13:00', hour: 12 },
  { label: '未时', range: '13:00–15:00', hour: 14 },
  { label: '申时', range: '15:00–17:00', hour: 16 },
  { label: '酉时', range: '17:00–19:00', hour: 18 },
  { label: '戌时', range: '19:00–21:00', hour: 20 },
  { label: '亥时', range: '21:00–23:00', hour: 22 },
]

export default function HourPicker({ onPick, onSkip }) {
  return (
    <div className="hour-picker">
      <div className="hour-grid">
        {SHICHEN.map((s) => (
          <button
            key={s.label}
            type="button"
            className="hour-chip"
            onClick={() => onPick(s)}
          >
            <span className="hour-chip-name">{s.label}</span>
            <span className="hour-chip-range">{s.range}</span>
          </button>
        ))}
      </div>
      <button type="button" className="hour-skip" onClick={onSkip}>
        记不清了，跳过
      </button>
    </div>
  )
}
