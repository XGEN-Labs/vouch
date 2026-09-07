const MIN_POINTS = 4
const MIN_LIVED_POINTS = 2
const MAX_PUSH = 3
const THEMES = {
  '现场音乐': ['音乐节', 'livehouse', '演出', '摇滚', '音乐'], '展览与视觉': ['展览', '看展', '视觉设计', '摄影'],
  '城市漫步': ['citywalk', '城市散步', '城市探索', '探店'], '骑行户外': ['骑行', '攀岩', '徒步', '露营'],
  '旅行潜水': ['旅行', '潜水', '海边'], '电影影像': ['电影', '纪录片'], '咖啡手冲': ['咖啡', '手冲'],
  '阅读出版': ['阅读', '出版'], '游戏桌游': ['游戏', '桌游'], '运动身体': ['篮球', '跑步', '瑜伽', '健身'],
  '互联网产品': ['产品经理', '互联网产品', 'ai产品'], '技术工程': ['工程师', '技术', 'ai'],
  '创业': ['创业', '从0到1'], '职业转型': ['跳槽', '转型', '晋升'], '设计创意': ['设计', '创意'],
}
const ZODIAC = ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座']
const PHASE = [2,-3,8,-10,12,-6,4]

const text = (...xs) => xs.flat(Infinity).filter(Boolean).join('｜').toLowerCase()
const has = (hay, words) => words.some((w) => hay.includes(w.toLowerCase()))

function walkDisplayable(node, out = []) {
  if (Array.isArray(node)) node.forEach((x) => walkDisplayable(x, out))
  else if (node && typeof node === 'object') {
    if (typeof node.content === 'string' && node.permissions?.matching_use !== false && !['explicit_private','sensitive_personal','third_party_sensitive','inferred_sensitive','identifying_info','sensitive_event'].includes(node.privacy)) out.push(node.content)
    Object.values(node).forEach((x) => walkDisplayable(x, out))
  }
  return [...new Set(out)]
}

function intentCats(record) {
  const si = record?.['05_Matching_Profile']?.Social_Intent || {}
  const raw = text(si.connection_goal?.content, (si.derived_intents || []).map((x) => x.intent), si.current_motivation?.content)
  const cats = new Set()
  if (has(raw, ['朋友','认识新','建立朋友'])) cats.add('friend')
  if (has(raw, ['活动','看展','电影','旅行','骑行','搭子','周末','桌游'])) cats.add('activity')
  if (has(raw, ['创业','职业','同行','转型','跳槽','技术'])) cats.add('career')
  if (has(raw, ['恋爱','相亲','桃花']) && !has(raw, ['不接受恋爱','没有明确恋爱','不急'])) cats.add('romance')
  if (has(raw, ['没有主动','不主动扩展','不新增关系','不寻找'])) cats.add('closed')
  return cats
}

function flatten(row) {
  const r = row.record || {}
  const core = r['00_Core_Profile'] || {}
  const ident = core.identity || {}
  const memory = r['01_Self_Memory'] || {}
  const matching = r['05_Matching_Profile'] || {}
  const summary = r['06_User_Summary'] || {}
  const app = r._app_profile || {}
  const contents = walkDisplayable(memory)
  const hobbies = walkDisplayable(memory.interest || {})
  const intent = matching.Social_Intent || {}
  const derived = intent.derived_intents || []
  return {
    id: row.id, nickname: ident.nickname || row.username, gender: ident.gender || '', age: ident.age || app.age || null,
    city: core.residence?.city || '', status: matching.Social_Status || {}, style: matching.Social_Style || {},
    intents: intentCats(r), primaryIntent: summary.Current_Social_Intent?.primary_intent || derived[0]?.intent || '',
    modes: derived.map((x) => x.interaction_mode).filter(Boolean), constraints: intent.hard_constraints || [],
    contents, hobbies, blob: text(contents, Object.values(summary.Domain_Summaries?.Core_Domains || {})),
    zodiac: app.astro?.sunSignCn || '', mbti: app.mbti || '', dayMaster: app.bazi?.dayMaster || '',
  }
}

function constraintCheck(a, b) {
  const ac = text(a.constraints), bc = text(b.constraints)
  if (a.age && b.age && has(ac, ['年龄差']) && Math.abs(a.age - b.age) > 8) return [false, `年龄差 ${Math.abs(a.age-b.age)} 岁`]
  const aOnline = has(text(a.modes, ac), ['只接受线上','未来半年只接受线上'])
  const bOnline = has(text(b.modes, bc), ['只接受线上','未来半年只接受线上'])
  if (aOnline && has(bc, ['只接受线下','必须线下','稳定线下'])) return [false, '互动方式冲突']
  if (bOnline && has(ac, ['只接受线下','必须线下','稳定线下'])) return [false, '互动方式冲突']
  if (has(ac, ['不接受恋爱']) && b.intents.has('romance')) return [false, '不接受恋爱向匹配']
  return [true, '硬约束通过']
}

function intentFit(a, b) {
  if (a.intents.has('closed') || b.intents.has('closed')) return [false, '当前没有扩圈意图']
  const overlap = [...a.intents].filter((x) => x !== 'romance' && b.intents.has(x))
  const themes = themeHits(a.blob).filter((x) => themeHits(b.blob).includes(x))
  return overlap.length || themes.length ? [true, overlap.length ? `意图相合：${overlap.join('、')}` : `共同主题：${themes.join('、')}`] : [false, '社交意图不匹配']
}

function themeHits(blob) { return Object.entries(THEMES).filter(([, keys]) => has(blob, keys)).map(([k]) => k) }
function zodiacScore(a, b) {
  const x = ZODIAC.indexOf(a.endsWith('座') ? a : `${a}座`), y = ZODIAC.indexOf(b.endsWith('座') ? b : `${b}座`)
  if (x < 0 || y < 0) return 0
  const d = Math.min(Math.abs(x-y), 12-Math.abs(x-y)); return Math.max(60, Math.min(100, Math.round(60 + ((70 + PHASE[d] - 57) / 29) * 40)))
}
function mbtiScore(a, b) {
  if (!a || !b || a.length !== 4 || b.length !== 4) return 0
  const same = [...a.toUpperCase()].map((c,i) => c === b.toUpperCase()[i]); const weights=[.15,.35,.3,.2], vals=[same[0]?72:80,same[1]?82:70,same[2]?80:76,same[3]?74:82]
  let raw=vals.reduce((s,v,i)=>s+v*weights[i],0); if(same.filter(Boolean).length===2) raw+=3; if(!same[1]&&!same[2]) raw-=4
  return Math.max(60,Math.min(100,Math.round(60+((raw-70.1)/14)*40)))
}

function collectPoints(a, b) {
  const points=[]; const add=(source,title,detail,lived=true)=>points.push({kind:'similar',source,title,detail,lived})
  for (const theme of themeHits(a.blob).filter((x)=>themeHits(b.blob).includes(x)).slice(0,4)) add('hobby',`都对「${theme}」有感觉`,`${b.nickname}的真实经历里也出现了这个主题。`)
  if (a.intents.has('activity')&&b.intents.has('activity')) add('intent','都在找能一起做事的人','不是泛泛扩圈，第一次互动有自然由头。')
  if (a.intents.has('career')&&b.intents.has('career')) add('intent','都能把职业处境当正经话题聊','可以交流正在做的难事、选择和节奏。')
  const as=text(a.style.maintenance_style), bs=text(b.style.maintenance_style)
  if (as && as===bs) add('style','联系频率预期接近','关系维护节奏相似。')
  const zs=zodiacScore(a.zodiac,b.zodiac), ms=mbtiScore(a.mbti,b.mbti)
  if(zs>=90) add('zodiac',`星座匹配 ${zs} 分`,'娱乐性开场上下文。',false)
  if(ms>=90) add('mbti',`MBTI 匹配 ${ms} 分`,'沟通节奏可能合拍或互补。',false)
  return points
}

export function matchUser(userId, rows) {
  const users=rows.filter((x)=>x.record).map(flatten); const me=users.find((x)=>String(x.id)===String(userId)); if(!me) return null
  const recommendations=[], scan=[]
  for(const other of users){
    if(other.id===me.id) continue
    if(recommendations.length>=MAX_PUSH) break
    const [ok,reason]=constraintCheck(me,other); if(!ok){scan.push({id:other.id,stage:'constraint',passed:false,reason});continue}
    const [fit,fitReason]=intentFit(me,other); if(!fit){scan.push({id:other.id,stage:'intent',passed:false,reason:fitReason});continue}
    const points=collectPoints(me,other), lived=points.filter((x)=>x.lived).length
    if(points.length<MIN_POINTS||lived<MIN_LIVED_POINTS){scan.push({id:other.id,stage:'points',passed:false,reason:`只有 ${points.length} 个点，其中生活向 ${lived} 个`});continue}
    recommendations.push({user:{id:other.id,nickname:other.nickname,city:other.city},intent_fit:fitReason,constraint_note:reason,points:points.slice(0,6),point_count:points.length,scores:{zodiac:zodiacScore(me.zodiac,other.zodiac),mbti:mbtiScore(me.mbti,other.mbti)}})
    scan.push({id:other.id,stage:'push',passed:true,reason:`收集到 ${points.length} 个点`})
  }
  return {user:{id:me.id,nickname:me.nickname},recommendations,scan_log:scan,closed:me.intents.has('closed')}
}
