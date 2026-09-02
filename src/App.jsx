import { useEffect, useState } from 'react'
import Starfield from './components/Starfield.jsx'
import Onboarding from './views/Onboarding.jsx'
import Home from './views/Home.jsx'
import Memory from './views/Memory.jsx'
import Chat from './views/Chat.jsx'
import NameCard from './views/NameCard.jsx'
import TagManage from './views/TagManage.jsx'
import Relations from './views/Relations.jsx'
import DirectChat from './views/DirectChat.jsx'
import FragmentDiary from './views/FragmentDiary.jsx'
import InviteGate from './views/InviteGate.jsx'
import { bindBgmUnlock, preloadAudio } from './lib/bgm.js'
import { ensureSocialProfile } from './data/social.js'
import { getInvite, unlockInvite } from './lib/invite.js'

const KEY = 'vouch.profile'

function loadProfile() {
  if (new URLSearchParams(location.search).has('reset')) {
    localStorage.removeItem(KEY)
    return null
  }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return raw ? ensureSocialProfile(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [inviteOk, setInviteOk] = useState(() => !!getInvite())
  const [profile, setProfileRaw] = useState(loadProfile)
  const [view, setView] = useState(profile ? 'home' : 'onboarding')
  const [bgVariant, setBgVariant] = useState('default')
  const [routeParams, setRouteParams] = useState({})

  const setProfile = (updater) => {
    setProfileRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next ? ensureSocialProfile(next) : next
    })
  }

  useEffect(() => {
    if (profile) localStorage.setItem(KEY, JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    preloadAudio()
    return bindBgmUnlock()
  }, [])

  const goHome = () => {
    setRouteParams({})
    setView('home')
  }

  const go = (next, params = {}) => {
    setRouteParams(params)
    setView(next)
  }

  const finishOnboarding = (p) => {
    setProfile(ensureSocialProfile({ ...p }))
    setBgVariant('default')
    setView('home')
  }

  // 治愈主题：主流程 + 和 agent 语音房用首页底；引导 / 文字聊 / 私聊等保持黑底
  const theme = profile?.theme || 'healing'
  // dm 改成空间感房间后不再走黑底
  const darkViews = ['onboarding', 'memory', 'fragment', 'relations', 'tags', 'namecard']
  const healing = theme === 'healing' && !darkViews.includes(view)

  if (!inviteOk) {
    return (
      <div className="app-shell">
        <div className="phone theme-healing">
          <InviteGate unlock={unlockInvite} onUnlocked={() => setInviteOk(true)} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className={`phone${healing ? ' theme-healing' : ''}`}>
        <Starfield variant={view === 'onboarding' ? bgVariant : 'default'} />
        {view === 'onboarding' && <Onboarding onDone={finishOnboarding} onBgVariant={setBgVariant} />}
        {view === 'home' && <Home profile={profile} setProfile={setProfile} go={go} />}
        {view === 'chat' && (
          <Chat profile={profile} setProfile={setProfile} back={goHome} goHome={goHome} go={go} />
        )}
        {view === 'namecard' && (
          <NameCard profile={profile} setProfile={setProfile} back={goHome} go={go} />
        )}
        {view === 'tags' && (
          <TagManage profile={profile} setProfile={setProfile} back={() => go(routeParams.from === 'memory' ? 'memory' : 'namecard')} />
        )}
        {view === 'memory' && (
          <Memory profile={profile} back={goHome} go={go} />
        )}
        {view === 'fragment' && (
          <FragmentDiary
            profile={profile}
            fragmentId={routeParams.fragmentId}
            back={
              routeParams.from === 'dm'
                ? () => go('dm', { contactId: routeParams.contactId })
                : () => go('memory')
            }
          />
        )}
        {view === 'relations' && (
          <Relations profile={profile} back={goHome} go={go} />
        )}
        {view === 'dm' && (
          <DirectChat
            profile={profile}
            setProfile={setProfile}
            contactId={routeParams.contactId}
            back={() => go(routeParams.from === 'chat' ? 'chat' : 'relations')}
            go={go}
          />
        )}
      </div>
    </div>
  )
}
