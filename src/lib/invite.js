export const INVITE_KEY = 'vouch.invite'

export function getInvite() {
  try { return localStorage.getItem(INVITE_KEY) || '' } catch { return '' }
}

export function setInvite(code) {
  localStorage.setItem(INVITE_KEY, String(code || '').trim())
}

export function clearInvite() {
  localStorage.removeItem(INVITE_KEY)
}

export function inviteHeaders(extra = {}) {
  const code = getInvite()
  return {
    ...extra,
    ...(code ? { 'X-Vouch-Invite': code } : {}),
  }
}

export async function unlockInvite(code) {
  const trimmed = String(code || '').trim()
  const res = await fetch('/api/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: trimmed }),
  })
  if (!res.ok) throw new Error('invalid invite')
  setInvite(trimmed)
  return true
}
