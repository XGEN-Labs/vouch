import { useEffect, useState } from 'react'
import Starfield from './components/Starfield.jsx'
import Onboarding from './views/Onboarding.jsx'
import Home from './views/Home.jsx'
import Pairing from './views/Pairing.jsx'
import Memory from './views/Memory.jsx'
import Chat from './views/Chat.jsx'
import { bindBgmUnlock } from './lib/bgm.js'

const KEY = 'vouch.profile'

// 已经"点过火"的用户直接回到主页；?reset 可重新经历一次诞生。
function loadProfile() {
  if (new URLSearchParams(location.search).has('reset')) {
    localStorage.removeItem(KEY)
    return null
  }
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile)
  const [view, setView] = useState(profile ? 'home' : 'onboarding')
  const [bgVariant, setBgVariant] = useState('default')

  useEffect(() => {
    if (profile) localStorage.setItem(KEY, JSON.stringify(profile))
  }, [profile])

  useEffect(() => bindBgmUnlock(), [])

  const goHome = () => setView('home')

  const finishOnboarding = (p) => {
    setProfile({ ...p })
    setBgVariant('default')
    setView('home')
  }

  return (
    <div className="app-shell">
      <div className="phone">
        <Starfield variant={view === 'onboarding' ? bgVariant : 'default'} />
        {view === 'onboarding' && <Onboarding onDone={finishOnboarding} onBgVariant={setBgVariant} />}
        {view === 'home' && <Home profile={profile} go={setView} />}
        {view === 'chat' && <Chat profile={profile} back={goHome} goHome={goHome} />}
        {view === 'pairing' && <Pairing profile={profile} back={goHome} goHome={goHome} />}
        {view === 'memory' && <Memory profile={profile} back={goHome} goHome={goHome} />}
      </div>
    </div>
  )
}
