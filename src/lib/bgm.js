import bgmUrl from '../assets/moonjar-drift.mp3'
import fireUrl from '../assets/fire-crackle.mp3'

const KEY = 'vouch.bgm'

let ctx = null
let bgmEl = null
let fireEl = null
let bgmNode = null
let fireNode = null
let master = null
let bgmGain = null
let fireGain = null

let wanted = false
let fireWanted = false

const BGM_VOL = 0.42
const FIRE_VOL = 0.30

export function loadBgmPref() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

function savePref(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
}

async function ensureGraph() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return false
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') await ctx.resume()

  if (!master) {
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)

    bgmGain = ctx.createGain()
    bgmGain.gain.value = BGM_VOL
    bgmGain.connect(master)

    fireGain = ctx.createGain()
    fireGain.gain.value = FIRE_VOL
    fireGain.connect(master)
  }

  if (!bgmEl) {
    bgmEl = new Audio(bgmUrl)
    bgmEl.loop = true
    bgmEl.preload = 'auto'
    bgmNode = ctx.createMediaElementSource(bgmEl)
    bgmNode.connect(bgmGain)
  }

  if (!fireEl) {
    fireEl = new Audio(fireUrl)
    fireEl.loop = true
    fireEl.preload = 'auto'
    fireNode = ctx.createMediaElementSource(fireEl)
    fireNode.connect(fireGain)
  }

  return true
}

async function playEl(el) {
  if (!el) return false
  try {
    if (el.paused) await el.play()
    return true
  } catch {
    return false
  }
}

export function isBgmWanted() {
  return wanted
}

/** 开 BGM：与篝火声叠加；关 BGM：只停曲，火若已出场可继续 */
export async function setBgmOn(on) {
  wanted = !!on
  savePref(wanted)
  await ensureGraph()

  if (!wanted) {
    if (bgmEl) {
      bgmEl.pause()
      bgmEl.currentTime = 0
    }
    return false
  }

  const ok = await playEl(bgmEl)
  // 叠加上正在/应播的篝火
  if (fireWanted) await playEl(fireEl)
  return ok
}

/** 小火苗出场后：篝火循环；若 BGM 也开着则两者叠加 */
export async function startFireCrackle({ volume = FIRE_VOL } = {}) {
  fireWanted = true
  await ensureGraph()
  if (fireGain) fireGain.gain.value = Math.max(0, Math.min(1, volume))
  const ok = await playEl(fireEl)
  // 若用户已开音乐，确保 BGM 也在播（叠加）
  if (wanted) await playEl(bgmEl)
  return ok
}

export function stopFireCrackle() {
  fireWanted = false
  if (!fireEl) return
  fireEl.pause()
  fireEl.currentTime = 0
}

/** 任意交互后恢复被拦的自动播放；BGM 与火各自按开关叠加 */
export function bindBgmUnlock() {
  wanted = loadBgmPref()
  const resume = () => {
    ensureGraph().then(() => {
      if (wanted) setBgmOn(true)
      else if (fireWanted) startFireCrackle()
    })
  }
  window.addEventListener('pointerdown', resume)
  return () => window.removeEventListener('pointerdown', resume)
}
