/** 手机端输入栏发送键（图标按钮，需配合 form submit） */
export default function SendButton({ disabled }) {
  return (
    <button type="submit" className="send" aria-label="发送" disabled={disabled}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  )
}
