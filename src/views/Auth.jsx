// 登录 / 邀请码注册。内测阶段的作用是「换设备也能找回自己的火苗」。
import { useState } from 'react'
import Logo from '../components/Logo.jsx'
import Flame from '../components/Flame.jsx'
import { login, register } from '../lib/api.js'

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login') // login | register
  const [invite, setInvite] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const isRegister = mode === 'register'

  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    setErr('')
    setBusy(true)
    try {
      const user = isRegister
        ? await register(username.trim(), password, invite.trim())
        : await login(username.trim(), password)
      onAuthed(user)
    } catch (e2) {
      setErr(e2.message || '出了点问题，再试一次')
      setBusy(false)
    }
  }

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register')
    setErr('')
  }

  return (
    <div className="screen auth-screen">
      <div className="topbar">
        <Logo />
      </div>

      <div className="auth-flame">
        <Flame state="orb" size={190} />
      </div>

      <p className="auth-lead">
        {isRegister ? '有人给了你一句暗号，才能把这团光点亮。' : '你回来了。报个名字，我就认得出。'}
      </p>

      <form className="auth-form" onSubmit={submit}>
        {isRegister && (
          <label className="auth-field">
            <span className="auth-label">邀请码</span>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              placeholder="朋友给你的那串字母"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
          </label>
        )}

        <label className="auth-field">
          <span className="auth-label">名字</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="中英文都行，2–20 位"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>

        {err && <p className="auth-err">{err}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? '……' : isRegister ? '点亮它' : '进去'}
        </button>
      </form>

      <button type="button" className="auth-switch" onClick={switchMode}>
        {isRegister ? '已经有账号了，去登录' : '第一次来？我有邀请码'}
      </button>
    </div>
  )
}
