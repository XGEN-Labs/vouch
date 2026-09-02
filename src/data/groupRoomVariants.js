import agent192 from '../assets/spatial/agent-group-192.svg'
import agent193 from '../assets/spatial/agent-group-193.svg'
import agent194 from '../assets/spatial/agent-group-194.svg'
import agent195 from '../assets/spatial/agent-group-195.svg'
import { ROOM_THEMES } from './roomThemes.js'

/**
 * 串门进入的四人房间方案。
 * Group 191 是双列布局；对方 Agent 直接取自「不同形象」Group 192–195，
 * 让联系人、对方 Agent、背景色和站位始终稳定对应。
 */
const VARIANTS = [
  {
    id: 'columns',
    theme: ROOM_THEMES.orange,
    peerAgent: agent194,
    peerAgentShape: 'g194',
  },
  {
    id: 'diagonal',
    theme: ROOM_THEMES.green,
    peerAgent: agent193,
    peerAgentShape: 'g193',
  },
  {
    id: 'cross',
    theme: ROOM_THEMES.yellow,
    peerAgent: agent192,
    peerAgentShape: 'g192',
  },
  {
    id: 'stagger',
    theme: ROOM_THEMES.peach,
    peerAgent: agent195,
    peerAgentShape: 'g195',
  },
]

const CONTACT_VARIANT = {
  alex: 0,
  penny: 1,
  mino: 2,
  ivy: 3,
  momo: 3,
  sora: 1,
  nia: 2,
  taro: 0,
  zoe: 3,
}

function hashId(value) {
  let hash = 0
  for (const char of String(value || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

export function groupRoomVariantFor(contactId) {
  const index = CONTACT_VARIANT[contactId] ?? (hashId(contactId) % VARIANTS.length)
  return VARIANTS[index]
}
