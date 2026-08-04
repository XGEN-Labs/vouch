// 日主人格化层 —— 把日主天干变成一个"小火苗式"的角色，附带解读话术。
// 玄境里这层是 LLM 优先、模板兜底；此处纯前端复现，用模板生成。
import { SHENG, KE } from '../bazi.js'

// 十天干 → 意象名 / 本质 / 一句自述
export const GAN_PROFILE = {
  甲: { element: '木', name: '参天之木', essence: '向上生长的、有主心骨的木',
    lines: ['你是那种一旦扎了根，就想一直往上长的人。',
      '不太会拐弯，认定的方向就直直地走。别人绕三圈，你宁可撞一次墙。',
      '你撑得起别人，却很少让别人撑你——像树，习惯了自己接住风。'] },
  乙: { element: '木', name: '藤蔓之木', essence: '柔韧的、会攀附也会缠绕的草木',
    lines: ['你看起来软，其实比谁都韧。',
      '你不硬碰，你绕过去、缠上来、慢慢往有光的地方长。',
      '你很会照顾人，但心里那点犟，只有很熟的人才碰得到。'] },
  丙: { element: '火', name: '太阳之火', essence: '外放的、普照的、藏不住的火',
    lines: ['你一进门，屋子就亮了——不是你想，是你藏不住。',
      '你的热情是真的，但也真的很耗你自己。',
      '你需要被看见，就像太阳需要有人抬头。这不丢人。'] },
  丁: { element: '火', name: '灯烛之火', essence: '内敛的、温暖近处的、怕被吹灭的火',
    lines: ['你是那种明明已经决定了，还要再问三个人的人。',
      '不是没主见——你太清楚每个选择会失去什么，所以宁可多问一遍，把责任分掉一点。',
      '你的光不大，但离你近的人，都被你暖过。别人一句话你能来回过三遍。'] },
  戊: { element: '土', name: '城墙之土', essence: '厚重的、能扛事的、慢热的土',
    lines: ['你是大家默认"没事，他扛得住"的那个人。',
      '你确实扛得住，只是没人问过你累不累。',
      '你慢热，认人也认得慢，可一旦认了，就是墙一样地站在那儿。'] },
  己: { element: '土', name: '田园之土', essence: '柔软的、能容纳万物的、滋养型的土',
    lines: ['你像一块被翻松过的地，什么种子撒进来你都想让它活。',
      '你太会共情，别人的情绪你全接住，自己的却常常没处放。',
      '你不争，但你记得每一个对你好过的人。'] },
  庚: { element: '金', name: '剑戟之金', essence: '刚硬的、果决的、有锋刃的金',
    lines: ['你是那种能一句话戳到点、也能一句话得罪人的人。',
      '你讨厌拖泥带水，该断的关系你断得比谁都快。',
      '硬是你的保护色。其实被你在意的人，你会用最笨的方式对他好。'] },
  辛: { element: '金', name: '珠玉之金', essence: '精致的、敏感的、要被好好对待的金',
    lines: ['你对美和对错都很敏感，一点不对劲你立刻感觉得到。',
      '你要的不多，但要得精——宁缺毋滥这四个字像为你写的。',
      '你外表清冷，心里却记仇也记恩，都记得很久。'] },
  壬: { element: '水', name: '江河之水', essence: '奔流的、聪明的、藏不住劲的水',
    lines: ['你的脑子转得比嘴快，常常想到第三步了，别人还在第一步。',
      '你不喜欢被框住，一被安排死就想找缝隙钻出去。',
      '你看起来随和，其实心里有一整条河的方向，只是没打算解释给谁听。'] },
  癸: { element: '水', name: '雨露之水', essence: '细腻的、渗透的、润物无声的水',
    lines: ['你是那种什么都看在眼里、却不一定说出来的人。',
      '你的温柔是渗进去的，不轰烈，但很久之后对方才发现被你影响了。',
      '你心思很深，容易想太多，夜里尤其。'] }
}

const ELEMENT_COLOR = { 木: '#8fd6a8', 火: '#ffb27a', 土: '#e0c58a', 金: '#cfd8e6', 水: '#8fc0e6' }
export const elementColor = (el) => ELEMENT_COLOR[el] || '#cfd8e6'

// 月令 → 一句"季节里你这团火/木旺不旺"的点评（放大宿命感）
const MONTH_ELEMENT = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金',
  亥: '水', 子: '水', 辰: '土', 戌: '土', 丑: '土', 未: '土'
}
function seasonNote(bazi) {
  const me = bazi.dayMasterWuXing
  const monthEl = MONTH_ELEMENT[bazi.monthZhi] || '土'
  if (monthEl === me) return `你生在${monthEl}最旺的时节，本气很足，天生有股不服输的劲。`
  if (SHENG[monthEl] === me) return `你生在${monthEl}旺的时节，一直有东西在托着你、生着你，是有底气的。`
  if (SHENG[me] === monthEl) return `你生在${monthEl}当令的时节，一直在往外给、往外耗，容易累。`
  if (KE[monthEl] === me) return `你生在${monthEl}气正盛的时节，被压着长，早早就学会了自己顶住。`
  if (KE[me] === monthEl) return `你生在${monthEl}的时节，你天生就是来管住它、驯服它的。`
  return ''
}

const MONTH_CN = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

function placeNote(bazi) {
  const place = bazi.input?.place
  if (!place) return ''
  return `你从${place}来。那个地方的气，好像还留在你身上一点点。`
}

function hourNote(bazi) {
  if (!bazi.hourKnown) {
    return '时辰还看不清——但日主已经够亮了，剩下的，我们慢慢对。'
  }
  const gz = bazi.pillars?.time?.ganZhi
  const zhi = bazi.pillars?.time?.zhi
  const el = zhi ? (WUXING_HINT[zhi] || '') : ''
  return gz
    ? `你生在${gz}时${el ? `，那一阵${el}气正动` : ''}。出生那一刻的光，比别人以为的更具体。`
    : ''
}

// 地支 → 五行（供时辰文案）
const WUXING_HINT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
}

function strengthNote(bazi) {
  const el = bazi.dayMasterWuXing
  if (bazi.strength === '偏弱') return '你这团光不吵，但很容易替别人亮着，自己反而暗下去。'
  if (bazi.strength === '偏旺') return `你身上的${el}气很足，别人一靠近就感觉得到。`
  return `你不极端。${el}旺的时候能撑，弱的时候也会自己找光。`
}

function queNote(bazi) {
  const que = bazi.queWuXing || []
  if (!que.length) return ''
  if (que.length === 1) return `五行里，${que[0]}几乎没露脸——你可能会一直下意识去找它。`
  return `五行里少了${que.join('、')}，你人生里总会绕着这些缺口打转。`
}

function birthStamp(bazi) {
  const { year, month, day } = bazi.input || {}
  if (!year) return ''
  const m = MONTH_CN[month] || month
  return `${year}年${m}月${day}日生的你`
}

// 排盘 → 角色卡（开场解读）：尽量吃进生日 / 时辰 / 出生地
export function toReading(bazi) {
  const p = GAN_PROFILE[bazi.dayMaster]
  const title = `${bazi.dayMaster}${p.element}｜${p.name}`
  const stamp = birthStamp(bazi)
  const opener = stamp
    ? `${stamp}。日主${bazi.dayMaster}${p.element}，像${p.essence}。`
    : p.lines[0]
  const body = [
    opener,
    p.lines[1],
    seasonNote(bazi),
    placeNote(bazi),
    hourNote(bazi),
    strengthNote(bazi),
    queNote(bazi),
    p.lines[2],
  ]
  return { title, body: body.filter(Boolean), profile: p, teaser: TEASER_BY_GAN[bazi.dayMaster] }
}

export const TEASER_BY_GAN = {
  甲: '你身上有股往上钻的劲。像刚破土、还不肯停的芽。',
  乙: '你是那种缠上来的光。软，但一直在往有光的地方长。',
  丙: '你身上的光很盛，藏不住。像正午的太阳。',
  丁: '你身上的光，不像太阳。更像灯。',
  戊: '你站得很稳。像一片被踩了很多年的、结实的土地。',
  己: '你身上有种能种下东西的软。什么落进你这儿，都想活。',
  庚: '你身上有种凉凉的、锋利的光。像一把没出鞘的刀。',
  辛: '你身上的光很细、很讲究。像一颗被打磨过的珠子。',
  壬: '你是流动的。看着安静，其实一直在往前奔。',
  癸: '你是渗进来的那种。不响，但很久之后才发现被你润过。'
}

// 月令对日主：同气 / 生我 / 我生 / 克我 / 我克
function monthRelation(bazi) {
  const me = bazi.dayMasterWuXing
  const monthEl = MONTH_ELEMENT[bazi.monthZhi]
  if (!monthEl || !me) return 'none'
  if (monthEl === me) return 'same'
  if (SHENG[monthEl] === me) return 'sheng_me'
  if (SHENG[me] === monthEl) return 'me_sheng'
  if (KE[monthEl] === me) return 'ke_me'
  if (KE[me] === monthEl) return 'me_ke'
  return 'none'
}

const TEASER_TAIL = {
  same: {
    偏旺: '生的时节又正旺，这束光藏不住。',
    偏弱: '虽当令，却好像还差一点底气。',
    中和: '生得正是时候，光是稳的。',
  },
  sheng_me: {
    偏旺: '一直有东西在托着你，光才这么亮。',
    偏弱: '有人在生你，可你还是容易把自己耗干。',
    中和: '背后像有一股气在托着，不至于散。',
  },
  me_sheng: {
    偏旺: '光往外给得太多，也烧得快。',
    偏弱: '你一直在输出，轮到自己时常常空着。',
    中和: '你习惯照亮别人，自己那盏得记着留一点。',
  },
  ke_me: {
    偏旺: '被压着长的，往往更硬。',
    偏弱: '生的时候就被压着，所以你会格外护着自己那一点光。',
    中和: '不是没光，是很早就学会在夹缝里亮。',
  },
  me_ke: {
    偏旺: '你天生带着锋，管得住也伤得着。',
    偏弱: '你想管住什么，自己却先软了一截。',
    中和: '你身上有种能裁断的气，不张扬，但在。',
  },
  none: {
    偏旺: '这束光自己就够亮。',
    偏弱: '光不吵，但一直在。',
    中和: '不多不少，刚好能被看见。',
  },
}

/** 开场预感：按日主 + 月令关系 + 身强弱，不带城市 */
export function teaserFor(bazi) {
  const base = TEASER_BY_GAN[bazi.dayMaster] || TEASER_BY_GAN['丁']
  const rel = monthRelation(bazi)
  const strength = bazi.strength || '中和'
  const tail = TEASER_TAIL[rel]?.[strength] || TEASER_TAIL.none[strength] || ''
  return tail ? `${base}${tail}` : base
}

const WUXING_OF_GAN = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水'
}

function ganEl(gz) {
  if (!gz) return null
  return WUXING_OF_GAN[gz[0]] || null
}

function dayunTone(bazi) {
  const dy = bazi.currentDaYun?.ganZhi
  if (!dy) return { dy: null, kind: 'none' }
  const me = bazi.dayMasterWuXing
  const el = ganEl(dy)
  if (!el) return { dy, kind: 'none' }
  if (el === me) return { dy, kind: 'bijie' }       // 比劫：争、散、自立
  if (SHENG[el] === me) return { dy, kind: 'yin' }  // 印：生身、想法多
  if (SHENG[me] === el) return { dy, kind: 'shishang' } // 食伤：输出、表达
  if (KE[me] === el) return { dy, kind: 'cai' }     // 财：奔波、抓结果
  if (KE[el] === me) return { dy, kind: 'guansha' } // 官杀：压力、规矩
  return { dy, kind: 'none' }
}

const OPENER_BY = {
  // key: `${element}_${strength}` 再按需覆盖
  木_偏旺: '劲往上窜，一件事没扎稳又想开三枝新芽。',
  木_偏弱: '你想长，可风一来枝条就抖。注意力很容易被别人的事拐走。',
  木_中和: '你在长，但不慌。偶尔也会忍不住往有光的地方探一截。',
  火_偏旺: '劲儿很足，容易一件事没做完又开三件新的。光一大，也散得快。',
  火_偏弱: '很容易把注意力放在别人身上，一直照亮别人，自己那芯子反而细。',
  火_中和: '有热度，也还收得住。只是一忙起来，就容易亮过头。',
  土_偏旺: '你扛得住，也默认自己该扛。事情一多，肩膀先硬起来。',
  土_偏弱: '别人的事掉进来你就接，接完才发现自己那块地还没翻完。',
  土_中和: '你稳，但稳久了也会闷。最近像有什么要破土，又不敢全松。',
  金_偏旺: '你切得很快：该断的断、该定的定。有时锋利也会伤到旁人。',
  金_偏弱: '你心里有尺子，可一到真要落刀，又会先问三遍。',
  金_中和: '你清楚边界，偶尔也会嫌自己太清楚，活得紧了一点。',
  水_偏旺: '念头跑得比嘴快，一件事还没落地，下一条河已经改道了。',
  水_偏弱: '你看得到很多流向，却常在岸边停太久，迟迟不迈下去。',
  水_中和: '你在动，也在渗。外表安静的时候，底下其实一直有暗流。',
}

const MIDDLE_BY_DAYUN = {
  bijie: (dy) => `眼下走${dy}运，身边热闹、竞争也近。光容易被分走。`,
  yin: (dy) => `眼下走${dy}运，想法和顾虑都会变多，像一层雾罩着灯。`,
  shishang: (dy) => `眼下走${dy}运，你更想表达、想做出来给人看，也更容易耗。`,
  cai: (dy) => `眼下走${dy}运，事情和结果推着你往前跑，停不下来。`,
  guansha: (dy) => `眼下走${dy}运，规矩和压力都更明显，灯要护着才稳。`,
  none: (dy) => (dy ? `眼下走${dy}运。` : ''),
}

const ADVICE_BY = {
  木_偏旺: '最近与其再抽新枝，不如把已经扎下的根浇深一点。',
  木_偏弱: '最近先别硬撑着长高，找能托住你的人和节奏，芽才不会折。',
  木_中和: '最近适合做深一点的一件事，让主干先立住。',
  火_偏旺: '最近比起再摊大，更适合先把手里的收一收。留一口气，光才稳。',
  火_偏弱: '最近比起再开始一件新的，更适合把已经亮着的做深。火聚起来，才会越来越亮。',
  火_中和: '最近把最亮的那一盏护好，别让风把芯子吹偏。',
  土_偏旺: '最近可以少接一点别人的重量，留点地给自己。',
  土_偏弱: '最近别什么都扛。先把自己那块地犁松，再谈能养什么。',
  土_中和: '最近适合把散落的事归拢成一堆，土一实，上面才能长。',
  金_偏旺: '最近锋芒收半分。该断的断，但不必每件事都见血。',
  金_偏弱: '最近若你一直迟疑，就选一个小决定先落下去——刀要出鞘才算刀。',
  金_中和: '最近适合做清理：关系、物件、未竟的承诺，清完气才顺。',
  水_偏旺: '最近别同时开三条河。收一条主航道，流才会有力。',
  水_偏弱: '最近少在岸上想，选一件事先踏进水里，动起来雾会散。',
  水_中和: '最近适合把心里绕的那几圈理顺，水清了，你才看得见底。',
}

/** 命名后「当下阶段」：按日主五行 × 身强弱 × 大运，人人不同；不提城市 */
export function phaseReading(bazi, flameName) {
  const name = flameName || '我'
  const el = bazi.dayMasterWuXing || '火'
  const strength = bazi.strength || '中和'
  const key = `${el}_${strength}`
  const { dy, kind } = dayunTone(bazi)
  const ln = bazi.liuNian

  const situation = OPENER_BY[key] || OPENER_BY[`火_${strength}`] || OPENER_BY['火_中和']
  const opener = `嗯…${name}看着你。你现在这个阶段，${situation}`

  const midHead = MIDDLE_BY_DAYUN[kind]?.(dy) || MIDDLE_BY_DAYUN.none(dy)
  const midTail = strength === '偏旺'
    ? '但灯如果一直开到最大，芯也会先干。'
    : strength === '偏弱'
      ? '你越是想照顾全场，越容易把自己晾在暗处。'
      : '节奏一乱，光就容易闪。'
  const lnBit = ln ? `今年流年${ln}，也掺在这层气里。` : ''
  const middle = [midHead, lnBit, midTail].filter(Boolean).join('')

  const advice = ADVICE_BY[key] || ADVICE_BY[`火_${strength}`] || ADVICE_BY['火_中和']
  return { opener, middle, advice }
}

// ── 配对：两个日主之间的关系 ──────────────────────────
export function relation(aGan, bGan) {
  const a = GAN_PROFILE[aGan], b = GAN_PROFILE[bGan]
  const ea = a.element, eb = b.element
  let kind, text
  if (ea === eb) {
    kind = '比和'
    text = `${a.name}和${b.name}是同一类的火/木/水。同频，也容易较劲——你们太懂对方，好起来是知己，拧起来是照镜子。`
      .replace('火/木/水', ea)
  } else if (SHENG[eb] === ea) {
    kind = '相生'
    text = `${eb}生${ea}，${bGan}在生你、托着你。这个人会不知不觉给你力量，是那种和他待着就踏实的关系。`
  } else if (SHENG[ea] === eb) {
    kind = '相生'
    text = `${ea}生${eb}，你在生他、给他。你会想照顾这个人。一个赋予生命，一个带来光亮，是天生契合的组合。`
  } else if (KE[ea] === eb) {
    kind = '相克'
    text = `${ea}克${eb}，你天生管得住他。你们之间有张力，但张力也可能是吸引——就看谁先松手。`
  } else {
    kind = '相克'
    text = `${eb}克${ea}，这个人容易压到你。和他相处你要多护着自己一点，别把光全给出去。`
  }
  return { kind, text }
}
