const EMPTY_MEMORY = {
  pursuit: {}, interest: {}, lifestyle: {}, experience: { '记忆碎片': [] },
  inner: {}, personality: {}, identity: {}, wellbeing: {},
}

const SENSITIVE_RULES = [
  ['identifying_info', /(身份证|手机号|电话|微信号|邮箱|住址|门牌|具体学校|公司全名|账号|密码)/i],
  ['third_party_sensitive', /(室友|朋友|同事|家人|前任).{0,16}(隐私|秘密|病|收入|offer|关系|冲突)/i],
  ['sensitive_personal', /(诊断|抑郁|焦虑症|创伤|性经历|自残|债务|收入|病史)/i],
  ['sensitive_event', /(崩溃|被裁|霸凌|骚扰|负面评价|分手细节)/i],
]

export function decideMemoryVisibility(item = {}) {
  const text = [item.title, item.content, item.quote, ...(item.body || [])].filter(Boolean).join(' ')
  const explicit = item.permissions?.display
  if (explicit === false || item.privacy === 'explicit_private') {
    return { display: false, level: 'hidden', category: 'explicit_private', reason: '用户明确设为私密' }
  }
  if (item.source === 'inferred' || item.privacy === 'inferred_sensitive') {
    return { display: false, level: 'hidden', category: 'inferred_sensitive', reason: '敏感推断不直接展示' }
  }
  const hit = SENSITIVE_RULES.find(([, re]) => re.test(text))
  if (hit) return { display: false, level: 'hidden', category: hit[0], reason: '包含需要保护的敏感信息' }
  if (item.privacy && item.privacy !== 'normal') {
    return { display: false, level: 'hidden', category: item.privacy, reason: '该隐私等级默认不展示' }
  }
  return { display: true, level: 'visible', category: 'normal', reason: '适合向用户展示' }
}

export function normalizeFragment(fragment = {}) {
  const decision = decideMemoryVisibility(fragment)
  return {
    ...fragment,
    privacy: decision.category,
    permissions: {
      agent_use: fragment.permissions?.agent_use !== false,
      matching_use: fragment.permissions?.matching_use ?? decision.display,
      display: decision.display,
      external_share: fragment.permissions?.external_share === true,
    },
    display_decision: decision,
  }
}

function memoryEntry(fragment) {
  const f = normalizeFragment(fragment)
  return {
    id: f.id,
    content: [f.title, ...(f.body || [])].filter(Boolean).join('：'),
    title: f.title || '', quote: f.quote || '', body: f.body || [],
    date: f.date || '', timestamp: f.date || '', last_updated: new Date().toISOString(),
    importance: f.importance || 'medium', status: f.status || 'recorded',
    confidence: f.confidence || 'high', source: f.source || 'explicit',
    privacy: f.privacy, permissions: f.permissions, display_decision: f.display_decision,
    tag_id: f.tagId || null, tag_color: f.tagColor || null,
  }
}

export function appProfileFromStored(stored) {
  if (!stored) return null
  return stored._app_profile || stored
}

export function buildIntegratedRecord(user, profile, previous = null) {
  const birth = profile?.birthday || profile?.bazi?.input || profile?.astro?.input || {}
  const fragments = (profile?.fragments || []).map(normalizeFragment)
  const memory = structuredClone(previous?.['01_Self_Memory'] || EMPTY_MEMORY)
  memory.experience ||= {}
  memory.experience['记忆碎片'] = fragments.map(memoryEntry)

  const privacy = {
    explicit_private: [], sensitive_personal: [], third_party_sensitive: [],
    inferred_sensitive: [], identifying_info: [], sensitive_event: [],
  }
  for (const f of fragments.filter((x) => !x.permissions.display)) {
    const bucket = privacy[f.display_decision.category] || privacy.sensitive_personal
    bucket.push({
      id: f.id, content: f.title || f.quote || (f.body || [])[0] || '私密记忆',
      category: f.display_decision.category,
      permissions: f.permissions,
    })
  }

  const record = {
    schema_version: 'vouch-integrated/v2',
    '00_Core_Profile': {
      identity: {
        nickname: profile?.userName || user?.username || '', gender: profile?.gender || '',
        birth: {
          date: birth.year ? `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')}` : (birth.date || ''),
          time: birth.hour === '' || birth.hour == null ? '' : `${String(birth.hour).padStart(2, '0')}:${String(birth.minute || 0).padStart(2, '0')}`,
          time_certainty: birth.hour === '' || birth.hour == null ? 'unknown' : 'exact', place: birth.place || profile?.place || '',
        },
      },
      residence: { city: profile?.city || profile?.place || birth.place || '', timezone: 'Asia/Shanghai', history: [] },
    },
    '01_Self_Memory': memory,
    '02_Astrology_Context': {
      derived: { bazi: profile?.bazi || null, astrology: profile?.astro || null, active_system: profile?.activeSystem || 'bazi' },
      interpretation_history: previous?.['02_Astrology_Context']?.interpretation_history || [],
    },
    '03_Relationship_Record': {
      offline_relationship: previous?.['03_Relationship_Record']?.offline_relationship || [],
      in_app_relationship: profile?.contacts || [],
    },
    '04_Privacy_and_Permission': privacy,
    '05_Matching_Profile': {
      Social_Status: profile?.socialStatus || { relationship_status: 'unknown', social_availability: 'open' },
      Social_Style: profile?.socialStyle || {},
      Social_Intent: profile?.socialIntent || { connection_goal: { content: [] }, derived_intents: [], hard_constraints: [] },
    },
    '06_User_Summary': {
      Domain_Summaries: previous?.['06_User_Summary']?.Domain_Summaries || { Core_Domains: {} },
      Profile_Assertions: previous?.['06_User_Summary']?.Profile_Assertions || [],
      Current_Social_Intent: previous?.['06_User_Summary']?.Current_Social_Intent || {},
    },
    _app_profile: { ...profile, fragments },
    _meta: { user_id: user?.id, username: user?.username, updated_at: new Date().toISOString() },
  }
  return record
}

export function visibleFragments(stored) {
  return (appProfileFromStored(stored)?.fragments || []).map(normalizeFragment).filter((f) => f.permissions.display)
}
