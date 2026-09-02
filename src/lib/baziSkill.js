// 接入 bazi-skill（https://github.com/jinchenma94/bazi-skill）的典籍与排盘框架
import classical from '../data/bazi-skill/classical-texts.md?raw'
import wuxing from '../data/bazi-skill/wuxing-tables.md?raw'
import dayun from '../data/bazi-skill/dayun-rules.md?raw'
import shichen from '../data/bazi-skill/shichen-table.md?raw'

/** 给 LLM 的压缩版 skill 知识（控制 token） */
export function baziSkillContext() {
  // 截取各典籍核心段，避免整包过大
  const classicalCore = classical
    .split('\n')
    .filter(l => !l.startsWith('# 目录') && !l.startsWith('1.') && !l.startsWith('2.'))
    .join('\n')
    .slice(0, 4200)

  return [
    '你参照 bazi-skill 与下列经典框架论命：《穷通宝典》《三命通会》《滴天髓》《渊海子平》《子平真诠》《神峰通考》。',
    '分析顺序：日主旺衰（得令/得地/得势）→ 调候 → 五行偏枯 → 十神意象 → 大运流年（若有）→ 性格与处境。',
    '时辰未知时只做年月日六字分析，不要编造时柱。',
    '语气仍是 Vouch 小火苗：短、暖、不恐吓、不列点、不写“根据某书第X条”。典籍只作内功，别掉书袋。',
    '',
    '—— 典籍摘要 ——',
    classicalCore,
    '',
    '—— 五行/十神表（节选）——',
    wuxing.slice(0, 1800),
    '',
    '—— 大运要点 ——',
    dayun.slice(0, 900),
    '',
    '—— 时辰 ——',
    shichen.slice(0, 500),
  ].join('\n')
}

/** 把 computeBazi 结果格式化成 skill 第二阶段那种四柱摘要 */
export function formatChartForSkill(bazi) {
  const p = bazi.pillars || {}
  const col = (k) => {
    const x = p[k]
    if (!x) return '未知'
    return `${x.ganZhi}（${x.shiShenGan || ''}｜${x.naYin || ''}）`
  }
  const hourLine = bazi.hourKnown
    ? col('time')
    : '未知（六字分析）'

  const dy = (bazi.daYun || []).slice(0, 4)
    .map(d => `${d.startAge}岁起 ${d.ganZhi}`)
    .join('；')

  return [
    `四柱：年 ${col('year')} ／ 月 ${col('month')} ／ 日 ${col('day')} ／ 时 ${hourLine}`,
    `日主：${bazi.dayMaster}${bazi.dayMasterWuXing}，身${bazi.strength}`,
    `旺衰依据：${(bazi.strengthAnalysis?.basis || []).join('；') || '—'}`,
    `用神：${bazi.yongShen || '—'}；喜神：${bazi.xiShen || '—'}；喜用倾向：${(bazi.xiYong || []).join('、') || '—'}`,
    `取用依据：${(bazi.favorableReasons || []).join('；') || '—'}`,
    bazi.wuXingPercentages
      ? `五行力量：金${bazi.wuXingPercentages.金}% 木${bazi.wuXingPercentages.木}% 水${bazi.wuXingPercentages.水}% 火${bazi.wuXingPercentages.火}% 土${bazi.wuXingPercentages.土}%`
      : `五行计数：金${bazi.wuXingCounts.金} 木${bazi.wuXingCounts.木} 水${bazi.wuXingCounts.水} 火${bazi.wuXingCounts.火} 土${bazi.wuXingCounts.土}`,
    bazi.queWuXing?.length ? `五行偏缺：${bazi.queWuXing.join('、')}` : '五行无明显空缺',
    `月令：${bazi.monthZhi}，生肖：${bazi.shengXiao || ''}`,
    bazi.currentDaYun ? `当前大运：${bazi.currentDaYun.ganZhi}（${bazi.currentDaYun.startAge}岁起）` : '',
    dy ? `大运前几步：${dy}` : '',
    `流年：${bazi.liuNian || ''}`,
    `阳历：${bazi.solarDate}；农历：${bazi.lunarDate || ''}`,
    `性别：${bazi.input?.gender === 'female' ? '女' : '男'}`,
    `出生地：${bazi.input?.place || '未知'}`,
  ].filter(Boolean).join('\n')
}
