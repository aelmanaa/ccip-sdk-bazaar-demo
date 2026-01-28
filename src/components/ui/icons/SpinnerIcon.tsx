/**
 * Spinner Icon Component
 *
 * Used for loading and pending states.
 * Includes CSS animation class for rotation.
 */

interface SpinnerIconProps {
  size?: number
  className?: string
}

export function SpinnerIcon({ size = 16, className = '' }: SpinnerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`spinner ${className}`}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
