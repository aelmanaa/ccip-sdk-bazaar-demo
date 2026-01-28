/**
 * Wallet Icon Component
 *
 * Used for wallet-related actions and indicators.
 */

interface WalletIconProps {
  size?: number
  className?: string
}

export function WalletIcon({ size = 20, className = '' }: WalletIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M17 6H3a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V7a1 1 0 00-1-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 12a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
      <path
        d="M2 6V5a2 2 0 012-2h10a2 2 0 012 2v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
