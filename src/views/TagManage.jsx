import BackButton from '../components/BackButton.jsx'

export default function TagManage({ profile, setProfile, back }) {
  const tags = profile?.tags || []

  const toggle = (id) => {
    setProfile?.((p) => ({
      ...p,
      tags: (p.tags || []).map((t) => (t.id === id ? { ...t, active: !t.active } : t)),
    }))
  }

  return (
    <div className="screen tag-manage-screen">
      <div className="topbar">
        <BackButton onClick={back} />
        <div className="topbar-title">标签管理</div>
      </div>

      <div className="tag-manage-body">
        <div className="nc-head">
          <h3>社交标签</h3>
          <span className="nc-edit" aria-hidden>✎</span>
        </div>
        <ul className="tag-manage-list">
          {tags.map((t) => (
            <li
              key={t.id}
              className={`tag-manage-row${t.active ? ' on' : ''}`}
              style={{ '--tag': t.color || '#666' }}
            >
              <span className="tag-manage-label">{t.label}</span>
              <button
                type="button"
                className={`toggle${t.active ? ' on' : ''}`}
                role="switch"
                aria-checked={t.active}
                aria-label={`${t.active ? '关闭' : '打开'}${t.label}`}
                onClick={() => toggle(t.id)}
              >
                <i />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
