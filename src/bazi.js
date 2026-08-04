// 八字排盘引擎 — 移植自玄境 server/bazi.js，改为 ES 模块、浏览器端计算。
// 依赖 lunar-javascript（可在浏览器运行）。返回结构与玄境保持一致，方便日后换商用 API。
import { Solar, Lunar } from 'lunar-javascript'

export const WUXING_OF_GAN = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'
}
export const WUXING_OF_ZHI = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
}
// 相生：木→火→土→金→水→木；相克：木克土 土克水 水克火 火克金 金克木
export const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
export const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

export function computeBazi({ year, month, day, hour, minute, gender, place }) {
  const hasHour = hour !== null && hour !== undefined && hour !== ''
  const h = hasHour ? Number(hour) : 0
  const solar = Solar.fromYmdHms(Number(year), Number(month), Number(day), h, Number(minute || 0), 0)
  const lunar = solar.getLunar()
  const ec = lunar.getEightChar()

  const pillars = {
    year: { ganZhi: ec.getYear(), gan: ec.getYearGan(), zhi: ec.getYearZhi(), naYin: ec.getYearNaYin(), shiShenGan: ec.getYearShiShenGan(), hideGan: ec.getYearHideGan() },
    month: { ganZhi: ec.getMonth(), gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), naYin: ec.getMonthNaYin(), shiShenGan: ec.getMonthShiShenGan(), hideGan: ec.getMonthHideGan() },
    day: { ganZhi: ec.getDay(), gan: ec.getDayGan(), zhi: ec.getDayZhi(), naYin: ec.getDayNaYin(), shiShenGan: '日主', hideGan: ec.getDayHideGan() },
    time: { ganZhi: ec.getTime(), gan: ec.getTimeGan(), zhi: ec.getTimeZhi(), naYin: ec.getTimeNaYin(), shiShenGan: ec.getTimeShiShenGan(), hideGan: ec.getTimeHideGan() }
  }

  const counts = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }
  for (const key of ['year', 'month', 'day', 'time']) {
    counts[WUXING_OF_GAN[pillars[key].gan]]++
    counts[WUXING_OF_ZHI[pillars[key].zhi]]++
  }

  const dayMaster = pillars.day.gan
  const dayMasterWuXing = WUXING_OF_GAN[dayMaster]
  const supportWuXing = Object.keys(SHENG).find(k => SHENG[k] === dayMasterWuXing)
  const support = counts[dayMasterWuXing] + counts[supportWuXing]
  const strength = support >= 4 ? '偏旺' : support <= 2 ? '偏弱' : '中和'
  const keWo = Object.keys(KE).find(k => KE[k] === dayMasterWuXing)
  const xiYong = strength === '偏弱'
    ? [dayMasterWuXing, supportWuXing]
    : [SHENG[dayMasterWuXing], keWo]
  const queWuXing = Object.keys(counts).filter(k => counts[k] === 0)

  const nowYear = new Date().getFullYear()
  let daYun = []
  let currentDaYun = null
  try {
    const yun = ec.getYun(gender === 'female' ? 0 : 1)
    daYun = yun.getDaYun().slice(1, 9).map(d => ({
      startYear: d.getStartYear(),
      startAge: d.getStartAge(),
      ganZhi: d.getGanZhi()
    }))
    currentDaYun = daYun.filter(d => d.startYear <= nowYear).pop() || null
  } catch (e) { /* 时辰缺失时大运不精确，忽略 */ }
  const liuNian = Lunar.fromDate(new Date()).getYearInGanZhiExact()

  return {
    input: { year, month, day, hour: hasHour ? h : null, gender, place: place || null },
    solarDate: solar.toYmd() + (hasHour ? ` ${String(h).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}` : ''),
    lunarDate: lunar.toString(),
    shengXiao: lunar.getYearShengXiao(),
    monthZhi: pillars.month.zhi,
    pillars,
    wuXingCounts: counts,
    dayMaster,
    dayMasterWuXing,
    strength,
    xiYong,
    queWuXing,
    daYun,
    currentDaYun,
    liuNian,
    hourKnown: hasHour
  }
}
