/**
 * Chain Icon Component
 *
 * Used for pool/chain-related displays.
 */

interface ChainIconProps {
  size?: number
  className?: string
}

export function ChainIcon({ size = 16, className = '' }: ChainIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.5 9.5L9.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M9 11.5l1.5-1.5a2.121 2.121 0 0 0 0-3l-1-1a2.121 2.121 0 0 0-3 0L5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 4.5L5.5 6a2.121 2.121 0 0 0 0 3l1 1a2.121 2.121 0 0 0 3 0L11 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
