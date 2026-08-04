import Flame from '../components/Flame.jsx'
import Logo from '../components/Logo.jsx'
import BackButton from '../components/BackButton.jsx'
import { computeBazi } from '../bazi.js'
import { toReading, phaseReading } from '../data/persona.js'

// 记忆碎片：把出生那一刻的关键解读，存成一张张可回看的卡片。
export default function Memory({ profile, back, goHome }) {
  const p = profile || {
    userName: 'Frank', flameName: '小火苗',
    bazi: computeBazi({ year: 1995, month: 9, day: 23, hour: '', minute: 0, gender: 'male' })
  }
  const bazi = p.bazi
  const reading = p.reading || toReading(bazi)
  const phase = p.phase || phaseReading(bazi, p.flameName)
  const flameName = p.flameName || '小火苗'
  const wx = bazi.wuXingCounts

  const hourBit = bazi.hourKnown
    ? (p.hourLabel || `${bazi.pillars?.time?.ganZhi || ''}时`)
    : '时辰未详'
  const frags = [
    { h: '出生那一刻', p: `${bazi.solarDate}　${hourBit}\n${p.place || ''}\n${reading.title}` },
    { h: '它第一次看你', p: reading.body[0] },
    { h: '被取名的那天', p: `${p.userName || '你'}给我取了名字——${flameName}。` },
    { h: '此刻的它对你说', p: phase.advice },
    { h: '你的五行', p: `金${wx.金} 木${wx.木} 水${wx.水} 火${wx.火} 土${wx.土}　·　日主${bazi.dayMaster}${bazi.dayMasterWuXing}，身${bazi.strength}` }
  ]

  return (
    <div className="screen">
      <div className="topbar">
        <BackButton onClick={back} />
        <Logo onHome={goHome} />
      </div>

      <div className="flame-stage" style={{ paddingTop: 4 }}>
        <Flame state="awake" size={140} />
      </div>
      <div className="section-title">记 忆 碎 片</div>

      <div className="frag-list">
        {frags.map((f, i) => (
          <div className="frag" key={i}>
            <h4>{f.h}</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{f.p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
