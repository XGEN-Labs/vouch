import { spiritSrc, spiritClosedSrc } from '../data/zodiacAssets.js'

/**
 * state:
 *  - 'sign' | 'closed' → 闭眼精灵（未现身）
 *  - 'awake' → 睁眼精灵
 */
export default function ZodiacAgent({ signId = 'leo', state = 'awake', size = 280 }) {
  const closed = state === 'sign' || state === 'closed'
  const src = closed ? spiritClosedSrc(signId) : spiritSrc(signId)
  return (
    <div className="zodiac-agent" style={{ width: size, height: size }}>
      <img
        src={src}
        alt=""
        draggable={false}
        className={`zodiac-img zodiac-${closed ? 'closed' : 'awake'}`}
        style={{ width: size, height: size }}
      />
    </div>
  )
}
