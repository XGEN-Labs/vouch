import { Solar } from 'lunar-javascript'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

/** 当前时间上下文：公历 + 农历 + 时区，注入 LLM system */
export function nowContext(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = date.getHours()
  const mm = date.getMinutes()
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
  const pad = (n) => String(n).padStart(2, '0')

  let lunarBit = ''
  try {
    const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0)
    const lunar = solar.getLunar()
    lunarBit = `农历：${lunar.toString()}（${lunar.getYearInGanZhi()}年 · ${lunar.getYearShengXiao()}年 · 星期${WEEK[date.getDay()]}）`
  } catch {
    lunarBit = `星期${WEEK[date.getDay()]}`
  }

  const part =
    hh < 5 ? '凌晨' :
    hh < 9 ? '清晨' :
    hh < 12 ? '上午' :
    hh < 14 ? '中午' :
    hh < 18 ? '下午' :
    hh < 22 ? '晚上' : '深夜'

  return [
    `【当前时间】${y}-${pad(m)}-${pad(d)} ${pad(hh)}:${pad(mm)}（${tz}，当地${part}）`,
    lunarBit,
    '涉及“今天/最近/流年/当下”，请以此时间为准；不要假设过时的年份。',
  ].join('\n')
}
