import doodlePlanet from '../assets/spatial/doodle-planet.svg'
import doodleStar from '../assets/spatial/doodle-star.svg'
import splashOrange from '../assets/spatial/splash-orange.svg'
import splashCream from '../assets/spatial/splash-cream.svg'

function LeafTriple({ className }) {
  return (
    <svg className={className} viewBox="0 0 297 302" aria-hidden focusable="false">
      <path d="M148.715 27.0515C112.579 4.05449 108.556 85.65 111.63 143.028C112.013 150.163 120.523 152.857 124.73 147.127C152.436 109.392 183.942 49.4695 148.715 27.0515Z" fill="currentColor" />
      <path d="M238.199 109.976C236.989 66.6422 168.011 108.442 122.763 142.844C117.132 147.125 119.633 155.836 126.65 156.222C172.884 158.764 239.379 152.225 238.199 109.976Z" fill="currentColor" />
      <path d="M166.294 260.683C208.697 256.295 162.675 189.358 125.644 145.963C121.037 140.565 112.685 143.742 112.818 150.89C113.695 197.979 124.955 264.96 166.294 260.683Z" fill="currentColor" />
    </svg>
  )
}

function LeafPair({ className }) {
  return (
    <svg className={className} viewBox="0 0 223 226" aria-hidden focusable="false">
      <path d="M28.0761 144.222C11.9647 183.91 92.9503 173.169 148.836 159.809C155.785 158.147 156.902 149.291 150.508 146.185C108.399 125.729 43.7819 105.534 28.0761 144.222Z" fill="currentColor" />
      <path d="M93.526 41.2641C51.119 50.2608 104.66 110.581 146.65 148.891C151.876 153.658 159.994 149.629 159.11 142.658C153.282 96.7221 134.871 32.4927 93.526 41.2641Z" fill="currentColor" />
    </svg>
  )
}

/** 角落花瓣：内联 SVG，避免 CSS mask 在手机上变成白方块。 */
export default function RoomScene({ variant = 'solo' }) {
  return (
    <div className={`room-bg room-bg--${variant}`} aria-hidden>
      {variant === 'solo' && (
        <>
          <LeafTriple className="rs-petal rs-petal-tr" />
          <LeafPair className="rs-petal rs-petal-bl" />
        </>
      )}
      {variant === 'group' && (
        <>
          <LeafTriple className="rs-petal rs-petal-tr" />
          <LeafPair className="rs-petal rs-petal-bl" />
          <LeafTriple className="rs-petal rs-petal-mr" />
          <i className="rs-dot rs-dot-a" />
        </>
      )}
    </div>
  )
}

/** 单人房：紫色是门；群聊：奶油泼墨 + 蓝色块 */
export function RoomBlobs({ variant = 'solo' }) {
  if (variant === 'group') {
    return (
      <div className="room-blobs room-blobs--group" aria-hidden>
        <i className="rs-bloba" />
        <img className="rs-blobb" src={splashCream} alt="" draggable={false} />
      </div>
    )
  }

  return (
    <div className="room-blobs room-blobs--solo" aria-hidden>
      <div className="rs-door">
        <i className="rs-door-panel" />
        <i className="rs-door-knob" />
        <img className="rs-doodle rs-doodle-star" src={doodleStar} alt="" draggable={false} />
      </div>
      <img className="rs-blobb" src={splashOrange} alt="" draggable={false} />
      <img className="rs-doodle rs-doodle-planet" src={doodlePlanet} alt="" draggable={false} />
      <i className="rs-dot rs-dot-a" />
    </div>
  )
}
