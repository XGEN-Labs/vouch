import Logo from '../components/Logo.jsx'
import Flame from '../components/Flame.jsx'

export default function Auth() {
  return (
    <div className="screen auth-screen">
      <div className="topbar">
        <Logo />
      </div>

      <div className="auth-flame">
        <Flame state="orb" size={190} />
      </div>

      <p className="auth-lead">
        登录后，我才能在不同设备上认出你，也能替你把记忆好好收着。
      </p>
      <a className="auth-submit auth-sites-signin" href="/signin-with-chatgpt?return_to=/">使用 ChatGPT 登录</a>
      <p className="auth-privacy">只有你能看到自己的完整档案；敏感记忆不会用于公开展示或匹配。</p>
    </div>
  )
}
