import { useRef, useState } from 'react'
import BackButton from '../components/BackButton.jsx'
import TagPill from '../components/TagPill.jsx'
import mascotScribble from '../assets/relations/mascot-scribble.svg'
import monsterAvatar from '../assets/healing/monster-avatar.svg'
import { activeTags, agentNameOf, myPhotoOf } from '../data/social.js'

export default function NameCard({ profile, setProfile, back, go }) {
  const [preview, setPreview] = useState(false)
  const [editingAbout, setEditingAbout] = useState(false)
  const [showMemHint, setShowMemHint] = useState(false)
  const photoInput = useRef(null)
  const about = profile?.about || ''
  const mem = profile?.memoriesForFriends || { recent: [], want: '' }
  const tags = activeTags(profile)
  const name = profile?.userName || '我'
  const photo = myPhotoOf(profile)

  const saveAbout = (v) => {
    setProfile?.((p) => ({ ...p, about: v }))
    setEditingAbout(false)
  }

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfile?.((p) => ({ ...p, photo: reader.result }))
    reader.readAsDataURL(file)
  }

  return (
    <div className={`screen namecard-screen${preview ? ' namecard-preview-screen' : ''}`}>
      <div className="topbar">
        <BackButton onClick={preview ? () => setPreview(false) : back} />
        <div className="topbar-title">我的名片</div>
        {!preview && (
          <button type="button" className="nc-edit nc-edit-top" onClick={() => setEditingAbout(true)} aria-label="编辑">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M18.4 3.6a1.9 1.9 0 0 1 2.7 2.7L13 14.4l-3.6.9.9-3.6 8.1-8.1z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="namecard-body">
        <section className="nc-block nc-block--photo">
          <button
            type="button"
            className={`nc-photo${photo ? '' : ' nc-photo--agent'}`}
            aria-label={photo ? '更换头像' : '上传头像'}
            onClick={() => photoInput.current?.click()}
          >
            <span className={`nc-photo-ring${photo ? '' : ' agent-ava--mine'}`}>
              <img src={photo || monsterAvatar} alt="" draggable={false} />
            </span>
            <span className="nc-photo-hint">点击上传头像</span>
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={onPickPhoto}
          />
        </section>

        <section className="nc-block">
          <div className="nc-head">
            <h3 className="nc-en-title">About me</h3>
          </div>
          {editingAbout && !preview ? (
            <textarea
              className="nc-about-input"
              defaultValue={about}
              rows={4}
              autoFocus
              onBlur={(e) => saveAbout(e.target.value.trim() || about)}
            />
          ) : (
            <p className="nc-about">{about}</p>
          )}
        </section>

        {!preview && (
          <>
            <section className="nc-block">
              <div className="nc-head">
                <h3><span className="nc-en">Active</span>的社交标签</h3>
              </div>
              <div className="tag-row">
                {tags.slice(0, 8).map((t) => (
                  <TagPill key={t.id} label={t.label} color={t.color} />
                ))}
                <button type="button" className="tag-more" onClick={() => go('tags', { from: 'namecard' })} aria-label="管理标签">
                  …
                </button>
              </div>
            </section>

            <section className="nc-block nc-block--mem">
              <div className="nc-head">
                <h3 className="nc-mem-title">
                  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
                    <path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  </svg>
                  其他记忆
                </h3>
                <button
                  type="button"
                  className={`nc-q${showMemHint ? ' on' : ''}`}
                  aria-expanded={showMemHint}
                  aria-label="这段记忆有什么用"
                  onClick={() => setShowMemHint((v) => !v)}
                >
                  ?
                </button>
              </div>
              {showMemHint && (
                <div className="nc-q-popover" role="status">
                  <span className="nc-q-popover-icon" aria-hidden>✦</span>
                  <span>
                    <strong>这些信息会怎么用？</strong>
                    <small>用于生成更贴合你的推荐语，并参与朋友匹配。</small>
                  </span>
                </div>
              )}
              <div className="nc-mem-box">
                <h4 className="nc-accent">最近的{name}</h4>
                <ul className="nc-mem-list">
                  {(mem.recent || []).map((line, i) => <li key={i}>{line}</li>)}
                </ul>
                <h4 className="nc-accent">最近想做</h4>
                <p className="nc-mem-want">{mem.want}</p>
              </div>
              <div className="nc-mem-note">
                <img src={mascotScribble} alt="" draggable={false} />
                <p>这些记忆都是{agentNameOf(profile)}整理出来，用于推荐新的朋友，可在记忆碎片里回看原文。</p>
              </div>
            </section>
          </>
        )}
      </div>

      {preview && (
        <div
          className="bigcard-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(false) }}
        >
          <div className="bigcard">
            <div className="bigcard-name">{name}</div>
            <button
              type="button"
              className={`bigcard-avatar${photo ? '' : ' agent-ava--mine'}`}
              aria-label={photo ? '更换头像' : '上传头像'}
              onClick={() => photoInput.current?.click()}
            >
              <img src={photo || monsterAvatar} alt="" draggable={false} />
            </button>
            <p className="bigcard-bio">{about}</p>
            <div className="bigcard-tags">
              {tags.slice(0, 6).map((t) => (
                <span key={t.id} className="bigcard-tag" style={{ background: t.color || '#78909c' }}>
                  {t.label}
                </span>
              ))}
            </div>
            <div className="bigcard-cta">
              <span className="bigcard-cta-ic">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="bigcard-cta-label">认识一下</span>
            </div>
          </div>
          <button type="button" className="bigcard-close" onClick={() => setPreview(false)} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
              <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="namecard-footer">
        {preview ? (
          <button type="button" className="ghost-pill" onClick={() => setPreview(false)}>
            回到编辑
          </button>
        ) : (
          <button type="button" className="ghost-pill" onClick={() => setPreview(true)}>
            预览卡片
          </button>
        )}
      </div>
    </div>
  )
}
