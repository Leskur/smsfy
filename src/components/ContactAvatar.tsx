/** Default contact mark: circle crop with bust sitting on the bottom edge. */
export function ContactAvatar() {
  return (
    <div className="avatar avatar-default" aria-hidden>
      <svg
        className="avatar-icon"
        viewBox="0 0 40 40"
        width={40}
        height={40}
        focusable="false"
      >
        {/* Head */}
        <circle cx="20" cy="15.5" r="6.1" fill="currentColor" />
        {/* Shoulders — open at the bottom so the circle crop clips them flush */}
        <path
          fill="currentColor"
          d="M9 38.5c0-7.2 4.9-11.5 11-11.5s11 4.3 11 11.5V42H9z"
        />
      </svg>
    </div>
  )
}
