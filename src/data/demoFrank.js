import { computeBazi } from '../bazi.js'
import { toReading, phaseReading, teaserFor } from './persona.js'
import { matchGuardian } from '../lib/guardianSpirit.js'

/** 内置演示档案：Frank · 1995/09/23 · 男 · 时辰未详 · 八字 */
export function buildFrankProfile() {
  const birthday = { y: 1995, m: 9, d: 23 }
  const gender = 'male'
  const place = '深圳'
  const userName = 'Frank'
  const bazi = computeBazi({
    year: birthday.y,
    month: birthday.m,
    day: birthday.d,
    hour: '',
    minute: 0,
    gender,
    place,
  })
  const base = toReading(bazi)
  const reading = { ...base, teaser: teaserFor(bazi) }
  const guardian = matchGuardian(bazi)
  const flameName = guardian?.name || '小火苗'
  const phase = phaseReading(bazi, flameName)

  return {
    userName,
    flameName,
    gender,
    place,
    birthday,
    hour: '',
    minute: 0,
    hourLabel: null,
    unlocked: ['bazi'],
    activeSystem: 'bazi',
    systemChoice: 'bazi',
    bazi,
    reading,
    phase,
    guardian,
  }
}
