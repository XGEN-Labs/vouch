import { useEffect, useRef, useState } from 'react'
import Flame from './Flame.jsx'
import ZodiacAgent from './ZodiacAgent.jsx'
import monsterSvg from '../assets/healing/monster.svg'
import splashSvg from '../assets/healing/splash.svg'
import flagSvg from '../assets/healing/flag.svg'

/**
 * 首页 agent 滑动：
 * - unlocked 含两个：两页 agent + 两点
 * - 只有一个：agent + 滑出「+」孵化另一系统
 */
export default function AgentCarousel({
  profile,
  activeSystem,
  onChangeSystem,
  onHatch,
  onOpenChat,
  healing = false,
}) {
  // 顺序跟孵化顺序一致：先孵的永远在第一位
  const unlocked = (profile?.unlocked || ['bazi']).filter((s) => s === 'bazi' || s === 'astro')
  const dual = unlocked.includes('bazi') && unlocked.includes('astro')
  const missing = dual ? null : (unlocked.includes('bazi') ? 'astro' : 'bazi')
  const pages = dual
    ? unlocked
    : [unlocked[0] || 'bazi', 'hatch']

  const [page, setPage] = useState(0)
  const startX = useRef(0)
  const [drag, setDrag] = useState(0)

  useEffect(() => {
    const i = pages.indexOf(activeSystem)
    if (i >= 0) setPage(i)
  }, [activeSystem, dual, unlocked.join('|')])

  const go = (i) => {
    const next = Math.max(0, Math.min(pages.length - 1, i))
    setPage(next)
    const p = pages[next]
    if (p !== 'hatch') onChangeSystem?.(p)
  }

  const onPointerDown = (clientX) => {
    startX.current = clientX
    setDrag(0)
  }
  const onPointerMove = (clientX, down) => {
    if (!down && drag === 0 && startX.current === 0) return
    setDrag(clientX - startX.current)
  }
  const onPointerUp = () => {
    if (drag < -48 && page < pages.length - 1) go(page + 1)
    else if (drag > 48 && page > 0) go(page - 1)
    setDrag(0)
    startX.current = 0
  }

  const nameFor = (sys) => {
    if (sys === 'astro') return profile?.astro?.flameName || profile?.astro?.sunSignCn || '星灵'
    return profile?.guardian?.name || profile?.flameName || '小火苗'
  }

  const renderAgent = (sys) => {
    if (sys === 'hatch') {
      return (
        <button type="button" className="home-hatch" onClick={() => onHatch?.(missing)} aria-label="孵化另一种看见">
          <span className="home-hatch-plus">+</span>
          <span className="home-hatch-label">{missing === 'astro' ? '星盘' : '八字'}</span>
        </button>
      )
    }
    if (healing) {
      return (
        <button className="home-agent heal-agent" onClick={onOpenChat} aria-label={`和${nameFor(sys)}对话`}>
          <img className="heal-splash" src={splashSvg} alt="" draggable={false} />
          <span className="heal-flagpole" aria-hidden>
            <img className="heal-flag" src={flagSvg} alt="" draggable={false} />
          </span>
          <img className="heal-monster" src={monsterSvg} alt="" draggable={false} />
        </button>
      )
    }
    if (sys === 'astro') {
      return (
        <button className="home-agent" onClick={onOpenChat} aria-label={`和${nameFor('astro')}对话`}>
          <ZodiacAgent signId={profile?.astro?.sunSign || 'leo'} state="awake" size={280} />
        </button>
      )
    }
    return (
      <button className="home-agent" onClick={onOpenChat} aria-label={`和${nameFor('bazi')}对话`}>
        <Flame state="awake" size={280} />
      </button>
    )
  }

  const showPage = pages[page] || pages[0]
  const displayName = showPage === 'hatch' ? '' : nameFor(showPage)

  // 治愈主题：暂时只展示一个精灵，不做左右切换
  if (healing) {
    const sys = unlocked.includes(activeSystem) ? activeSystem : unlocked[0] || 'bazi'
    return (
      <div className="agent-carousel">
        <div className="agent-page">{renderAgent(sys)}</div>
        <div className="home-name">{nameFor(sys)}</div>
      </div>
    )
  }

  return (
    <div className="agent-carousel">
      <div
        className="agent-track"
        onTouchStart={(e) => onPointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => onPointerMove(e.touches[0].clientX, true)}
        onTouchEnd={onPointerUp}
        onMouseDown={(e) => onPointerDown(e.clientX)}
        onMouseUp={onPointerUp}
        onMouseLeave={() => { if (drag) onPointerUp() }}
        onMouseMove={(e) => { if (e.buttons === 1) onPointerMove(e.clientX, true) }}
        style={{ transform: `translateX(calc(${-page * 100}% + ${drag}px))` }}
      >
        {pages.map((p) => (
          <div className="agent-page" key={p}>{renderAgent(p)}</div>
        ))}
      </div>
      <div className="home-name">{displayName}</div>
      <div className="dots agent-dots">
        {pages.map((p, i) => (
          <i key={p} className={i === page ? 'on' : ''} onClick={() => go(i)} />
        ))}
      </div>
    </div>
  )
}
