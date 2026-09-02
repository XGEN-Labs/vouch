/**
 * 空间感聊天的房间主题。色值按设计稿「空间感聊天+群聊」取样：
 * 自己 agent 房间 = 浅蓝底 + 右紫块 + 脚下橙泼墨
 * Alex 房间 = 橙底 + 中央奶油泼墨 + 右侧浅蓝块
 */
export const ROOM_THEMES = {
  blue: {
    bg: '#C4DDF0',
    ink: '#282928',
    dim: 'rgba(40,41,40,0.55)',
    blobA: '#9B7ED6',
    blobB: '#E0904C',
    petal: '#FFFCF7',
    doodle: '#FFFFFF',
    botBubble: '#1F1F24',
    botText: '#F4F2EC',
    userBubble: '#FFFDF8',
    userText: '#282928',
    pillBg: '#FFFDF8',
    accent: '#E09054',
  },
  orange: {
    bg: '#ED8548',
    ink: '#2A2118',
    dim: 'rgba(42,33,24,0.62)',
    blobA: '#8EC4DE',
    blobB: '#F3E6C4',
    petal: '#C5D6A0',
    doodle: '#FFF6E8',
    botBubble: '#1F1C18',
    botText: '#F6F1E8',
    userBubble: '#FFFDF6',
    userText: '#2A2118',
    pillBg: '#F4E9B8',
    accent: '#EDE47A',
  },
  green: {
    bg: '#A9CF92',
    ink: '#22301F',
    dim: 'rgba(34,48,31,0.62)',
    blobA: '#D9B3C7',
    blobB: '#F4E8C8',
    petal: '#F4F0DF',
    doodle: '#FFFFFF',
    botBubble: '#232821',
    botText: '#F1F2EA',
    userBubble: '#FFFDF4',
    userText: '#22301F',
    pillBg: '#F4F0DF',
    accent: '#E4D07C',
  },
  lilac: {
    bg: '#B4A8DE',
    ink: '#27233A',
    dim: 'rgba(39,35,58,0.62)',
    blobA: '#7FB3D8',
    blobB: '#F4E8C8',
    petal: '#F6EFFF',
    doodle: '#FFFFFF',
    botBubble: '#262332',
    botText: '#F0EEF6',
    userBubble: '#FFFCF6',
    userText: '#27233A',
    pillBg: '#F6EFFF',
    accent: '#E8B25E',
  },
  yellow: {
    bg: '#F4C153',
    ink: '#2A281F',
    dim: 'rgba(42,40,31,0.60)',
    blobA: '#306E5B',
    blobB: '#FFF2D9',
    petal: '#EC8349',
    doodle: '#FFF8E8',
    botBubble: '#23221E',
    botText: '#FFF9ED',
    userBubble: '#FFF8E9',
    userText: '#2A281F',
    pillBg: '#FFF1CF',
    accent: '#68B28E',
  },
  peach: {
    bg: '#F4DAC1',
    ink: '#2D2831',
    dim: 'rgba(45,40,49,0.58)',
    blobA: '#A26DDF',
    blobB: '#A5D9F1',
    petal: '#69B28D',
    doodle: '#FFFCF6',
    botBubble: '#252229',
    botText: '#FFF9F2',
    userBubble: '#FFFAF2',
    userText: '#2D2831',
    pillBg: '#FFFAF2',
    accent: '#70B797',
  },
}

const CONTACT_ROTATION = ['orange', 'green', 'yellow', 'peach']

export function roomThemeFor(contactId) {
  if (!contactId) return ROOM_THEMES.blue
  if (contactId === 'alex') return ROOM_THEMES.orange
  let h = 0
  for (const c of String(contactId)) h = (h * 31 + c.charCodeAt(0)) % 997
  return ROOM_THEMES[CONTACT_ROTATION[h % CONTACT_ROTATION.length]]
}
