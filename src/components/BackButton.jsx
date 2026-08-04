export default function BackButton({ onClick }) {
  return (
    <button type="button" className="back" onClick={onClick} aria-label="返回">
      <svg className="back-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M15 5L8 12l7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
