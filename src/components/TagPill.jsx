export default function TagPill({ label, color, dim }) {
  return (
    <span
      className={`tag-pill${dim ? ' dim' : ''}`}
      style={{ '--tag': color || '#78909c' }}
    >
      {label}
    </span>
  )
}
