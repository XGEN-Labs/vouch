import { useCallback, useEffect, useRef, useState } from 'react'
import Starfield from './components/Starfield.jsx'
import Auth from './views/Auth.jsx'
import Onboarding from './views/Onboarding.jsx'
import Home from './views/Home.jsx'
import Pairing from './views/Pairing.jsx'
import Memory from './views/Memory.jsx'
import Chat from './views/Chat.jsx'
import { bindBgmUnlock } from './lib/bgm.js'
import * as apiClient from './lib/api.js'
import { isUnauthorized } from './lib/api.js'

// 服务端才是权威，本地这份只是离线缓存 / 首屏占位。
// key 必须带用户 id：同一台手机上换人登录，不能让后来者捡到前一个人的火苗。
const cacheKey = (uid) => `vouch.profile.${uid}`
// 有账号之前的老数据，没有归属，只在新用户还没有档案时认领一次
const LEGACY_KEY = 'vouch.profile'

const readJSON = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
const readCache = (uid) => readJSON(cacheKey(uid))
const readLegacy = () => readJSON(LEGACY_KEY)

const writeCache = (uid, p) => {
  try {
    if (p) localStorage.setItem(cacheKey(uid), JSON.stringify(p))
    else localStorage.removeItem(cacheKey(uid))
  } catch { /* 无痕模式下写不了，忽略 */ }
}
const dropLegacy = () => {
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('home')
  const [bgVariant, setBgVariant] = useState('default')
  const saveTimer = useRef(null)
  // 服务端刚给的那份 profile，用来跳过一次没有意义的回写
  const fromServer = useRef(null)

  useEffect(() => bindBgmUnlock(), [])

  // cookie 过期后任何请求 401，都把人退回登录页
  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => setUser(null))
    return () => apiClient.setUnauthorizedHandler(null)
  }, [])

  // 拉服务端的火苗档案并决定落到哪个界面。
  // 服务端为空时才看本地：先看这个账号自己的缓存，再看有账号体系之前留下的那份。
  const adoptProfile = useCallback(async (uid) => {
    const p = await apiClient.fetchProfile()
    const local = p ? null : (readCache(uid) ?? readLegacy())
    const resolved = p ?? local
    if (local) {
      // 认领成功就把无主的老数据清掉，免得下一个人登录时又被捡走
      apiClient.pushProfile(local).catch(() => {})
      writeCache(uid, local)
      dropLegacy()
    }
    fromServer.current = resolved
    setProfile(resolved)
    setView(resolved ? 'home' : 'onboarding')
  }, [])

  // 启动：先确认身份，再决定进登录页 / 诞生流程 / 主页
  useEffect(() => {
    let alive = true
    ;(async () => {
      const wantReset = new URLSearchParams(location.search).has('reset')
      try {
        const u = await apiClient.me()
        if (!alive) return
        setUser(u)

        if (wantReset) {
          await apiClient.dropProfile().catch(() => {})
          writeCache(u.id, null)
          dropLegacy()
          if (!alive) return
          setProfile(null)
          setView('onboarding')
        } else {
          await adoptProfile(u.id)
        }
      } catch (e) {
        if (!alive) return
        if (!isUnauthorized(e)) console.error('启动失败', e)
        setUser(null)
      } finally {
        if (alive) setBooting(false)
      }
    })()
    return () => { alive = false }
  }, [adoptProfile])

  // profile 变更后延迟落库，避免 onboarding 连续 setState 打出一串请求
  useEffect(() => {
    if (!user || !profile) return
    // 刚从服务端读回来的那一份不用再写回去
    if (profile === fromServer.current) return
    writeCache(user.id, profile)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      apiClient.pushProfile(profile).catch((e) => {
        if (isUnauthorized(e)) setUser(null)
        else console.error('保存失败，下次改动会重试', e)
      })
    }, 600)
    return () => clearTimeout(saveTimer.current)
  }, [profile, user])

  const onAuthed = useCallback(async (u) => {
    setUser(u)
    setBooting(true)
    try {
      await adoptProfile(u.id)
    } catch {
      setProfile(null)
      setView('onboarding')
    } finally {
      setBooting(false)
    }
  }, [adoptProfile])

  const onLogout = useCallback(async () => {
    await apiClient.logout().catch(() => {})
    // 缓存按用户分开存，退出时留着即可，下次本人登录还能秒开
    setUser(null)
    setProfile(null)
    setView('home')
  }, [])

  const goHome = () => setView('home')

  const finishOnboarding = (p) => {
    setProfile({ ...p })
    setBgVariant('default')
    setView('home')
  }

  const body = () => {
    if (booting) return <div className="boot-screen">……</div>
    if (!user) return <Auth onAuthed={onAuthed} />
    if (view === 'onboarding') return <Onboarding onDone={finishOnboarding} onBgVariant={setBgVariant} />
    if (view === 'chat') return <Chat profile={profile} back={goHome} goHome={goHome} />
    if (view === 'pairing') return <Pairing profile={profile} back={goHome} goHome={goHome} />
    if (view === 'memory') return <Memory profile={profile} back={goHome} goHome={goHome} />
    return <Home profile={profile} go={setView} onLogout={onLogout} />
  }

  const starVariant = !booting && user && view === 'onboarding' ? bgVariant : 'default'

  return (
    <div className="app-shell">
      <div className="phone">
        <Starfield variant={starVariant} />
        {body()}
      </div>
    </div>
  )
}
