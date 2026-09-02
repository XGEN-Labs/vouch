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

export const BAZI_ANALYSIS_VERSION = 2

// 地支藏干按本气 / 中气 / 余气分配。单藏干取全气，双藏干按 70% / 30%。
export const HIDDEN_GANS = {
  子: [['癸', 1]],
  丑: [['己', 0.6], ['癸', 0.3], ['辛', 0.1]],
  寅: [['甲', 0.6], ['丙', 0.3], ['戊', 0.1]],
  卯: [['乙', 1]],
  辰: [['戊', 0.6], ['乙', 0.3], ['癸', 0.1]],
  巳: [['丙', 0.6], ['庚', 0.3], ['戊', 0.1]],
  午: [['丁', 0.7], ['己', 0.3]],
  未: [['己', 0.6], ['丁', 0.3], ['乙', 0.1]],
  申: [['庚', 0.6], ['壬', 0.3], ['戊', 0.1]],
  酉: [['辛', 1]],
  戌: [['戊', 0.6], ['辛', 0.3], ['丁', 0.1]],
  亥: [['壬', 0.7], ['甲', 0.3]],
}

const STEM_WEIGHT = { year: 1, month: 1.15, day: 1, time: 1 }
// 月令为提纲；日支与日主贴身，权重次之。
const BRANCH_WEIGHT = { year: 1.15, month: 2.35, day: 1.4, time: 1.15 }

const inverseOf = (map, target) => Object.keys(map).find((key) => map[key] === target)
const blankPower = () => ({ 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 })

/** 按月令的旺、相、休、囚、死给五行季节系数。 */
export function seasonalCoefficients(monthZhi) {
  const command = WUXING_OF_ZHI[monthZhi] || '土'
  const resource = inverseOf(SHENG, command)
  const controller = inverseOf(KE, command)
  return {
    ...Object.fromEntries(Object.keys(blankPower()).map((element) => [element, 1])),
    [command]: 1.5,
    [SHENG[command]]: 1.2,
    [resource]: 0.9,
    [controller]: 0.7,
    [KE[command]]: 0.55,
  }
}

/**
 * 五行力量：天干看透出，地支展开藏干，月令加权，再乘旺相休囚死。
 * 这不是简单的“八个字各算一个”，而是用于旺衰与 UI 百分比的命局力量。
 */
export function scoreFiveElements(pillars, hourKnown = true) {
  const scores = blankPower()
  const keys = hourKnown ? ['year', 'month', 'day', 'time'] : ['year', 'month', 'day']
  const season = seasonalCoefficients(pillars?.month?.zhi)

  for (const key of keys) {
    const pillar = pillars?.[key]
    if (!pillar) continue
    const stemElement = WUXING_OF_GAN[pillar.gan]
    if (stemElement) scores[stemElement] += STEM_WEIGHT[key] * season[stemElement]

    for (const [gan, share] of HIDDEN_GANS[pillar.zhi] || []) {
      const element = WUXING_OF_GAN[gan]
      scores[element] += BRANCH_WEIGHT[key] * share * season[element]
    }
  }

  return Object.fromEntries(Object.entries(scores).map(([element, value]) => [element, Number(value.toFixed(3))]))
}

function climateTarget(monthZhi) {
  if (['亥', '子'].includes(monthZhi)) return { element: '火', weight: 3.2, label: '寒局取火调候' }
  if (monthZhi === '丑') return { element: '火', weight: 2.5, label: '寒湿取火调候' }
  if (['巳', '午'].includes(monthZhi)) return { element: '水', weight: 3.2, label: '燥热取水调候' }
  if (monthZhi === '未') return { element: '水', weight: 2.5, label: '暑燥取水调候' }
  if (monthZhi === '辰') return { element: '火', weight: 1.4, label: '湿土喜火暖燥' }
  if (monthZhi === '戌') return { element: '水', weight: 1.4, label: '燥土喜水润泽' }
  return null
}

function conflictMediator(scores) {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [first, second] = ranked.slice(0, 2).map(([element]) => element)
  if (KE[first] === second) return SHENG[first]
  if (KE[second] === first) return SHENG[second]
  return null
}

/** 扶抑为主、调候与通关为辅，给出用神和喜神倾向。 */
export function chooseFavorableElements({ dayElement, monthZhi, strength, scores }) {
  const elements = ['木', '火', '土', '金', '水']
  const resource = inverseOf(SHENG, dayElement)
  const output = SHENG[dayElement]
  const wealth = KE[dayElement]
  const officer = inverseOf(KE, dayElement)
  const points = Object.fromEntries(elements.map((element) => [element, 0]))
  const reasons = []

  if (strength === '偏弱') {
    points[resource] += 4.2
    points[dayElement] += 3.6
    points[output] -= 1.6
    points[wealth] -= 2.4
    points[officer] -= 3.2
    reasons.push(`身弱先取${resource}印、${dayElement}比劫扶身`)
  } else if (strength === '偏旺') {
    points[officer] += 3.8
    points[output] += 3.6
    points[wealth] += 3.2
    points[resource] -= 3
    points[dayElement] -= 3.5
    reasons.push(`身旺取${officer}制、${output}泄、${wealth}耗`)
  } else {
    points[output] += 1.2
    points[wealth] += 1
    points[officer] += 0.8
    reasons.push('身势中和，以调候和命局偏枯取用')
  }

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0) || 1
  const favorablePool = strength === '偏弱'
    ? [resource, dayElement]
    : strength === '偏旺'
      ? [officer, output, wealth]
      : elements
  for (const element of favorablePool) {
    const share = scores[element] / total
    points[element] += Math.max(0, 0.2 - share) * 5
  }

  const climate = climateTarget(monthZhi)
  if (climate) {
    points[climate.element] += climate.weight
    reasons.push(climate.label)
  }

  const mediator = conflictMediator(scores)
  if (mediator) {
    points[mediator] += 1.5
    reasons.push(`旺气相战，取${mediator}通关`)
  }

  const ranked = elements
    .map((element) => ({ element, score: points[element] }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
  const selected = ranked.slice(0, 2).map((item) => item.element)
  if (!selected.length) selected.push(output, wealth)

  return {
    xiYong: selected,
    yongShen: selected[0],
    xiShen: selected[1] || null,
    jiShen: strength === '偏弱' ? [officer, wealth] : strength === '偏旺' ? [resource, dayElement] : [],
    climateElement: climate?.element || null,
    reasons,
  }
}

/** 得令、得地、得势综合判旺衰。日干自身不计为外援。 */
export function analyzeDayMaster({ pillars, hourKnown, scores }) {
  const dayMaster = pillars.day.gan
  const dayElement = WUXING_OF_GAN[dayMaster]
  const resource = inverseOf(SHENG, dayElement)
  const monthElement = WUXING_OF_ZHI[pillars.month.zhi]
  const season = seasonalCoefficients(pillars.month.zhi)
  const dayStemPower = STEM_WEIGHT.day * season[dayElement]
  const externalTotal = Math.max(0.001, Object.values(scores).reduce((sum, value) => sum + value, 0) - dayStemPower)
  const supportPower = Math.max(0, scores[dayElement] + scores[resource] - dayStemPower)
  const drainPower = Math.max(0, externalTotal - supportPower)
  const supportRatio = supportPower / externalTotal
  const monthSupports = monthElement === dayElement || SHENG[monthElement] === dayElement
  const keys = hourKnown ? ['year', 'month', 'day', 'time'] : ['year', 'month', 'day']
  const rootPower = keys.reduce((sum, key) => {
    const pillar = pillars[key]
    const share = (HIDDEN_GANS[pillar.zhi] || [])
      .filter(([gan]) => WUXING_OF_GAN[gan] === dayElement)
      .reduce((subtotal, [, weight]) => subtotal + weight, 0)
    return sum + share * BRANCH_WEIGHT[key] * season[dayElement]
  }, 0)
  const visibleSupport = keys
    .filter((key) => key !== 'day')
    .filter((key) => [dayElement, resource].includes(WUXING_OF_GAN[pillars[key].gan]))
    .length

  let strength = '中和'
  if (supportRatio >= 0.62 || (supportRatio >= 0.55 && monthSupports && rootPower >= 0.5)) {
    strength = '偏旺'
  } else if (supportRatio <= 0.38 || (supportRatio <= 0.45 && !monthSupports && rootPower < 0.45)) {
    strength = '偏弱'
  }

  const monthState = monthElement === dayElement
    ? '月令同气，得令'
    : SHENG[monthElement] === dayElement
      ? '月令生身，得生'
      : '月令不助，失令'
  const rootState = rootPower >= 1.2 ? '根气较足' : rootPower >= 0.45 ? '地支有根' : '根气浅'
  const momentumState = visibleSupport >= 2 ? '透干帮扶有势' : visibleSupport === 1 ? '有一处透干帮扶' : '天干少帮扶'

  return {
    strength,
    supportPower: Number(supportPower.toFixed(3)),
    drainPower: Number(drainPower.toFixed(3)),
    supportRatio: Number(supportRatio.toFixed(3)),
    rootPower: Number(rootPower.toFixed(3)),
    visibleSupport,
    monthSupports,
    basis: [monthState, rootState, momentumState, `扶身约${Math.round(supportRatio * 100)}%`],
  }
}

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

  const countKeys = hasHour ? ['year', 'month', 'day', 'time'] : ['year', 'month', 'day']
  const counts = blankPower()
  for (const key of countKeys) {
    counts[WUXING_OF_GAN[pillars[key].gan]]++
    counts[WUXING_OF_ZHI[pillars[key].zhi]]++
  }

  const dayMaster = pillars.day.gan
  const dayMasterWuXing = WUXING_OF_GAN[dayMaster]
  const wuXingScores = scoreFiveElements(pillars, hasHour)
  const strengthAnalysis = analyzeDayMaster({ pillars, hourKnown: hasHour, scores: wuXingScores })
  const strength = strengthAnalysis.strength
  const favorable = chooseFavorableElements({
    dayElement: dayMasterWuXing,
    monthZhi: pillars.month.zhi,
    strength,
    scores: wuXingScores,
  })
  const scoreTotal = Object.values(wuXingScores).reduce((sum, value) => sum + value, 0) || 1
  const wuXingPercentages = Object.fromEntries(
    Object.entries(wuXingScores).map(([element, value]) => [element, Number((value * 100 / scoreTotal).toFixed(1))])
  )
  const queWuXing = Object.keys(wuXingScores).filter((element) => wuXingScores[element] <= 0)

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
    analysisVersion: BAZI_ANALYSIS_VERSION,
    input: { year, month, day, hour: hasHour ? h : null, minute: Number(minute || 0), gender, place: place || null },
    solarDate: solar.toYmd() + (hasHour ? ` ${String(h).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}` : ''),
    lunarDate: lunar.toString(),
    shengXiao: lunar.getYearShengXiao(),
    monthZhi: pillars.month.zhi,
    pillars,
    wuXingCounts: counts,
    wuXingScores,
    wuXingPercentages,
    dayMaster,
    dayMasterWuXing,
    strength,
    strengthAnalysis,
    xiYong: favorable.xiYong,
    yongShen: favorable.yongShen,
    xiShen: favorable.xiShen,
    jiShen: favorable.jiShen,
    climateElement: favorable.climateElement,
    favorableReasons: favorable.reasons,
    queWuXing,
    daYun,
    currentDaYun,
    liuNian,
    hourKnown: hasHour
  }
}
