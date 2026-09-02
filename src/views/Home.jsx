import { useEffect, useState } from 'react'
import Logo from '../components/Logo.jsx'
import AgentCarousel from '../components/AgentCarousel.jsx'
import jigsaw from '../assets/jigsaw.png'
import alliance from '../assets/alliance.png'
import astrology from '../assets/astrology.png'
import soundIcon from '../assets/sound.png'
import houseDoor from '../assets/house-door.png'
import leafB from '../assets/healing/leaf-b.svg'
import leafC from '../assets/healing/leaf-c.svg'
import healDot from '../assets/healing/dot.svg'
import healSparkle from '../assets/healing/sparkle.svg'
import healScribble from '../assets/healing/scribble.svg'
import icCard from '../assets/healing/icon-card.svg'
import icPuzzle from '../assets/healing/icon-puzzle.svg'
import { loadBgmPref, setBgmOn, stopFireCrackle } from '../lib/bgm.js'
import { computeBazi } from '../bazi.js'
import { computeAstro } from '../astro.js'
import { toReading, phaseReading, teaserFor } from '../data/persona.js'
import { toAstroReading, astroTeaser, astroPhaseReading } from '../data/astroPersona.js'
import { matchGuardian, applyGuardianName } from '../lib/guardianSpirit.js'

export default function Home({ profile, setProfile, go }) {
  const [bgmOn, setBgmOnState] = useState(loadBgmPref)
  const healing = (profile?.theme || 'healing') === 'healing'
  const unlocked = profile?.unlocked || (profile?.bazi ? ['bazi'] : ['astro'])
  const [active, setActive] = useState(profile?.activeSystem || unlocked[0] || 'bazi')

  useEffect(() => {
    // 篝火声只属于孵化场景，回到首页就停掉
    stopFireCrackle()
    if (bgmOn) setBgmOn(true)
  }, [])

  useEffect(() => {
    if (profile?.activeSystem && profile.activeSystem !== active) {
      setActive(profile.activeSystem)
    }
  }, [profile?.activeSystem])

  const toggleBgm = async () => {
    const next = !bgmOn
    setBgmOnState(next)
    await setBgmOn(next)
  }

  const changeSystem = (sys) => {
    setActive(sys)
    setProfile?.((p) => ({ ...p, activeSystem: sys }))
  }

  const hatch = (missing) => {
    if (!missing || !profile) return
    const b = profile.bazi?.input || profile.astro?.input
    if (!b) return

    const prevUnlocked = (profile.unlocked || []).filter((s) => s === 'bazi' || s === 'astro')
    const unlockedNext = prevUnlocked.includes(missing) ? prevUnlocked : [...prevUnlocked, missing]
    let next = { ...profile, unlocked: unlockedNext }

    if (missing === 'astro' && !profile.astro) {
      const astro = computeAstro({
        year: b.year, month: b.month, day: b.day,
        hour: b.hour ?? '',
        minute: b.minute ?? profile.minute ?? 0,
        place: b.place || profile.place || '',
      })
      const base = toAstroReading(astro)
      next.astro = {
        ...astro,
        reading: { ...base, teaser: astroTeaser(astro) },
        phase: astroPhaseReading(astro, `${astro.sunSignCn}灵`),
        flameName: `${astro.sunSignCn}灵`,
      }
    }

    if (missing === 'bazi' && !profile.bazi) {
      const bazi = computeBazi({
        year: b.year, month: b.month, day: b.day,
        hour: b.hour ?? '', minute: 0,
        gender: profile.gender || 'male',
        place: b.place || profile.place || '',
      })
      const base = toReading(bazi)
      next.bazi = bazi
      next.reading = { ...base, teaser: teaserFor(bazi) }
      const g = applyGuardianName(matchGuardian(bazi), next.flameName || '小火苗')
      if (g) next.guardian = g
      next.phase = phaseReading(bazi, next.flameName || g?.name || '小火苗')
      next.flameName = next.flameName || g?.name || '小火苗'
    }

    next.activeSystem = missing
    next.systemChoice = 'both'
    setActive(missing)
    setProfile?.(next)
  }

  return (
    <div className="screen">
      {healing && (
        <div className="heal-deco" aria-hidden>
          <img className="hd hd-leaf-bl" src={leafB} alt="" draggable={false} />
          <img className="hd hd-leaf-br" src={leafC} alt="" draggable={false} />
          <img className="hd hd-dot" src={healDot} alt="" draggable={false} />
          <img className="hd hd-sparkle" src={healSparkle} alt="" draggable={false} />
        </div>
      )}
      <div className="topbar">
        <Logo />
      </div>

      <div className="home-rail">
        <button className="home-rail-btn" onClick={() => go('namecard')} aria-label="我的名片">
          <img className="ic" src={healing ? icCard : houseDoor} alt="" draggable={false} />
          <span className="rail-label">我的名片</span>
        </button>
        <button className="home-rail-btn" onClick={() => go('memory')} aria-label="记忆碎片">
          <img className="ic" src={healing ? icPuzzle : jigsaw} alt="" draggable={false} />
          <span className="rail-label">记忆碎片</span>
        </button>
        <button
          type="button"
          className={`home-rail-btn${bgmOn ? ' on' : ''}`}
          onClick={toggleBgm}
          aria-pressed={bgmOn}
          aria-label={bgmOn ? '关闭音乐' : '打开音乐'}
        >
          <img className="ic" src={soundIcon} alt="" draggable={false} />
        </button>
        {/* 主题切换入口先隐藏；暗色主题的样式和 profile.theme 逻辑都保留 */}
      </div>

      <div className="home-center">
        <AgentCarousel
          profile={{ ...profile, unlocked }}
          activeSystem={active}
          onChangeSystem={changeSystem}
          onHatch={hatch}
          onOpenChat={() => go('chat')}
          healing={healing}
        />
      </div>

      <div className="home-arc" />

      <div className="home-actions">
        <button onClick={() => go('chat')} className="home-action-chat">
          <img className="ic" src={astrology} alt="" draggable={false} />
          <span>{healing ? '聊一聊' : '问一问'}</span>
          {healing && <img className="action-scribble" src={healScribble} alt="" draggable={false} />}
        </button>
        <button onClick={() => go('relations')}>
          <img className="ic" src={alliance} alt="" draggable={false} />
          <span>串门</span>
        </button>
      </div>
    </div>
  )
}
