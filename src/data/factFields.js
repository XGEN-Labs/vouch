// Fact = 唯一真值的结构化字段,不是标签。用于:
//   purpose: 'filter' 可用作硬过滤条件(如同城) | 'display' 仅展示/身份佐证,不参与过滤
//   privacy 是默认可见性,单个用户可自行调整,不代表不可改
// 已在代码里存在的字段标 existing:true,不要重复建字段,只是在此显式登记语义。

export const FACT_FIELDS = [
  {
    id: 'displayName',
    label: ['用户名', 'Username'],
    type: 'string',
    purpose: 'display',
    privacy: 'public',
    existing: true, // profile.userName,Onboarding.jsx
    note: '公开展示用的昵称,不是身份证姓名。八字排盘不依赖姓名,只用生辰八字。',
  },
  {
    id: 'birthday',
    label: ['出生日期', 'Birthday'],
    type: 'date', // {y,m,d}
    purpose: 'filter', // 派生 age/ageBracket 用于筛选,见 demographics.js
    privacy: 'friends',
    existing: true, // Onboarding.jsx:44
  },
  {
    id: 'birthHour',
    label: ['出生时辰', 'Birth time'],
    type: 'time', // {hour, minute}
    purpose: 'display', // 只用于排盘计算,不用于匹配过滤
    privacy: 'private',
    existing: true, // Onboarding.jsx dataRef.current 的 hour/minute
  },
  {
    id: 'gender',
    label: ['性别', 'Gender'],
    type: 'enum',
    purpose: 'filter', // match_pref 里"只限女生/男生"依赖这个
    privacy: 'friends',
    existing: true, // Onboarding.jsx:146
  },
  {
    id: 'birthplace',
    label: ['出生地', 'Birthplace'],
    type: 'string',
    purpose: 'display', // 只用于排盘,不作为"你在哪"的匹配依据——那是 currentCity 的事
    privacy: 'private',
    existing: true, // persona.js:169 里的 place,语义在此澄清
  },
  {
    id: 'currentCity',
    label: ['现居城市', 'Current city'],
    type: 'string',
    purpose: 'filter', // 同城搭子匹配的真正依据,目前代码里缺失
    privacy: 'friends',
    existing: false, // 需要新增,不要和 birthplace 混用同一个字段
  },
  {
    id: 'height',
    label: ['身高', 'Height (cm)'],
    type: 'number',
    purpose: 'display', // 暂不作硬过滤,先展示/可选填
    privacy: 'private',
    existing: false,
    optional: true,
  },
  {
    id: 'school',
    label: ['毕业院校', 'School'],
    type: 'string',
    purpose: 'display', // 身份可信度佐证,不做过滤——过滤交给 work_study 标签
    privacy: 'friends',
    existing: false,
    optional: true,
  },
  {
    id: 'company',
    label: ['现居公司', 'Company'],
    type: 'string',
    purpose: 'display',
    privacy: 'friends',
    existing: false,
    optional: true,
  },
  {
    id: 'title',
    label: ['现任职位', 'Job title'],
    type: 'string',
    purpose: 'display',
    privacy: 'friends',
    existing: false,
    optional: true,
  },
]
