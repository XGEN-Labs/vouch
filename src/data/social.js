/** 社交主流程本地 mock / helpers（无后端） */

import photoMe from '../assets/relations/me.svg'
import photoAlex from '../assets/relations/alex.svg'
import photoIvy from '../assets/relations/ivy.svg'
import photoMomo from '../assets/relations/momo.svg'
import photoNia from '../assets/relations/nia.svg'
import photoZoe from '../assets/relations/zoe.svg'
import photoMino from '../assets/relations/mino.svg'
import photoTaro from '../assets/relations/taro.svg'
import photoSora from '../assets/relations/sora.svg'
import { BAZI_ANALYSIS_VERSION, computeBazi } from '../bazi.js'
import { GAN_PROFILE, joinTalents, parseTalents, phaseReading, teaserFor, toReading } from './persona.js'
import { ensureGuardian, toGuardianIdentity } from '../lib/guardianSpirit.js'

export const MY_PHOTO = photoMe

/** 用户自己上传的头像；没有则返回 null（名片等处用 agent 占位） */
export function myPhotoOf(profile) {
  return profile?.photo || null
}

/** 标签色板：'colorful' 低饱和彩色 | 'blue' 蓝色系。改这一处即可切换。 */
export const TAG_PALETTE = 'colorful'

const TAG_COLORS_COLORFUL = ['#B8C8D0', '#D4B896', '#C4B5C8', '#B8C8A8', '#A8A8B8', '#D8A8A0', '#B0C4C0']
const TAG_COLORS_BLUE = ['#7eb6e0', '#5b9ec9', '#a5d9f1', '#6aa8d4', '#8ebad8', '#4a8cbe', '#b8d4ea']
const TAG_COLORS = TAG_PALETTE === 'blue' ? TAG_COLORS_BLUE : TAG_COLORS_COLORFUL

const TAG_SWATCH = {
  colorful: {
    dayMaster: '#D4B896',
    talent: '#B8C8A8',
    sun: '#D4B896',
    place: '#C4B5C8',
    enfp: '#B8C8A8',
    night: '#A8A8B8',
    ai: '#B8C8D0',
    wine: '#D8A8A0',
    ski: '#B0C4C0',
    plant: '#B8C8A8',
    hike: '#B0C4C0',
    chat: '#C4B5C8',
    infj: '#A8A8B8',
    coffee: '#D4B896',
    intp: '#B8C8D0',
    game: '#C4B5C8',
    film: '#D8A8A0',
    bay: '#B8C8D0',
    climb: '#B8C8A8',
  },
  blue: {
    dayMaster: '#8ebad8',
    talent: '#6aa8d4',
    sun: '#a5d9f1',
    place: '#7eb6e0',
    enfp: '#6aa8d4',
    night: '#5b9ec9',
    ai: '#b8d4ea',
    wine: '#7eb6e0',
    ski: '#8ebad8',
    plant: '#7eb6e0',
    hike: '#9dc3e6',
    chat: '#7eb6e0',
    infj: '#5b9ec9',
    coffee: '#8ebad8',
    intp: '#8ebad8',
    game: '#5b9ec9',
    film: '#7eb6e0',
    bay: '#5b9ec9',
    climb: '#7eb6e0',
  },
}

export function tagTone(key) {
  return TAG_SWATCH[TAG_PALETTE][key] || TAG_COLORS[0]
}

const TAG_ID_SWATCH = {
  'day-master': 'dayMaster',
  'talent-0': 'talent',
  'talent-1': 'talent',
  sun: 'sun',
  place: 'place',
  enfp: 'enfp',
  night: 'night',
  ai: 'ai',
  wine: 'wine',
  ski: 'ski',
}

export function agentNameOf(profile) {
  if (profile?.activeSystem === 'astro') {
    return profile?.astro?.flameName || `${profile?.astro?.sunSignCn || '星'}灵`
  }
  return profile?.guardian?.name || profile?.flameName || '小火苗'
}

function talentTagsFor(profile) {
  return parseTalents(GAN_PROFILE[profile?.bazi?.dayMaster]?.talent).map((label, i) => ({
    id: `talent-${i}`,
    label,
    color: tagTone('talent'),
    active: true,
  }))
}

function mergeTalentTags(profile, tags) {
  const list = Array.isArray(tags) ? [...tags] : []
  const incoming = talentTagsFor(profile)
  if (!incoming.length) return list
  const haveId = new Set(list.map((t) => t.id))
  const haveLabel = new Set(list.map((t) => t.label))
  const extra = incoming.filter((t) => !haveId.has(t.id) && !haveLabel.has(t.label))
  if (!extra.length) return list
  const idx = list.findIndex((t) => t.id === 'day-master')
  const at = idx >= 0 ? idx + 1 : 0
  return [...list.slice(0, at), ...extra, ...list.slice(at)]
}

export function buildDefaultTags(profile) {
  const tags = []
  const bazi = profile?.bazi
  if (bazi?.dayMaster) {
    tags.push({
      id: 'day-master',
      label: `${bazi.dayMaster}${bazi.dayMasterWuXing || ''}`,
      color: tagTone('dayMaster'),
      active: true,
    })
  }
  tags.push(...talentTagsFor(profile))
  if (profile?.astro?.sunSignCn) {
    tags.push({
      id: 'sun',
      label: `太阳${profile.astro.sunSignCn}`,
      color: tagTone('sun'),
      active: true,
    })
  }
  if (profile?.place) {
    tags.push({ id: 'place', label: profile.place, color: tagTone('place'), active: true })
  }
  tags.push(
    { id: 'enfp', label: 'ENFP', color: tagTone('enfp'), active: true },
    { id: 'night', label: '夜猫子', color: tagTone('night'), active: false },
    { id: 'ai', label: 'AI', color: tagTone('ai'), active: false },
    { id: 'wine', label: '酒蒙子', color: tagTone('wine'), active: true },
    { id: 'ski', label: '滑雪爱好者', color: tagTone('ski'), active: false },
  )
  return tags.map((t, i) => ({ ...t, color: t.color || TAG_COLORS[i % TAG_COLORS.length] }))
}

function defaultAbout(profile) {
  const name = profile?.userName || '你'
  const p = GAN_PROFILE[profile?.bazi?.dayMaster]
  if (p) {
    const skill = joinTalents(p.talent)
    return skill
      ? `${name}是${p.essence}，擅长${skill}。喜欢和有趣的灵魂交朋友。`
      : `${name}是${p.essence}。喜欢和有趣的灵魂交朋友。`
  }
  return `${name}性格活泼，喜欢和有趣的灵魂交朋友。做事有点三分钟热度，但对感兴趣的事物有极大的热情。`
}

function defaultMemories() {
  return {
    recent: [
      '开始随身带相机',
      '收藏了 12 条深圳徒步路线，只走了 2',
      '最近循环：落日飞车',
      '最近在想：找个舒服的人一起探索深圳',
      '阳台新添了彩芋，浇水节奏还没摸准',
      '夜猫子，灵感多半在十一点以后',
      '想把梧桐山走一遍，但还没定哪条线',
      '周末爱在华侨城晃，不太爱排长队',
      '朋友局上会喝一点，但更想找人慢慢聊',
    ],
    want: '东西涌徒步 · 海边拍照 · 找家店坐一下午 · 梧桐山泰山涧 · 胶片店冲洗',
  }
}

// 只在关系星图上出现的演示联系人
const GALAXY_EXTRAS = [
  { id: 'ivy', name: 'Ivy', photo: photoIvy, chatVolume: 26, badge: 2, agentName: '雾雾', bio: '常约饭搭子，最近迷上骑行。' },
  { id: 'momo', name: 'Momo', photo: photoMomo, chatVolume: 18, agentName: '棉棉', bio: '插画师，周末摆摊卖贴纸。' },
  { id: 'sora', name: 'Sora', photo: photoSora, chatVolume: 12, badge: 1, agentName: '青苔', bio: '在读研究生，桌游收藏家。' },
  { id: 'nia', name: 'Nia', photo: photoNia, chatVolume: 7, badge: 1, agentName: '夜莺', bio: '刚搬来深圳，摄影爱好者。' },
  { id: 'taro', name: 'Taro', photo: photoTaro, chatVolume: 4, agentName: '芋圆', bio: '猫片供应商，程序员。' },
  { id: 'zoe', name: 'Zoe', photo: photoZoe, chatVolume: 2, agentName: '早早', bio: '朋友的朋友，见过一次面。' },
].map((c) => ({ ...c, known: true, tags: [], avatarTone: '#aebcc5' }))

export const DEMO_CONTACTS = [
  {
    id: 'alex',
    name: 'Alex Wang',
    age: 22,
    gender: 'f',
    location: '深圳大学·经济学硕士',
    intro: '喜欢摄影和大自然徒步的在读硕士生',
    plainTags: ['AI', '夜猫子', '深圳大学·经济学硕士', '酒蒙子'],
    bio: '在湾区写代码，周末爬山。想认识爱聊星座又不玄学的人。',
    tags: [
      { label: 'ENFP', color: tagTone('enfp') },
      { label: 'Bay Area', color: tagTone('bay') },
      { label: '爬山', color: tagTone('climb') },
    ],
    avatarTone: '#5c6bc0',
    agentName: '小北斗',
    photo: photoAlex,
    chatVolume: 0,
    known: false,
  },
  {
    id: 'penny',
    name: 'Penny',
    age: 24,
    gender: 'f',
    location: '香港大学·植物学博士',
    intro: '养猫养多肉、泡在咖啡馆的植物学博士',
    plainTags: ['香港大学·植物学博士', '猫奴', '咖啡因依赖'],
    bio: '养猫、养多肉，咖啡馆常客。最近在研究阳台植物。',
    tags: [
      { label: 'INFJ', color: tagTone('infj') },
      { label: '植物', color: tagTone('plant') },
      { label: '咖啡', color: tagTone('coffee') },
    ],
    avatarTone: '#ef9a9a',
    agentName: '绒球',
    chatVolume: 0,
    known: false,
  },
  {
    id: 'mino',
    name: 'Mino',
    age: 26,
    location: '独立游戏工作室·主程',
    intro: '夜里才上线的独立游戏制作人',
    plainTags: ['独立游戏工作室·主程', '冷笑话十级', '胶片感'],
    bio: '做独立游戏，夜里才上线。喜欢冷笑话和胶片感。',
    tags: [
      { label: 'INTP', color: tagTone('intp') },
      { label: '独立游戏', color: tagTone('game') },
      { label: '胶片', color: tagTone('film') },
    ],
    avatarTone: '#80cbc4',
    agentName: '像素火',
    photo: photoMino,
    chatVolume: 15,
    known: true,
  },
  ...GALAXY_EXTRAS,
]

export const DEMO_FRAGMENTS = [
  {
    id: 'frag-caladium',
    date: '2026-08-16',
    tag: '阳台植物饲养员',
    tagColor: tagTone('plant'),
    topics: ['植物', '阳台', '彩芋'],
    title: 'Tressi 最近彻底掉进彩芋叶的坑里了',
    summary: '阳台那几盆彩芋，是你自己的事。先记在这里，跟谁聊天都无关。',
    quote: '养植物比谈恋爱踏实——你对它好，它真的会长出新叶子给你看。',
    body: [
      '这周阳台又添了三盆：Pink Splash、White Lover、还有一棵草莓星。',
      '叶子展开的时候光线会从叶脉透过来，整片粉白像被水洗过。',
      '浇水别勤，等表层干了再给；通风比加湿更重要。',
    ],
  },
  {
    id: 'frag-hike',
    date: '2026-08-10',
    tag: '周末出门',
    tagColor: tagTone('hike'),
    topics: ['徒步', '深圳', 'Alex'],
    with: ['alex'],
    title: '一条还没走完的海岸线',
    summary: '更早的时候你就想找人一起慢慢走。那条还没走完的海岸线，我一直替你收着——现在 Alex 出现了。',
    quote: '风很大的时候，说话会不自觉地变慢。',
    body: [
      '你说过想找人一起慢慢走。那天下午风很大，从地铁口走到海边要四十分钟，路上全是卖椰子的摊。',
      '我记下了：下次想带个愿意并肩不说话的人。现在 Alex 出现了。',
    ],
  },
  {
    id: 'frag-wutong',
    date: '2026-08-20',
    tag: '刚认识',
    tagColor: tagTone('hike'),
    topics: ['徒步', '梧桐山', 'Alex'],
    with: ['alex'],
    title: '她问了梧桐山，泰山涧被点了心',
    summary: '你们刚互相介绍完。Alex 问你一般在哪儿徒步，你说深圳附近。她想去梧桐山，却不知道走哪条线——小北斗推荐了泰山涧。我看你点了个心。',
    quote: '根据你俩的情况我比较推荐泰山涧。',
    body: [
      '四个人刚进房间。小北斗说 Alex 是一只话很多的快乐小狗；我跟他们打招呼，说随时可以 @ 我们。',
      'Alex 问你一般在哪儿徒步。你说就深圳附近。她说最近也想去梧桐山，但不知道哪条线，于是喊了小北斗。',
      '泰山涧，三个到四个小时，难度中上，山川溪流很多。你给那条推荐点了心。我猜，下次你们真的会去。',
    ],
  },
]

// 旧存档色 → 当前色板
const COLOR_MIGRATE_CREAM = {
  '#9aaa5a': '#b5bd8f',
  '#f0c040': '#ecd9a0',
  '#78909c': '#b0a8c9',
  '#66bb6a': '#93c98b',
  '#90a4ae': '#c3a6e1',
  '#ab47bc': '#aebfa8',
  '#ec407a': '#f0a8c0',
  '#546e7a': '#9fb8c8',
  '#7cb342': '#a5c99b',
  '#42a5f5': '#9dc3e6',
  '#8ebad8': '#b5bd8f',
  '#a5d9f1': '#ecd9a0',
  '#7eb6e0': '#a5c99b',
  '#6aa8d4': '#93c98b',
  '#5b9ec9': '#c3a6e1',
  '#b8d4ea': '#aebfa8',
  '#4a8cbe': '#9fb8c8',
}
const COLOR_MIGRATE_BLUE = {
  '#9aaa5a': '#8ebad8',
  '#f0c040': '#a5d9f1',
  '#78909c': '#7eb6e0',
  '#66bb6a': '#6aa8d4',
  '#90a4ae': '#8ebad8',
  '#ab47bc': '#5b9ec9',
  '#ec407a': '#7eb6e0',
  '#546e7a': '#4a8cbe',
  '#7cb342': '#6aa8d4',
  '#42a5f5': '#5b9ec9',
  '#b5bd8f': '#8ebad8',
  '#ecd9a0': '#a5d9f1',
  '#b0a8c9': '#7eb6e0',
  '#93c98b': '#6aa8d4',
  '#c3a6e1': '#5b9ec9',
  '#aebfa8': '#b8d4ea',
  '#f0a8c0': '#7eb6e0',
  '#9fb8c8': '#8ebad8',
  '#a5c99b': '#7eb6e0',
  '#f2c894': '#8ebad8',
  '#aebcc5': '#9dc3e6',
  '#a1887f': '#8ebad8',
  '#ffa726': '#7eb6e0',
  '#5c6bc0': '#5b9ec9',
}
const COLOR_MIGRATE = TAG_PALETTE === 'blue' ? COLOR_MIGRATE_BLUE : COLOR_MIGRATE_CREAM

const CONTACT_TAG_SWATCH = {
  ENFP: 'enfp',
  'Bay Area': 'bay',
  爬山: 'climb',
  INFJ: 'infj',
  植物: 'plant',
  咖啡: 'coffee',
  INTP: 'intp',
  独立游戏: 'game',
  胶片: 'film',
}

function paintTag(t, i = 0) {
  if (String(t.id || '').startsWith('talent')) return { ...t, color: tagTone('talent') }
  const fromId = TAG_ID_SWATCH[t.id]
  const fromLabel = CONTACT_TAG_SWATCH[t.label]
  const key = fromId || fromLabel
  if (key) return { ...t, color: tagTone(key) }
  if (COLOR_MIGRATE[t.color]) return { ...t, color: COLOR_MIGRATE[t.color] }
  return { ...t, color: t.color || TAG_COLORS[i % TAG_COLORS.length] }
}

function stripFragmentImages(fragment) {
  const clean = { ...fragment }
  delete clean.images
  return clean
}

function refreshBaziAnalysis(profile) {
  if (!profile?.bazi?.dayMaster || profile.bazi.analysisVersion === BAZI_ANALYSIS_VERSION) return profile
  const birthday = profile.birthday || {}
  const oldInput = profile.bazi.input || {}
  const year = birthday.y || oldInput.year
  const month = birthday.m || oldInput.month
  const day = birthday.d || oldInput.day
  if (!year || !month || !day) return profile

  const bazi = computeBazi({
    year,
    month,
    day,
    hour: profile.hour ?? oldInput.hour ?? '',
    minute: profile.minute ?? oldInput.minute ?? 0,
    gender: profile.gender || oldInput.gender || 'male',
    place: profile.place || oldInput.place || '',
  })
  const base = toReading(bazi)
  const reading = profile.activeSystem === 'astro'
    ? profile.reading
    : { ...base, teaser: teaserFor(bazi), source: 'traditional-v2' }
  const guardian = profile.guardian
    ? { ...profile.guardian, baziIdentity: toGuardianIdentity(bazi) }
    : profile.guardian

  return {
    ...profile,
    bazi,
    reading,
    phase: profile.flameName ? phaseReading(bazi, profile.flameName) : profile.phase,
    guardian,
  }
}

/** 保证 profile 带上社交字段；不覆盖用户已改内容 */
export function ensureSocialProfile(profile) {
  if (!profile) return profile
  const next = { ...refreshBaziAnalysis(profile) }
  if (Array.isArray(next.tags) && next.tags.length) {
    next.tags = mergeTalentTags(next, next.tags).map((t, i) => paintTag(t, i))
  }
  if (Array.isArray(next.fragments) && next.fragments.length) {
    next.fragments = next.fragments.map((f) => {
      const clean = stripFragmentImages(f)
      return COLOR_MIGRATE[clean.tagColor] ? { ...clean, tagColor: COLOR_MIGRATE[clean.tagColor] } : clean
    })
    const have = new Set(next.fragments.map((f) => f.id))
    const demoById = Object.fromEntries(DEMO_FRAGMENTS.map((f) => [f.id, f]))
    next.fragments = next.fragments.map((f) => {
      const demo = demoById[f.id]
      if (!demo) return f
      return {
        ...f,
        with: f.with || demo.with,
        summary: f.summary || demo.summary,
        tagColor: demo.tagColor || f.tagColor,
      }
    })
    for (const f of DEMO_FRAGMENTS) {
      if (!have.has(f.id)) {
        next.fragments = [
          ...next.fragments,
          stripFragmentImages(f),
        ]
      }
    }
  }
  if (!next.about) next.about = defaultAbout(profile)
  // 老存档里的旧默认文案也一并替换
  const rec = next.memoriesForFriends?.recent || []
  const oldDefault = rec[0]?.includes('出门会背一台相机') || (rec[0] === '开始随身带相机' && rec.length <= 4)
  if (!next.memoriesForFriends || oldDefault) next.memoriesForFriends = defaultMemories()
  if (!Array.isArray(next.tags) || !next.tags.length) next.tags = buildDefaultTags(profile)
  if (!Array.isArray(next.contacts) || !next.contacts.length) {
    next.contacts = DEMO_CONTACTS.map((c) => ({ ...c, tags: (c.tags || []).map((t) => ({ ...t })) }))
  } else {
    // 老存档：补上新增的演示联系人和照片字段
    const have = new Set(next.contacts.map((c) => c.id))
    const demoById = Object.fromEntries(DEMO_CONTACTS.map((c) => [c.id, c]))
    next.contacts = next.contacts.map((c) => {
      const demo = demoById[c.id]
      if (!demo) return c
      const merged = { ...c }
      if (!merged.photo && demo.photo) merged.photo = demo.photo
      if (merged.badge == null && demo.badge != null) merged.badge = demo.badge
      if (Array.isArray(merged.tags)) {
        merged.tags = merged.tags.map((t, i) => paintTag(t, i))
      }
      // 推荐卡：发出邀请且对方同意前，不出现在关系里
      if ((c.id === 'alex' || c.id === 'penny') && !merged.introSent && !merged.mutual) {
        merged.known = false
        if ((merged.chatVolume || 0) <= 22) merged.chatVolume = 0
      }
      if (c.id === 'alex' && (merged.chatVolume || 0) <= 1 && !merged.badge) merged.badge = null
      return merged
    })
    for (const c of DEMO_CONTACTS) {
      if (!have.has(c.id)) next.contacts.push({ ...c, tags: (c.tags || []).map((t) => ({ ...t })) })
    }
  }
  if (!Array.isArray(next.fragments) || !next.fragments.length) {
    next.fragments = DEMO_FRAGMENTS.map(stripFragmentImages)
  }
  return ensureGuardian(next)
}

export function activeTags(profile) {
  return (profile?.tags || []).filter((t) => t.active)
}

export function knownContacts(profile) {
  return (profile?.contacts || []).filter((c) => c.known)
}

/**
 * 关系星图布局（参考设计稿）：
 * - 我在中心；聊得越多 → 头像越大、占越靠前的位置
 * - 位置槽按设计稿手排，围着中心一圈
 * - 「远星」= 双方都点了认识、但还没怎么聊过（mutual 且 chatVolume ≤ 1）
 *   挂在星图外围，虚线双环，只露出对方的精灵；聊起来之后并入星系
 */
const GALAXY_SLOTS = [
  { dx: -130, dy: -22, size: 82 },  // 左侧大头像
  { dx: -28, dy: -140, size: 74 },  // 上方（角标2）
  { dx: -66, dy: 128, size: 74 },   // 下方
  { dx: 108, dy: 82, size: 71 },    // 右下
  { dx: 116, dy: -84, size: 54 },   // 右上（角标1）
  { dx: 56, dy: 182, size: 48 },    // 底部
  { dx: 152, dy: 8, size: 36 },     // 右侧小
  { dx: -140, dy: 92, size: 34 },   // 左下小
]

const OUTPOST_SLOTS = [
  { dx: 124, dy: -198, size: 52 },
  { dx: -124, dy: -186, size: 52 },
  { dx: 156, dy: -96, size: 52 },
  { dx: -156, dy: -88, size: 52 },
]

export function galaxyLayout(contacts) {
  const list = [...(contacts || [])].filter((c) => c.known)
  if (!list.length) return []
  const sorted = [...list].sort((a, b) => (b.chatVolume || 0) - (a.chatVolume || 0))
  let slotIdx = 0
  let outpostIdx = 0
  return sorted.map((c) => {
    const isNew = c.mutual && (c.chatVolume || 0) <= 1
    if (isNew) {
      const s = OUTPOST_SLOTS[outpostIdx % OUTPOST_SLOTS.length]
      outpostIdx += 1
      return { ...c, outpost: true, dx: s.dx, dy: s.dy, size: s.size }
    }
    const s = GALAXY_SLOTS[slotIdx % GALAXY_SLOTS.length]
    slotIdx += 1
    return { ...c, outpost: false, dx: s.dx, dy: s.dy, size: s.size }
  })
}

export function bumpChatVolume(profile, contactId, by = 1) {
  const contacts = (profile?.contacts || []).map((c) => (
    c.id === contactId ? { ...c, chatVolume: (c.chatVolume || 0) + by } : c
  ))
  return { ...profile, contacts }
}

export function markKnown(profile, contactId) {
  const contacts = (profile?.contacts || []).map((c) => (
    c.id === contactId ? { ...c, known: true } : c
  ))
  return { ...profile, contacts }
}

export function sendIntro(profile, contactId) {
  const contacts = (profile?.contacts || []).map((c) => (
    c.id === contactId ? { ...c, introSent: true } : c
  ))
  return { ...profile, contacts }
}

export function markMutual(profile, contactId) {
  const contacts = (profile?.contacts || []).map((c) => (
    c.id === contactId
      ? { ...c, introSent: true, mutual: true, known: true, chatVolume: c.chatVolume || 0 }
      : c
  ))
  return { ...profile, contacts }
}

export function clearBadge(profile, contactId) {
  const contacts = (profile?.contacts || []).map((c) => (
    c.id === contactId ? { ...c, badge: null } : c
  ))
  return { ...profile, contacts }
}

export function findContact(profile, contactId) {
  return (profile?.contacts || []).find((c) => c.id === contactId) || null
}

export function fragmentsOnDate(profile, dateStr) {
  return (profile?.fragments || []).filter((f) => f.date === dateStr)
}

export function fragmentById(profile, id) {
  return (profile?.fragments || []).find((f) => f.id === id) || null
}

export function fragmentsWith(profile, contactId) {
  if (!contactId) return []
  const name = findContact(profile, contactId)?.name?.split(' ')[0]
  return (profile?.fragments || [])
    .filter((f) => (
      (f.with || []).includes(contactId)
      || (name && (f.topics || []).some((t) => String(t).toLowerCase() === name.toLowerCase()))
    ))
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export function mergeFragment(profile, frag) {
  if (!frag?.id) return profile
  const list = profile?.fragments || []
  if (list.some((f) => f.id === frag.id)) return profile
  return { ...profile, fragments: [frag, ...list] }
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 和某人聊出一句值得记下的话时，收进总的记忆碎片（每人每天最多一条） */
export function captureChatFragment(profile, contact, userText) {
  if (!contact?.id) return profile
  const text = (userText || '').trim()
  if (!text) return profile
  const day = todayStr()
  const id = `frag-dm-${contact.id}-${day}`
  if ((profile?.fragments || []).some((f) => f.id === id)) return profile
  const name = (contact.name || '对方').split(' ')[0]
  const clip = text.length > 22 ? `${text.slice(0, 22)}…` : text
  return mergeFragment(profile, {
    id,
    date: day,
    with: [contact.id],
    tag: '刚刚聊过',
    tagColor: tagTone('chat'),
    topics: [name],
    title: `和 ${name} 又说上了`,
    summary: `今天你和 ${name} 聊到「${clip}」。我觉得值得记下，已经放进你的碎片里。`,
    quote: text.length > 42 ? `${text.slice(0, 42)}…` : text,
    body: [
      `房间里四个人。你先开口：「${text}」。`,
      `我看着 ${name} 回你。这种刚刚认识、话已经接上的感觉，我想帮你留着。`,
    ],
  })
}
