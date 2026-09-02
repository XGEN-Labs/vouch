import genderF from '../assets/chat/gender-f.svg'

export default function PersonCard({
  person,
  cta = '认识一下',
  onCta,
  onClose,
  preview,
  variant,
  className,
}) {
  if (!person) return null
  const initial = (person.name || '?').slice(0, 1)

  // 聊天内推荐卡：浅蓝横向布局（参考聊天界面设计稿）
  if (variant === 'chat') {
    return (
      <button type="button" className={`person-card--chat${className ? ` ${className}` : ''}`} onClick={(e) => onCta?.(e)}>
        <span className="pcc-avatar">
          {person.photo
            ? <img src={person.photo} alt="" draggable={false} />
            : <span className="pcc-initial">{initial}</span>}
        </span>
        <span className="pcc-body">
          <span className="pcc-name-row">
            <span className="pcc-name">{person.name}</span>
            {person.age != null && <span className="pcc-age">{person.age}</span>}
            {person.gender === 'f' && <img className="pcc-gender" src={genderF} alt="女" draggable={false} />}
          </span>
          {!!person.tags?.length && (
            <span className="pcc-tags">
              {person.tags.slice(0, 2).map((t) => (
                <span key={t.label} className="pcc-tag" style={{ background: t.color || '#78909c' }}>
                  {t.label}
                </span>
              ))}
            </span>
          )}
          <span className="pcc-loc">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden>
              <path d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 1 1 13 0c0 4.6-6.5 10-6.5 10z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            {person.location || person.bio}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className={`person-card${preview ? ' person-card--preview' : ''}`}>
      {onClose && (
        <button type="button" className="person-card-close" onClick={onClose} aria-label="关闭">×</button>
      )}
      <div className="person-card-name">{person.name}</div>
      <div
        className="person-card-avatar"
        style={{ background: person.avatarTone || '#eceff1' }}
      >
        {initial}
      </div>
      {person.bio && <p className="person-card-bio">{person.bio}</p>}
      {!!person.tags?.length && (
        <div className="tag-row tag-row-center">
          {person.tags.map((t) => (
            <span
              key={t.label}
              className="tag-pill"
              style={{ '--tag': t.color || '#78909c' }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
      {(onCta || preview) && (
        <button type="button" className="person-card-cta" onClick={onCta} disabled={!onCta}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>{cta}</span>
        </button>
      )}
    </div>
  )
}
