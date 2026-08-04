export default function Logo({ onHome }) {
  if (onHome) {
    return (
      <button type="button" className="logo logo-btn" onClick={onHome} aria-label="回到首页">
        Vouch._.
      </button>
    )
  }
  return <span className="logo">Vouch._.</span>
}
