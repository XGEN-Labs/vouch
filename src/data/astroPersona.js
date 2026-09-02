import { SIGNS } from '../astro.js'

const BY_ID = Object.fromEntries(SIGNS.map(s => [s.id, s]))

/** 太阳：核心自我 */
const SUN = {
  aries: '行动先于犹豫，热起来就往前',
  taurus: '要踏实才安心，慢是为了站稳',
  gemini: '念头跳得快，靠连接与说法呼吸',
  cancer: '先护住自己的人，潮汐一来就感同身受',
  leo: '需要被看见，光要有人映着才暖',
  virgo: '眼里全是细节，收整齐也容易收紧自己',
  libra: '两边都想顾，美和公平像秤上的砝码',
  scorpio: '看得深、藏得深，靠近才碰到底',
  sagittarius: '想走远一点，远方一亮脚就痒',
  capricorn: '扛得住山，目标一立就一阶一阶爬',
  aquarius: '留一点不合群的清醒，频率自己定',
  pisces: '边界软、梦也深，容易游进别人的海里',
}

/** 月亮：情绪与安全感 */
const MOON = {
  aries: '情绪来得快也去得快，被卡住时宁可先动起来',
  taurus: '要稳定、要被好好对待，安全感来自可预期',
  gemini: '心里一乱就想说话、想换频道，安静太久会闷',
  cancer: '需要被护着，也容易先护别人；家与亲近最重要',
  leo: '情绪也要被看见，被忽视比被批评更难受',
  virgo: '靠整理安抚自己，乱一点就焦虑',
  libra: '气氛不对就难受，需要和谐与被公平对待',
  scorpio: '感受藏得深，信任慢，一旦交心就很深',
  sagittarius: '心里要留出口，憋太久就想逃开喘口气',
  capricorn: '不轻易示弱，靠扛事换踏实，也容易把自己扛累',
  aquarius: '情绪也要一点距离，太黏会想抽身',
  pisces: '感受先于语言，边界一软就替人难过',
}

/** 上升：外在姿态 */
const ASC = {
  aries: '别人先感到你的直接与冲劲',
  taurus: '别人先感到你的稳与慢热',
  gemini: '别人先感到你的轻快与会聊',
  cancer: '别人先感到你的柔软与护人',
  leo: '别人先感到你的亮与存在感',
  virgo: '别人先感到你的细致与靠谱',
  libra: '别人先感到你的得体与好商量',
  scorpio: '别人先感到你的静与看不透',
  sagittarius: '别人先感到你的开阔与热',
  capricorn: '别人先感到你的沉与靠得住',
  aquarius: '别人先感到你的特别与抽离',
  pisces: '别人先感到你的柔与梦幻',
}

const TEASER = {
  aries: '你身上有一股往前冲的热。停不下来的时候，光也散得快。',
  taurus: '你像要把安全感握在手里。慢，是因为你要踏实。',
  gemini: '念头跳得很快，像同时开了两扇窗。风一来，字就飘。',
  cancer: '你很会护人，也很容易被潮汐带走。壳一关，里面却在听。',
  leo: '你需要被看见，不是虚荣——是火要有人映着才暖。',
  virgo: '你眼里全是细节。收得太整齐，有时会把自己也收紧。',
  libra: '你在两端之间找平衡。美和公平，都像秤上的砝码。',
  scorpio: '你看得深，也藏得深。靠近你的人，会先碰到水底的静。',
  sagittarius: '你想走远一点。远方一亮，脚就痒。',
  capricorn: '你扛得住山。目标一立，就会一阶一阶爬。',
  aquarius: '你有点不合群的清醒。人群里，你仍留着自己的频率。',
  pisces: '你边界软，梦也深。一不小心就游进别人的情绪海里。',
}

const TIP_BY_SUN = {
  aries: '要留意：抢跑太快，或把脾气当效率。',
  taurus: '要留意：过度求稳，错过该松手的窗口。',
  gemini: '要留意：话说一半、选择悬着，重点被吹散。',
  cancer: '要留意：替别人操心过头，忘了自己的岸。',
  leo: '要留意：太需要被回应时，把自己耗干。',
  virgo: '要留意：收得太紧，连自己也一并收疼。',
  libra: '要留意：两边都想顾，最后谁都不落地。',
  scorpio: '要留意：藏太深，连该说的也不说。',
  sagittarius: '要留意：远方一亮就丢下手头，散了阵脚。',
  capricorn: '要留意：只会扛，不会把累说出来。',
  aquarius: '要留意：抽离成习惯，关系里留了空窗。',
  pisces: '要留意：边界一软，就游进别人的情绪海。',
}

export function astroTeaser(astro) {
  return TEASER[astro.sunSign] || TEASER.leo
}

export function toAstroReading(astro) {
  const sun = BY_ID[astro.sunSign] || BY_ID.leo
  const moon = BY_ID[astro.moonSign] || sun
  const body = [
    `太阳在${sun.cn}——这是你的核心：${SUN[sun.id] || SUN.leo}。`,
    `月亮在${moon.cn}——私下里你更需要：${MOON[moon.id] || MOON.leo}。`,
  ]
  if (astro.hourKnown && astro.ascSignCn) {
    const ascId = astro.ascSign
    body.push(
      `上升在${astro.ascSignCn}——别人先碰到的是这一面：${ASC[ascId] || '你的外在姿态'}。`,
    )
    body.push(
      `合在一起：心里（月亮）有一套需求，表面上（上升）另一套温度，而太阳拉着你往「${SUN[sun.id]}」那边长。`,
    )
  } else {
    body.push(
      `合在一起：太阳是你想成为的样子，月亮是你真正被安抚的方式——两者对上，人才不拧巴。`,
    )
  }
  body.push(TIP_BY_SUN[sun.id] || TIP_BY_SUN.leo)
  return {
    title: `${sun.cn}座`,
    body,
    teaser: astroTeaser(astro),
  }
}

/** 命名后：近期走向（按月亮情绪气 + 太阳课题） */
const NEAR_BY_MOON = {
  火: {
    opener: '这几天情绪来得快，心里一点火星就容易往外窜。',
    middle: '近期要留意：冲动承诺，或把脾气当成决断。',
    advice: '先停半息，再动最烫的那一件。',
  },
  土: {
    opener: '这阵子你更想求稳，变化一来心里就沉。',
    middle: '近期要留意：把犹豫拖成堵车，或过度防备。',
    advice: '只推进已经铺开的那一层，少开新线。',
  },
  风: {
    opener: '这几天念头跳，信息一多心里就坐不住。',
    middle: '近期要留意：话说一半、选择悬着。',
    advice: '今天先定一个小决定并说清楚。',
  },
  水: {
    opener: '这阵子潮汐偏明显，关系里的牵绊会先碰到你。',
    middle: '近期要留意：替别人操心过头，边界一软就累。',
    advice: '先护住自己的岸，再决定要不要渡人。',
  },
}

export function astroPhaseReading(astro, flameName) {
  const name = flameName || '我'
  const el = astro.moonElement || astro.element || '火'
  const pack = NEAR_BY_MOON[el] || NEAR_BY_MOON.火
  const ascBit = astro.hourKnown && astro.ascSignCn
    ? `上升${astro.ascSignCn}这几天也更显眼，别人先看到你这一面。`
    : ''
  return {
    opener: `嗯…${name}看着你。${pack.opener}`,
    middle: [pack.middle, ascBit].filter(Boolean).join(''),
    advice: pack.advice,
  }
}

export const ASTRO_INTERPRET_HINT = [
  '你是温柔的现代占星陪伴者：太阳=核心；月亮=情绪；上升=外显（有则用）。',
  '先分别说清代表什么，再给整体印象；可轻提警惕。禁止谈百分比。',
  '有出生时间就用上升；没有就只谈太阳与月亮——不要追问缺时间。',
  '禁止对用户提：调用工具、查询、获取数据、API。你已经看见了。',
  '不恐吓、不算死；说人话，短段落，不用 markdown。',
].join('\n')
