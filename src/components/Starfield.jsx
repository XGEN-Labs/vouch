import bg from '../assets/bg.png'
import bgOrb from '../assets/bg-orb.png'

// 双层背景：从普通星空 crossfade + 放大浮现到带光球的底图。
export default function Starfield({ variant = 'default' }) {
  const orb = variant === 'orb'
  return (
    <div className="starfield-stack" aria-hidden>
      <div
        className={`starfield-layer starfield-base${orb ? ' dim' : ''}`}
        style={{ backgroundImage: `url(${bg})` }}
      />
      <div
        className={`starfield-layer starfield-orb-layer${orb ? ' show' : ''}`}
        style={{ backgroundImage: `url(${bgOrb})` }}
      />
      {orb && <div className="orb-bloom" />}
    </div>
  )
}
