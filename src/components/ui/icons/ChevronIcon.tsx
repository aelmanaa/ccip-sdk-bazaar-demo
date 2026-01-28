/**
 * Chevron Icon Component
 *
 * Used for dropdowns and expandable sections.
 * Can be rotated via CSS for different directions.
 */

interface ChevronIconProps {
  size?: number
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right'
}

export function ChevronIcon({ size = 12, className = '', direction = 'down' }: ChevronIconProps) {
  const rotations = {
    up: 180,
    down: 0,
    left: 90,
    right: -90,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: `rotate(${rotations[direction]}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5L6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
