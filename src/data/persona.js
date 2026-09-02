// 日主人格化层 —— 把日主天干变成一个"小火苗式"的角色，附带解读话术。
// 玄境里这层是 LLM 优先、模板兜底；此处纯前端复现，用模板生成。
import { SHENG, KE } from '../bazi.js'

// 十天干 → 系名 / 本质 / 天赋 / 解读话术
export const GAN_PROFILE = {
  甲: {
    element: '木',
    name: '大树系',
    essence: '正直靠谱的领导者',
    talent: '领导力，规划能力',
    lines: [
      '你认定一件事后很有定力，像大树扎下根，就会朝着自己的方向一直往上长。',
      '你做事很有主心骨，想清楚了就会一步步推进，也很擅长把长远的事情规划好。',
      '你身上有种让人安心的可靠感，像一棵大树，自己站得稳，也能给身边的人依靠。',
    ],
  },

  乙: {
    element: '木',
    name: '藤蔓系',
    essence: '温柔灵活的协调者',
    talent: '人际交往，艺术感',
    lines: [
      '你很懂得顺势生长，像藤蔓草木一样，环境变了也总能找到适合自己的方向。',
      '你待人温和又懂分寸，很会看场合调整方式，让很多事情在你这里自然而然地顺了起来。',
      '你看起来温和，但遇到真正在意的事却有自己的坚持。哪怕中间需要绕一点路，也会想办法继续走下去。',
    ],
  },

  丙: {
    element: '火',
    name: '太阳系',
    essence: '热情开朗的感染者',
    talent: '感染力，表现力',
    lines: [
      '你身上自带一股明亮的能量，像太阳一样，很容易让周围的人感受到你的热情。',
      '你做喜欢的事情很容易进入状态，一旦热情被点燃，也很能带动身边的人一起行动。',
      '你很适合表达和展示自己——自己的状态越好，越容易感染到别人。',
    ],
  },

  丁: {
    element: '火',
    name: '灯火系',
    essence: '细腻通透的洞察者',
    talent: '专注力，洞察力',
    lines: [
      '你很会注意别人忽略的细节，像一盏暖灯，总能照见那些细微却重要的地方。',
      '你做真正喜欢的事情很专注，像火苗慢慢燃着，时间越久，反而越能做出自己的深度。',
      '你对人的情绪和气氛很有感知力，很多没说出口的东西，你往往也能很快察觉到。',
    ],
  },

  戊: {
    element: '土',
    name: '山峦系',
    essence: '沉稳可靠的守护者',
    talent: '执行力，包容心',
    lines: [
      '你遇到事情很能稳住局面，像厚实的大地一样，越是关键的时候越让人觉得靠得住。',
      '你做事很有执行力，认准该做的事情就会踏踏实实推进，不容易被一点变化打乱节奏。',
      '你对自己人很有保护欲——像厚土承载万物，认定的人和事，你通常都会认真守住。',
    ],
  },

  己: {
    element: '土',
    name: '沃土系',
    essence: '细致周全的经营者',
    talent: '统筹规划，耐心',
    lines: [
      '你很会把人和事情照顾周全，像一片沃土，总能让身边的一切慢慢变得更有秩序。',
      '你做事情有耐心，也很会统筹细节，很多看起来琐碎的事，到你手里反而能安排得很妥帖。',
      '你很懂得经营关系——像土地养着草木，愿意花时间，也能把一段关系慢慢养得更深。',
    ],
  },

  庚: {
    element: '金',
    name: '金石系',
    essence: '果断仗义的行动派',
    talent: '决断力，讲义气',
    lines: [
      '你判断事情很利落，复杂的问题到了你这里，往往很快就能抓住重点。',
      '你做决定很有魄力，该推进就推进，该取舍就取舍，很少让重要的事情一直悬着。',
      '你对自己人很讲义气，关键时候总会毫不犹豫地站出来。',
    ],
  },

  辛: {
    element: '金',
    name: '珠玉系',
    essence: '精致敏锐的品鉴家',
    talent: '审美力，精细度',
    lines: [
      '你对细节和质感很敏锐，像珠玉一样，越细微的地方，越能看出你独到的眼光。',
      '你有自己的审美和标准，很会分辨什么是真正适合自己的，不容易被外界随便带着走。',
      '你很擅长把事情越做越精。像玉经过打磨，细节越到位，越能显出自己的光泽。',
    ],
  },

  壬: {
    element: '水',
    name: '江海系',
    essence: '自由聪慧的探索者',
    talent: '学习力，适应力',
    lines: [
      '你的思路很开阔，像江河奔向大海一样，一个想法常常能顺势延伸出更多可能。',
      '你的学习和适应能力都很强，环境一变就会寻找新的路线，很少把自己困在一种方法里。',
      '你看起来随和，内心却很有方向。江河可以转弯，但一直都知道自己要流向哪里。',
    ],
  },

  癸: {
    element: '水',
    name: '雨露系',
    essence: '敏锐通透的谋略家',
    talent: '共情力，谋略',
    lines: [
      '你对细微变化很敏锐，像雨露一样，很多别人还没注意到的信号，你已经感受到了。',
      '你很会读懂人的情绪和想法，也懂得顺着情况调整方式，很多事情不用说透你就能明白。',
      '你的聪明更像泉水，安静却很通透——先看清局面再行动，往往更容易找到合适的解法。',
    ],
  },
}

export function parseTalents(talent) {
  if (!talent) return []
  const list = Array.isArray(talent) ? talent : String(talent).split(/[，,、]/)
  return list.map((s) => String(s).trim()).filter(Boolean)
}

export function ganProfileOf(gan) {
  return GAN_PROFILE[gan] || GAN_PROFILE['丁']
}

export function joinTalents(talent) {
  const list = parseTalents(talent)
  if (!list.length) return ''
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]}和${list[1]}`
  return `${list.slice(0, -1).join('、')}和${list[list.length - 1]}`
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
  if (monthEl === me) return `你生在${monthEl}旺的时节，自己的力量会更明显，所以很多时候，你会更有自己的想法和节奏。`
  if (SHENG[monthEl] === me) return `你生在${monthEl}旺的时节，季节之气对你有生扶，所以很多时候，你会更容易得到支持。`
  if (SHENG[me] === monthEl) return `你生在${monthEl}当令的时节，自己的力量会更多用在外面，事情一多，就容易觉得有点累。`
  if (KE[monthEl] === me) return `你生在${monthEl}气比较强的时节，外界给你的压力会更明显，所以遇到事情时，你可能会下意识多想一步。`
  if (KE[me] === monthEl) return `你生在${monthEl}的时节，自己对外界有一定的牵制，所以遇到事情时，你通常不会完全顺着走。`
  return ''
}

const MONTH_CN = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

function placeNote(bazi) {
  const place = bazi.input?.place
  if (!place) return ''
  return `你出生在${place}。这个信息主要用来排盘，真正看性格，还是要把整个命局放在一起看。`
}

function hourNote(bazi) {
  if (!bazi.hourKnown) {
    return '时辰还不确定，所以时柱这部分我先不替你下结论。'
  }
  const gz = bazi.pillars?.time?.ganZhi
  const zhi = bazi.pillars?.time?.zhi
  const el = zhi ? (WUXING_HINT[zhi] || '') : ''
  return gz
    ? `你生在${gz}时${el ? `，时支对应${el}气` : ''}。时柱会补充一些后面的信息，但不能只看这一柱。`
    : ''
}

// 地支 → 五行（供时辰文案）
const WUXING_HINT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
}

function strengthNote(bazi) {
  const el = bazi.dayMasterWuXing
  if (bazi.strength === '偏弱') {
    return `你的${el}日主偏弱，别人和环境对你的影响会更明显一些。所以很多时候，遇到事情总是习惯先把自己的感受放到后面。`
  }
  if (bazi.strength === '偏旺') {
    return `你的${el}日主偏旺，自身的力量比较足，所以很多时候，你会更坚持自己的想法，也更习惯按自己的节奏来。`
  }
  return `你的${el}日主处于中和状态，整体比较平稳。所以遇到不同事情时，调整空间也比较大。`
}

function queNote(bazi) {
  const que = bazi.queWuXing || []
  if (!que.length) return ''
  if (que.length === 1) {
    return `五行里${que[0]}相对偏少，但这不代表现实里的你就一定“缺${que[0]}”，还是要结合整个命局来看。`
  }
  return `五行里${que.join('、')}相对偏少。不过五行里的“缺”，不等于现实里一定缺什么，这部分不能单独下结论。`
}

function birthStamp(bazi) {
  const { year, month, day } = bazi.input || {}
  if (!year) return ''
  const m = MONTH_CN[month] || month
  return `${year}年${m}月${day}日生的你`
}

// 排盘 → 角色卡（开场解读）：尽量吃进生日 / 时辰 / 出生地
export function toReading(bazi = {}) {
  const p = ganProfileOf(bazi.dayMaster)
  const dm = bazi.dayMaster || ''
  const talents = parseTalents(p.talent)
  const title = `${dm}${p.element}｜${p.name}`
  const stamp = birthStamp(bazi)
  const talentBit = joinTalents(talents)
  const opener = stamp
    ? `${stamp}。日主${dm}${p.element}，${p.essence}${talentBit ? `，擅长${talentBit}` : ''}。`
    : (talentBit ? `${p.lines[0].replace(/。$/, '')}。你比较擅长${talentBit}。` : p.lines[0])
  const body = [
    opener,
    p.lines[1],
    seasonNote(bazi),
    strengthNote(bazi) || placeNote(bazi),
    hourNote(bazi) || p.lines[2],
  ]
  return {
    title,
    body: body.filter(Boolean).slice(0, 5),
    profile: p,
    talents,
    teaser: TEASER_BY_GAN[dm] || TEASER_BY_GAN['丁'],
  }
}

export const TEASER_BY_GAN = {
  甲: '你身上有一种挺稳的劲儿。认定的事情不太容易被别人带着走，很多时候也会自然地成为身边人的主心骨。',
  乙: '你看起来比较温和，但其实很有韧劲。真遇到走不通的路，你通常不是放弃，而是换条路继续走。',
  丙: '你身上比较容易有“带动别人”的感觉。开心的时候自己开心，也很容易把这种劲头传给身边的人。',
  丁: '你是那种很会察觉细节的人。别人可能觉得没什么，你却很容易发现语气、情绪或者气氛里的变化。',
  戊: '你给人的感觉通常比较可靠。事情一来你不太慌，身边的人也容易把重要的事交到你手里。',
  己: '你很容易注意到别人舒不舒服、有没有需要，也很会把身边的人和事情照顾周全。',
  庚: '你做事比较干脆，也很会抓重点。很多人还在纠结的时候，你可能已经开始想怎么把事情解决了。',
  辛: '你对细节和质感挺敏感。“差不多”有时候真的很难过你这一关，因为你总能发现那个没做到位的地方。',
  壬: '你的思路很开阔，脑子里总有新的想法和可能性。虽然看起来比较灵活，但是真正认定的方向却十分坚定。',
  癸: '你很会感受别人没说出来的东西。很多细微的变化，你往往比别人更早察觉，心里也很有自己的判断。'
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
    偏旺: '你本身的劲儿比较足，所以认定的事情，通常更容易坚持到底。',
    偏弱: '虽然生在自己的旺季，但整体力量还是偏弱，所以有时候，周围人的意见也会比较容易影响到你。',
    中和: '你的状态比较稳，既有自己的想法，也能听得进别人的意见。',
  },
  sheng_me: {
    偏旺: '命局里有力量在支持你，所以很多时候，你会比较相信自己的判断。',
    偏弱: '虽然整体力量偏弱，但命局里也有生扶你的力量，所以在合适的环境里会更容易发挥自己。',
    中和: '你身边往往不缺支持，所以很多事情既能靠自己，也容易遇到愿意帮你的人。',
  },
  me_sheng: {
    偏旺: '你本身就有不少能量，也很愿意向外投入，所以在表达、行动和创造上往往很有动力。',
    偏弱: '你很愿意把自己的力量用在重视的人和事情上，这份投入通常也很容易被别人感受到。',
    中和: '你比较习惯把自己的精力用在事情和别人身上，也很容易通过行动和表达创造价值。',
  },
  ke_me: {
    偏旺: '虽然外界给你的压力不小，但你自己的力量也够，所以很多时候，你反而会越有压力越想把事情做好。',
    偏弱: '外界的要求和压力对你的影响会比较明显，所以你可能很早就学会了保护自己的边界。',
    中和: '你会在意外界的规则和要求，但也会保留自己的判断，很懂得在两者之间找到平衡。',
  },
  me_ke: {
    偏旺: '你自己的力量比较足，也习惯主动处理问题，所以很多事情你会希望掌握主动权。',
    偏弱: '你还是会想把事情处理好，只是有些事情其实不用每一件都自己扛。',
    中和: '你对周围的人和事有自己的判断，不太会完全没有原则地顺着别人。',
  },
  none: {
    偏旺: '你自己的想法和力量比较明显，很多时候会更相信自己的判断。',
    偏弱: '周围的环境和身边的人，对你的状态会比较有影响。',
    中和: '你的状态比较平稳，保持平衡是你的常态。',
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
    木_偏旺: '你最近行动力比较强，脑子里也容易同时冒出好几个想做的事情。这个阶段更适合认准一个方向，把最重要的那件事先做出结果。',
    木_偏弱: '你有自己的想法，也比较容易根据周围的变化调整。最近更适合找到自己的节奏，让真正想做的事情慢慢扎下根。',
    木_中和: '你有自己的方向，也能听得进别人的意见。最近适合认准一件重要的事，慢慢把它做起来。',
    火_偏旺: '你最近的行动力和表达欲都比较强，看到想做的事情很容易马上进入状态。把这股热情集中起来，会更容易做出成果。',
    火_偏弱: '你最近比较容易把注意力放在别人和周围的事情上，也很能感受到身边人的状态。找到自己真正想投入的事情，会更容易发挥这份热情。',
    火_中和: '你有热情，也知道什么时候该收一收。最近把精力放在真正重要的事情上，反而更容易稳定地往前走。',
    土_偏旺: '你最近挺能扛事，很多事情到了你这里，第一反应还是“我先来吧”。把这份力量留给真正重要的事情，会更有价值。',
    土_偏弱: '你最近很容易注意到别人和周围的事情，也很愿意把事情接过来。把自己的安排也照顾周全，整体节奏会更舒服。',
    土_中和: '你最近比较想把生活过得稳一点，但心里其实也在考虑下一步。你更适合想清楚再动，一旦开始就会走得比较扎实。',
    金_偏旺: '你最近判断事情比较快，遇到问题也倾向于直接解决。把这份果断用在真正重要的选择上，会很有优势。',
    金_偏弱: '你其实有自己的标准，做决定前也习惯多确认几遍。想清楚之后相信自己的判断，很多事情会推进得更顺。',
    金_中和: '你最近会比较在意边界和分寸，什么该继续、什么该停下来，心里其实已经越来越有数了。',
    水_偏旺: '你最近脑子里很容易同时开好几个频道，新的想法一个接一个。选中一个最值得投入的方向，更容易让这些想法真正落地。',
    水_偏弱: '你最近容易想到很多可能性，也很会根据变化调整思路。找到一个合适的切口，事情往往就会慢慢流动起来。',
    水_中和: '你表面看起来比较平静，其实脑子里一直没停。最近把那些想了很久的事情理一理，真正想要的方向也会越来越清楚。',
}

const MIDDLE_BY_DAYUN = {
  bijie: (dy) => `眼下走${dy}运，身边的人和资源变化会更明显，也更容易遇到比较和竞争。`,
  yin: (dy) => `眼下走${dy}运，你会更容易把事情想深一点。好处是考虑得细，但有时候也会想得太久。`,
  shishang: (dy) => `眼下走${dy}运，你会更想表达、做事情，也更想看到自己的成果。只是别一下把所有精力都用光。`,
  cai: (dy) => `眼下走${dy}运，你会更容易把注意力放在具体的事情和结果上，忙起来以后不太容易停下来。`,
  guansha: (dy) => `眼下走${dy}运，规则、责任和外界的要求会更明显。有些事情不能只按自己的节奏来，也需要学会应对外面的要求。`,
  none: (dy) => (dy ? `眼下走${dy}运，这一阶段会有一些事情需要你重新调整。` : ''),
}

const ADVICE_BY = {
    木_偏旺: '最近更适合把力量集中在一个目标上。手里已经开始的事情，先认真做出一个结果。',
    木_偏弱: '最近更适合先把自己的节奏稳住，也可以借助身边合适的资源，让事情推进得更顺。',
    木_中和: '最近适合集中一点。选一件真正重要的事，把它一步一步做扎实。',
    火_偏旺: '最近比起继续往外加，更适合把热情集中在最重要的事情上，更容易看到成果。',
    火_偏弱: '最近更适合把精力留给真正重要的事情，已经开始的事，一件件推进反而更顺。',
    火_中和: '最近适合守住最重要的一件事，把热情稳定地放进去，事情会越来越有样子。',
    土_偏旺: '最近更适合把自己的力量留给真正值得承担的事情，这样既能做得稳，也能走得更远。',
    土_偏弱: '最近适合先把自己的节奏和优先级理清楚，再决定把精力放在哪些事情上。',
    土_中和: '最近适合先把手上的事情整理一下，让每天的节奏慢慢稳下来。',
    金_偏旺: '最近很适合发挥你的判断力和决断力，表达上多留一点余地，很多事情会推进得更顺。',
    金_偏弱: '最近可以多相信一点自己的判断，从一个小决定开始，事情动起来以后，方向也会越来越清楚。',
    金_中和: '最近适合做一次整理。把真正重要的留下，也给新的事情腾出一点空间。',
    水_偏旺: '最近适合从很多可能里选一个最值得投入的方向，让想法真正流向结果。',
    水_偏弱: '最近可以从一件小事开始行动，很多原本模糊的想法，会在过程中慢慢变清楚。',
    水_中和: '最近可以把那个一直想的问题理一理。看清自己真正想去的方向，再决定下一步。',
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
  const opener = `嗯…${name}看着你。小黑觉得你现在这个阶段，${situation}`

  const midHead = MIDDLE_BY_DAYUN[kind]?.(dy) || MIDDLE_BY_DAYUN.none(dy)
  const midTail = strength === '偏旺'
    ? '你投入很多的时候，也要记得给自己留一点余地。'
    : strength === '偏弱'
      ? '你很容易先顾别人，但自己的感受也别完全放到最后。'
      : '你的状态比较容易跟着生活节奏变化，事情太多的时候，反而容易乱。'
  const lnBit = ln ? `今年流年${ln}，也会把这一阶段的倾向再放大一点。` : ''
  const middle = [midHead, lnBit, midTail].filter(Boolean).join('')

  const advice = ADVICE_BY[key] || ADVICE_BY[`火_${strength}`] || ADVICE_BY['火_中和']
  return { opener, middle, advice }
}

// ── 配对：两个日主之间的关系 ──────────────────────────
export function relation(aGan, bGan) {
  const a = GAN_PROFILE[aGan]
  const b = GAN_PROFILE[bGan]
  if (!a || !b) return { kind: '', text: '' }
  const ea = a.element
  const eb = b.element
  if (ea === eb) {
    return {
      kind: '比和',
      text: `${a.name}和${b.name}属于同一五行，很多地方会比较像，所以容易有共同话题；彼此都有想法的时候，也很容易碰出新的火花。`,
    }
  }
  if (SHENG[eb] === ea) {
    return {
      kind: '相生',
      text: `${eb}生${ea}，对方比较容易给你一种被支持的感觉。和这个人相处时，你会更容易感受到对方接得住你。`,
    }
  }
  if (SHENG[ea] === eb) {
    return {
      kind: '相生',
      text: `${ea}生${eb}，你比较容易成为支持对方的那个人。相处久了，你会很自然地给对方帮助和推动。`,
    }
  }
  if (KE[ea] === eb) {
    return {
      kind: '相克',
      text: `${ea}克${eb}，你们看事情的角度和处理方式会有一些不同。这种差异用得好，反而很容易形成互补。`,
    }
  }
  return {
    kind: '相克',
    text: `${eb}克${ea}，对方的方式和节奏会给你带来一些不同的感受。找到彼此舒服的相处方式后，这种差异反而能形成互补。`,
  }
}
