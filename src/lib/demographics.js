// 年龄段 / 城市线级 / 大区 —— 从真实结构化字段(生日、出生/所在地)实时派生,
// 不作为可手动编辑的标签存在。理由:这些信息本身有唯一真值,标签会和真值
// 脱节(改了城市,标签不会跟着改);而八字、星座计算已经依赖精确生日/地点,
// 派生视图直接算出来展示/筛选即可,没必要让用户重复选一遍。
//
// 用法: ageBracket({y,m,d}) / cityTier(place) / regionOf(place)

const AGE_BRACKETS = [
  { max: 18, label: ['18以下', 'Under 18'] },
  { max: 22, label: ['18-22', '18-22'] },
  { max: 26, label: ['23-26', '23-26'] },
  { max: 30, label: ['27-30', '27-30'] },
  { max: 35, label: ['31-35', '31-35'] },
  { max: 40, label: ['36-40', '36-40'] },
  { max: 45, label: ['41-45', '41-45'] },
  { max: 50, label: ['46-50', '46-50'] },
  { max: 60, label: ['51-60', '51-60'] },
  { max: Infinity, label: ['60+', '60+'] },
]

export function ageFromBirthday(birthday, now = new Date()) {
  if (!birthday || !birthday.y) return null
  const { y, m = 1, d = 1 } = birthday
  let age = now.getFullYear() - y
  const hasHadBirthdayThisYear =
    now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d)
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

export function ageBracket(birthday, now = new Date()) {
  const age = ageFromBirthday(birthday, now)
  if (age == null) return null
  const bucket = AGE_BRACKETS.find((b) => age <= b.max)
  return bucket ? { zh: bucket.label[0], en: bucket.label[1] } : null
}

// 覆盖主要城市即可,不追求详尽;匹配不到就返回 null,调用方自行 fallback 显示原始地名
const TIER1 = ['北京', '上海', '广州', '深圳']
const NEW_TIER1 = [
  '成都', '杭州', '重庆', '西安', '武汉', '苏州', '郑州', '南京', '天津', '长沙',
  '东莞', '宁波', '佛山', '合肥', '青岛', '沈阳', '昆明', '无锡', '济南', '南宁',
]

export function cityTier(place) {
  if (!place) return null
  if (TIER1.some((c) => place.includes(c))) return { zh: '一线城市', en: 'Tier-1 city' }
  if (NEW_TIER1.some((c) => place.includes(c))) return { zh: '新一线', en: 'New tier-1 city' }
  return null
}

// province/city 关键词 -> 大区,按更具体的城市名优先匹配
const REGION_MAP = [
  { region: ['东北', 'Northeast China'], keys: ['黑龙江', '吉林', '辽宁', '哈尔滨', '长春', '沈阳', '大连'] },
  { region: ['华北', 'North China'], keys: ['北京', '天津', '河北', '山西', '内蒙古', '石家庄', '太原', '呼和浩特'] },
  { region: ['西北', 'Northwest China'], keys: ['陕西', '甘肃', '青海', '宁夏', '新疆', '西安', '兰州', '西宁', '银川', '乌鲁木齐'] },
  { region: ['华东', 'East China'], keys: ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '南京', '杭州', '合肥', '福州', '南昌', '济南', '苏州', '宁波', '青岛', '厦门', '无锡'] },
  { region: ['华中', 'Central China'], keys: ['河南', '湖北', '湖南', '郑州', '武汉', '长沙'] },
  { region: ['华南', 'South China'], keys: ['广东', '广西', '海南', '广州', '深圳', '南宁', '海口', '东莞', '佛山'] },
  { region: ['西南', 'Southwest China'], keys: ['四川', '贵州', '云南', '西藏', '重庆', '成都', '贵阳', '昆明', '拉萨'] },
  { region: ['港澳台', 'HK/Macau/Taiwan'], keys: ['香港', '澳门', '台湾', '台北'] },
]

export function regionOf(place) {
  if (!place) return null
  for (const { region, keys } of REGION_MAP) {
    if (keys.some((k) => place.includes(k))) return { zh: region[0], en: region[1] }
  }
  return null
}

// 汇总一个 profile(需含 birthday / place)当前的派生画像,供筛选/展示用,
// 不落库、不参与标签编辑
export function deriveIdentityFacets(profile, now = new Date()) {
  return {
    age: ageFromBirthday(profile?.birthday, now),
    ageBracket: ageBracket(profile?.birthday, now),
    cityTier: cityTier(profile?.place),
    region: regionOf(profile?.place),
  }
}
