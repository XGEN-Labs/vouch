import { useEffect, useState } from 'react'
import Flame from '../components/Flame.jsx'
import Logo from '../components/Logo.jsx'
import jigsaw from '../assets/jigsaw.png'
import alliance from '../assets/alliance.png'
import astrology from '../assets/astrology.png'
import soundIcon from '../assets/sound.png'
import { loadBgmPref, setBgmOn, startFireCrackle } from '../lib/bgm.js'

export default function Home({ profile, go, onLogout }) {
  const name = profile?.flameName || '小火苗'
  const [bgmOn, setBgmOnState] = useState(loadBgmPref)

  useEffect(() => {
    if (bgmOn) setBgmOn(true)
    // 火已在：劈啪声继续/补上（需过用户手势后才能真正出声）
    startFireCrackle()
  }, [])

  const toggleBgm = async () => {
    const next = !bgmOn
    setBgmOnState(next)
    // 开音乐时与篝火叠加；关音乐只停曲，火继续
    await setBgmOn(next)
    if (next) await startFireCrackle()
  }

  return (
    <div className="screen">
      <div className="topbar">
        <Logo />
        {onLogout && (
          <button type="button" className="home-exit" onClick={onLogout} aria-label="退出登录">
            退出
          </button>
        )}
      </div>

      <div className="home-rail">
        <button
          className="home-memory"
          onClick={() => go('memory')}
          aria-label="记忆碎片"
        >
          <img className="ic" src={jigsaw} alt="" draggable={false} />
          <span>记忆碎片</span>
        </button>
        <button
          type="button"
          className={`home-bgm${bgmOn ? ' on' : ''}`}
          onClick={toggleBgm}
          aria-pressed={bgmOn}
          aria-label={bgmOn ? '关闭背景音乐' : '开启背景音乐'}
        >
          <img className="ic" src={soundIcon} alt="" draggable={false} />
          <span>{bgmOn ? '音乐开' : '音乐关'}</span>
        </button>
      </div>

      <div className="home-center">
        <button className="home-agent" onClick={() => go('chat')} aria-label={`和${name}对话`}>
          <Flame state="awake" size={280} />
        </button>
        <div className="home-name">{name}</div>
      </div>

      <div className="home-arc" />

      <div className="home-actions">
        <button onClick={() => go('chat')}>
          <img className="ic" src={astrology} alt="" draggable={false} />
          <span>问一问</span>
        </button>
        <button onClick={() => go('pairing')}>
          <img className="ic" src={alliance} alt="" draggable={false} />
          <span>配对</span>
        </button>
      </div>
    </div>
  )
}
