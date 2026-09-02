// mode: 'bazi' → 十二时辰；'astro' → 钟点时段（西式说法）
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

export const CLOCK_SLOTS = [
  { label: '午夜', range: '23:00–01:00', hour: 0 },
  { label: '凌晨', range: '01:00–03:00', hour: 2 },
  { label: '拂晓', range: '03:00–05:00', hour: 4 },
  { label: '清晨', range: '05:00–07:00', hour: 6 },
  { label: '早上', range: '07:00–09:00', hour: 8 },
  { label: '上午', range: '09:00–11:00', hour: 10 },
  { label: '中午', range: '11:00–13:00', hour: 12 },
  { label: '午后', range: '13:00–15:00', hour: 14 },
  { label: '下午', range: '15:00–17:00', hour: 16 },
  { label: '傍晚', range: '17:00–19:00', hour: 18 },
  { label: '晚上', range: '19:00–21:00', hour: 20 },
  { label: '夜里', range: '21:00–23:00', hour: 22 },
]

export default function HourPicker({ onPick, onSkip, mode = 'bazi' }) {
  const slots = mode === 'astro' ? CLOCK_SLOTS : SHICHEN
  return (
    <div className="hour-picker">
      <div className="hour-grid">
        {slots.map((s) => (
          <button
            key={s.label + s.hour}
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
