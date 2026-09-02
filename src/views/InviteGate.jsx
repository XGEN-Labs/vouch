import { useState } from 'react'

export default function InviteGate({ onUnlocked, unlock }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      await unlock(code)
      onUnlocked()
    } catch {
      setErr('邀请码不对')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen invite-screen">
      <div className="invite-card">
        <p className="invite-kicker">Vouch._.</p>
        <h1 className="invite-title">屋里还锁着</h1>
        <p className="invite-sub">有邀请码才能叫醒精灵。</p>
        <form className="invite-form" onSubmit={submit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="邀请码"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !code.trim()}>
            {busy ? '…' : '进入'}
          </button>
        </form>
        {err ? <p className="invite-err">{err}</p> : null}
      </div>
    </div>
  )
}
