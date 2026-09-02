function Recognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function canListen() {
  return !!Recognition()
}

export function listenHold({ onPartial, onFinal, onError }) {
  const Ctor = Recognition()
  if (!Ctor) {
    onError?.(new Error('no-speech-recognition'))
    return { stop() {} }
  }

  const rec = new Ctor()
  rec.lang = 'zh-CN'
  rec.interimResults = true
  rec.continuous = true
  let finals = ''

  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const piece = e.results[i][0]?.transcript || ''
      if (e.results[i].isFinal) finals += piece
      else interim += piece
    }
    const live = `${finals}${interim}`.trim()
    onPartial?.(live)
    if (finals.trim()) onFinal?.(finals.trim())
  }
  rec.onerror = (e) => {
    if (e.error === 'aborted' || e.error === 'no-speech') return
    onError?.(e)
  }

  try {
    rec.start()
  } catch (err) {
    onError?.(err)
  }

  return {
    stop() {
      try { rec.stop() } catch { /* already stopped */ }
    },
  }
}

export function speak(text, { onend } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onend?.()
    return () => {}
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(String(text || '').replace(/\s+/g, ' ').trim())
  if (!u.text) {
    onend?.()
    return () => {}
  }
  u.lang = 'zh-CN'
  u.rate = 1.02
  u.pitch = 1.05
  const pick = window.speechSynthesis.getVoices().find((v) => /zh[-_]?CN|Chinese/i.test(`${v.lang} ${v.name}`))
  if (pick) u.voice = pick
  u.onend = () => onend?.()
  u.onerror = () => onend?.()
  window.speechSynthesis.speak(u)
  return () => {
    try { window.speechSynthesis.cancel() } catch { /* */ }
  }
}

export function stopSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try { window.speechSynthesis.cancel() } catch { /* */ }
}
