/** 热带黄道：太阳 · 月亮（近似）· 上升（有出生时间时粗估） */

export const SIGNS = [
  { id: 'aries', cn: '白羊', en: 'Aries', element: '火', modality: '基本', glyph: '♈' },
  { id: 'taurus', cn: '金牛', en: 'Taurus', element: '土', modality: '固定', glyph: '♉' },
  { id: 'gemini', cn: '双子', en: 'Gemini', element: '风', modality: '变动', glyph: '♊' },
  { id: 'cancer', cn: '巨蟹', en: 'Cancer', element: '水', modality: '基本', glyph: '♋' },
  { id: 'leo', cn: '狮子', en: 'Leo', element: '火', modality: '固定', glyph: '♌' },
  { id: 'virgo', cn: '处女', en: 'Virgo', element: '土', modality: '变动', glyph: '♍' },
  { id: 'libra', cn: '天秤', en: 'Libra', element: '风', modality: '基本', glyph: '♎' },
  { id: 'scorpio', cn: '天蝎', en: 'Scorpio', element: '水', modality: '固定', glyph: '♏' },
  { id: 'sagittarius', cn: '射手', en: 'Sagittarius', element: '火', modality: '变动', glyph: '♐' },
  { id: 'capricorn', cn: '摩羯', en: 'Capricorn', element: '土', modality: '基本', glyph: '♑' },
  { id: 'aquarius', cn: '水瓶', en: 'Aquarius', element: '风', modality: '固定', glyph: '♒' },
  { id: 'pisces', cn: '双鱼', en: 'Pisces', element: '水', modality: '变动', glyph: '♓' },
]

const BY_ID = Object.fromEntries(SIGNS.map(s => [s.id, s]))

export function sunSignFromDate(_year, month, day) {
  const md = month * 100 + day
  let id = 'capricorn'
  if (md >= 120 && md <= 218) id = 'aquarius'
  else if (md >= 219 && md <= 320) id = 'pisces'
  else if (md >= 321 && md <= 419) id = 'aries'
  else if (md >= 420 && md <= 520) id = 'taurus'
  else if (md >= 521 && md <= 620) id = 'gemini'
  else if (md >= 621 && md <= 722) id = 'cancer'
  else if (md >= 723 && md <= 822) id = 'leo'
  else if (md >= 823 && md <= 922) id = 'virgo'
  else if (md >= 923 && md <= 1022) id = 'libra'
  else if (md >= 1023 && md <= 1121) id = 'scorpio'
  else if (md >= 1122 && md <= 1221) id = 'sagittarius'
  else id = 'capricorn' // 12/22–1/19
  return BY_ID[id] || SIGNS[0]
}

function julianDate(year, month, day, hour = 12, minute = 0) {
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  const dayFrac = (hour + minute / 60) / 24
  return Math.floor(365.25 * (y + 4716))
    + Math.floor(30.6001 * (m + 1))
    + day + dayFrac + B - 1524.5
}

/** 热带月亮黄经近似（星座级精度，非精密星历） */
export function moonSignFromDate(year, month, day, hour = 12, minute = 0) {
  const jd = julianDate(year, month, day, hour, minute)
  const T = (jd - 2451545.0) / 36525
  // 月亮平黄经 + 主要中心差修正
  let L = 218.3164477 + 481267.88123421 * T
  const M = 134.9633964 + 477198.8675055 * T
  const rad = Math.PI / 180
  L += 6.289 * Math.sin(M * rad)
  L = ((L % 360) + 360) % 360
  return SIGNS[Math.floor(L / 30) % 12]
}

/**
 * 粗估上升：约每 2 小时换一宫；以约日出（6:00）太阳所在宫为起点。
 * 支持分钟；非精确天文学上升，仅作人格外层参考。
 */
export function roughAscFromHour(sunSignId, hour, minute = 0) {
  const sunIdx = SIGNS.findIndex(s => s.id === sunSignId)
  if (sunIdx < 0 || hour == null || hour === '') return null
  const h = ((+hour % 24) + 24) % 24
  const m = Math.max(0, Math.min(59, +minute || 0))
  const hoursFromDawn = (h + m / 60 - 6 + 24) % 24
  return SIGNS[(sunIdx + Math.floor(hoursFromDawn / 2)) % 12]
}

export function computeAstro({ year, month, day, hour = '', minute = 0, place = '' }) {
  const sun = sunSignFromDate(year, month, day)
  const hourKnown = hour !== '' && hour != null
  const birthHour = hourKnown ? +hour : null
  const birthMinute = hourKnown ? Math.max(0, Math.min(59, +minute || 0)) : 0
  const moonHour = hourKnown ? birthHour : 12
  const moonMinute = hourKnown ? birthMinute : 0
  const moon = moonSignFromDate(year, month, day, moonHour, moonMinute)
  const asc = hourKnown ? roughAscFromHour(sun.id, birthHour, birthMinute) : null
  const timeLabel = hourKnown
    ? `${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}`
    : null

  return {
    sunSign: sun.id,
    sunSignCn: sun.cn,
    sunSignEn: sun.en,
    glyph: sun.glyph,
    element: sun.element,
    modality: sun.modality,
    moonSign: moon.id,
    moonSignCn: moon.cn,
    moonElement: moon.element,
    moonModality: moon.modality,
    ascSign: asc?.id || null,
    ascSignCn: asc?.cn || null,
    ascElement: asc?.element || null,
    ascModality: asc?.modality || null,
    // 兼容旧字段（近况模板用太阳元素）
    dominantElement: sun.element,
    dominantModality: sun.modality,
    hourKnown,
    birthHour,
    birthMinute: hourKnown ? birthMinute : null,
    timeLabel,
    place: place || '',
    solarDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    input: { year, month, day, hour, minute: hourKnown ? birthMinute : (minute || 0), place },
  }
}

export function formatAstroForSkill(astro) {
  const lines = [
    `太阳：${astro.sunSignCn}座 —— 核心自我、你是谁、想成为什么样的人（${astro.element}象·${astro.modality}）`,
    `月亮：${astro.moonSignCn}座 —— 情绪需求、安全感、私下里怎么被安抚（${astro.moonElement}象）`,
  ]
  if (astro.hourKnown && astro.ascSignCn) {
    lines.push(
      `上升：${astro.ascSignCn}座 —— 第一印象、对外姿态（${astro.ascElement}象）；出生时间 ${astro.timeLabel}`,
    )
  } else {
    lines.push('上升：未知（无出生时间）—— 解读时只谈太阳与月亮，勿编造上升，勿追问缺时间')
  }
  lines.push(`阳历：${astro.solarDate}`)
  if (astro.place) lines.push(`出生地：${astro.place}`)
  lines.push('解读重点：分别点明太阳/月亮/上升（若有）代表什么，再合成整体印象。不要谈元素百分比。')
  return lines.join('\n')
}
