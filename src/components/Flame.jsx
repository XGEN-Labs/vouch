// 小火苗角色 —— 随 state 切换对应插画：
//  'orb'    刚醒来，一团带睡眼的光
//  'flame'  排盘时，没有脸的火苗
//  'waking' 慢慢睁眼，闭眼 + 淡淡的环
//  'awake'  睁眼、带土星环的完整小火苗
import { useEffect, useState } from 'react'
import orbImg from '../assets/flame-orb.png'
import flameImg from '../assets/flame.png'
import wakingImg from '../assets/flame-waking.png'
import awakeImg from '../assets/flame-awake.png'

const SRC = {
  orb: orbImg,
  flame: flameImg,
  waking: wakingImg,
  awake: awakeImg,
}

export default function Flame({ state = 'awake', size = 300 }) {
  const [current, setCurrent] = useState(state)
  const [outgoing, setOutgoing] = useState(null)
  const [morph, setMorph] = useState('') // '' | 'cross' | 'eyes-open'

  useEffect(() => {
    if (state === current) return
    const eyesOpen = current === 'waking' && state === 'awake'
    setOutgoing(current)
    setCurrent(state)
    setMorph(eyesOpen ? 'eyes-open' : 'cross')
    const ms = eyesOpen ? 1600 : 700
    const t = setTimeout(() => {
      setOutgoing(null)
      setMorph('')
    }, ms)
    return () => clearTimeout(t)
  }, [state, current])

  return (
    <div
      className={`flame-wrap${morph === 'eyes-open' ? ' eyes-opening' : ''}`}
      style={{ width: size, height: size }}
    >
      {outgoing && (
        <img
          src={SRC[outgoing] || awakeImg}
          alt=""
          draggable={false}
          className={`flame flame-layer out flame-${outgoing}${morph === 'eyes-open' ? ' out-eyes' : ''}`}
          style={{ width: size, height: size }}
        />
      )}
      <img
        key={current}
        src={SRC[current] || awakeImg}
        alt=""
        draggable={false}
        className={`flame flame-layer in flame-${current}${morph === 'eyes-open' ? ' in-eyes' : morph === 'cross' ? ' in-cross' : ''}`}
        style={{ width: size, height: size }}
      />
      {morph === 'eyes-open' && <div className="eyes-flash" aria-hidden />}
    </div>
  )
}
