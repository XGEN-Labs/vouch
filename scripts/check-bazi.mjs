import assert from 'node:assert/strict'
import { analyzeDayMaster, computeBazi, scoreFiveElements } from '../src/bazi.js'

const total = (values) => Object.values(values).reduce((sum, value) => sum + value, 0)

const noHour = computeBazi({
  year: 2000,
  month: 1,
  day: 1,
  hour: '',
  minute: 0,
  gender: 'male',
  place: '深圳',
})
assert.equal(total(noHour.wuXingCounts), 6, '时辰未知时只能统计年月日六字')
assert.equal(noHour.strength, '偏弱', '戊土生子月、根浅，应按失令身弱判断')
assert.deepEqual(noHour.xiYong, ['火', '土'], '寒月身弱戊土应先取火土扶身调候')

const withHour = computeBazi({
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: 'male',
  place: '深圳',
})
assert.equal(total(withHour.wuXingCounts), 8, '时辰明确时应统计完整八字')

const allWood = {
  year: { gan: '甲', zhi: '寅' },
  month: { gan: '甲', zhi: '卯' },
  day: { gan: '甲', zhi: '寅' },
  time: { gan: '甲', zhi: '卯' },
}
const woodScores = scoreFiveElements(allWood, true)
assert.equal(
  analyzeDayMaster({ pillars: allWood, hourKnown: true, scores: woodScores }).strength,
  '偏旺',
  '日主得令、通根、透干帮扶时应判偏旺',
)

const weakWood = {
  year: { gan: '庚', zhi: '申' },
  month: { gan: '辛', zhi: '酉' },
  day: { gan: '甲', zhi: '申' },
  time: { gan: '庚', zhi: '申' },
}
const weakWoodScores = scoreFiveElements(weakWood, true)
assert.equal(
  analyzeDayMaster({ pillars: weakWood, hourKnown: true, scores: weakWoodScores }).strength,
  '偏弱',
  '日主失令、无根、官杀成势时应判偏弱',
)

const changedUnknownHour = {
  ...allWood,
  time: { gan: '庚', zhi: '申' },
}
assert.deepEqual(
  scoreFiveElements(allWood, false),
  scoreFiveElements(changedUnknownHour, false),
  '六字分析不得受占位时柱影响',
)

console.log('bazi checks passed')
