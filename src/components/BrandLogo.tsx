interface Props {
  className?: string
  size?: number
}

/** Theme-aware Smsfy mark for empty / loading states. */
export function BrandLogo({ className, size = 56 }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        className="brand-logo-plate"
        x="1"
        y="1"
        width="62"
        height="62"
        rx="15"
      />
      <path
        className="brand-logo-bubble"
        d="M14 22c0-3.3 2.7-6 6-6h24c3.3 0 6 2.7 6 6v16c0 3.3-2.7 6-6 6H28l-8 8v-8h-0c-3.3 0-6-2.7-6-6V22Z"
      />
      <circle className="brand-logo-dot" cx="26" cy="30" r="2.5" />
      <circle className="brand-logo-dot" cx="32" cy="30" r="2.5" />
      <circle className="brand-logo-dot" cx="38" cy="30" r="2.5" />
    </svg>
  )
}
