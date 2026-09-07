import { useEffect, useMemo, useState } from 'react'
import { adminOverview, adminUser } from '../lib/api.js'

const fmt = (v) => v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '—'

export default function DataBoard() {
  const [data, setData] = useState(null)
  const [detail, setDetail] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      setData(await adminOverview(''))
    } catch { setError('当前账号没有数据面板权限。请使用管理员 ChatGPT 账号访问。') }
  }
  useEffect(() => { load() }, [])
  const users = useMemo(() => (data?.users || []).filter((u) => `${u.username} ${u.nickname} ${u.city}`.toLowerCase().includes(query.toLowerCase())), [data, query])

  if (!data) return <main className="board-login"><div><span className="board-kicker">Vouch · Data Board</span><h1>用户数据工作台</h1><p>{error || '正在读取内测数据…'}</p></div></main>

  const t = data.totals
  const fragments = detail?.user?.record?._app_profile?.fragments || []
  return (
    <main className="data-board">
      <header className="board-head"><div><span className="board-kicker">Vouch · Data Board</span><h1>用户与记忆分析</h1></div><button onClick={() => load()}>刷新数据</button></header>
      <section className="board-metrics">
        <article><span>注册用户</span><b>{t.users}</b><small>{t.active7d} 位近 7 天活跃</small></article>
        <article><span>已建档</span><b>{t.profiles}</b><small>{t.users ? Math.round(t.profiles / t.users * 100) : 0}% 完成率</small></article>
        <article><span>记忆碎片</span><b>{t.fragments}</b><small>{t.visibleFragments} 条用户可见</small></article>
        <article><span>隐私拦截</span><b>{t.hiddenFragments}</b><small>{t.fragments ? Math.round(t.hiddenFragments / t.fragments * 100) : 0}% 不对用户展示</small></article>
      </section>
      <section className="board-workspace">
        <div className="board-users">
          <div className="board-section-head"><h2>用户</h2><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索名字或城市" /></div>
          <div className="board-table-wrap"><table><thead><tr><th>用户</th><th>城市</th><th>碎片</th><th>隐藏</th><th>最近更新</th></tr></thead><tbody>
            {users.map((u) => <tr key={u.id} className={detail?.user?.id === u.id ? 'selected' : ''} onClick={async () => setDetail(await adminUser('', u.id))}><td><b>{u.nickname || u.username}</b><small>@{u.username}</small></td><td>{u.city || '—'}</td><td>{u.fragmentCount}</td><td>{u.hiddenCount}</td><td>{fmt(u.updatedAt)}</td></tr>)}
          </tbody></table></div>
        </div>
        <aside className="board-detail">
          {!detail ? <div className="board-empty">选择一位用户查看完整档案</div> : <>
            <div className="board-section-head"><div><h2>{detail.user.record?.['00_Core_Profile']?.identity?.nickname || detail.user.username}</h2><p>最后活跃：{fmt(detail.user.lastSeenAt)}</p></div></div>
            <h3>记忆可见性</h3>
            <div className="privacy-list">{fragments.length ? fragments.map((f) => <article key={f.id}><span className={f.permissions?.display === false ? 'hidden' : 'visible'}>{f.permissions?.display === false ? '隐藏' : '可见'}</span><div><b>{f.title || '未命名碎片'}</b><p>{f.display_decision?.reason || '适合向用户展示'}</p></div></article>) : <p className="board-muted">暂无记忆碎片</p>}</div>
            <h3>匹配结果</h3>
            <div className="match-list">{detail.matching?.recommendations?.length ? detail.matching.recommendations.map((m) => <article key={m.user.id}><b>{m.user.nickname}</b><span>{m.point_count} 个匹配点</span><p>{m.intent_fit}</p></article>) : <p className="board-muted">暂时没有达到推荐阈值的用户</p>}</div>
            <details><summary>查看原始结构化记录</summary><pre>{JSON.stringify(detail.user.record, null, 2)}</pre></details>
          </>}
        </aside>
      </section>
    </main>
  )
}
