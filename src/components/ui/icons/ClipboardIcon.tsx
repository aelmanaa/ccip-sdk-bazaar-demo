/**
 * Clipboard Icon Component
 *
 * Used for empty states and list displays.
 */

interface ClipboardIconProps {
  size?: number
  className?: string
}

export function ClipboardIcon({ size = 48, className = '' }: ClipboardIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="10" y="8" width="28" height="34" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M18 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 20h16M16 28h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
