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
let elementsReady = null

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

function whenCanPlay(el) {
  if (!el) return Promise.resolve()
  if (el.readyState >= 3) return Promise.resolve() // HAVE_FUTURE_DATA
  return new Promise((resolve) => {
    const done = () => {
      el.removeEventListener('canplay', done)
      el.removeEventListener('canplaythrough', done)
      el.removeEventListener('error', done)
      resolve()
    }
    el.addEventListener('canplay', done, { once: true })
    el.addEventListener('canplaythrough', done, { once: true })
    el.addEventListener('error', done, { once: true })
    // 别卡太久：最多等 2.5s 也开播
    setTimeout(done, 2500)
  })
}

/** 尽早创建 <audio> 并开始拉文件（不播放） */
export function preloadAudio() {
  if (!bgmEl) {
    bgmEl = new Audio(bgmUrl)
    bgmEl.loop = true
    bgmEl.preload = 'auto'
    try { bgmEl.load() } catch { /* ignore */ }
  }
  if (!fireEl) {
    fireEl = new Audio(fireUrl)
    fireEl.loop = true
    fireEl.preload = 'auto'
    try { fireEl.load() } catch { /* ignore */ }
  }
  if (!elementsReady) {
    elementsReady = Promise.all([whenCanPlay(bgmEl), whenCanPlay(fireEl)])
  }
  return elementsReady
}

async function ensureGraph() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return false

  preloadAudio()

  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') {
    try { await ctx.resume() } catch { /* autoplay policy */ }
  }

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

  // MediaElementSource 每个 element 只能挂一次
  if (!bgmNode && bgmEl) {
    bgmNode = ctx.createMediaElementSource(bgmEl)
    bgmNode.connect(bgmGain)
  }
  if (!fireNode && fireEl) {
    fireNode = ctx.createMediaElementSource(fireEl)
    fireNode.connect(fireGain)
  }

  return true
}

// allowed() 在真正 play 前再查一次开关，避免等待期间用户已关掉导致声音又被拉起
async function playEl(el, allowed = () => true) {
  if (!el) return false
  try {
    // 已在播就别打断
    if (!el.paused && !el.ended) return true
    await whenCanPlay(el)
    if (!allowed()) return false
    await el.play()
    return true
  } catch {
    return false
  }
}

export function isBgmWanted() {
  return wanted
}

/** 音乐总开关：开 = BGM + 篝火叠加；关 = 全部静音 */
export async function setBgmOn(on) {
  wanted = !!on
  savePref(wanted)
  await ensureGraph()

  if (!wanted) {
    // 不强制 currentTime=0，下次开得更快
    if (bgmEl) bgmEl.pause()
    if (fireEl) fireEl.pause()
    return false
  }

  // BGM 与篝火并行起播，避免串行等大文件
  const tasks = [playEl(bgmEl, () => wanted)]
  if (fireWanted) tasks.push(playEl(fireEl, () => wanted && fireWanted))
  const [ok] = await Promise.all(tasks)
  return ok
}

/** 小火苗出场后：标记想要篝火声；只有音乐总开关开着才真的出声 */
export async function startFireCrackle({ volume = FIRE_VOL } = {}) {
  fireWanted = true
  if (!wanted) return false
  await ensureGraph()
  if (fireGain) fireGain.gain.value = Math.max(0, Math.min(1, volume))

  const tasks = [playEl(fireEl, () => wanted && fireWanted), playEl(bgmEl, () => wanted)]
  const [ok] = await Promise.all(tasks)
  return ok
}

export function stopFireCrackle() {
  fireWanted = false
  if (!fireEl) return
  fireEl.pause()
  fireEl.currentTime = 0
}

/** 任意交互后恢复被拦的自动播放；进页即预加载 */
export function bindBgmUnlock() {
  wanted = loadBgmPref()
  // 首屏就开始拉 mp3，别等到点播放才下
  preloadAudio()

  const resume = () => {
    ensureGraph().then(() => (wanted ? setBgmOn(true) : null))
  }
  window.addEventListener('pointerdown', resume)
  return () => window.removeEventListener('pointerdown', resume)
}
