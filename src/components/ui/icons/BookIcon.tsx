/**
 * Book Icon Component
 *
 * Used for documentation and educational notes.
 */

interface BookIconProps {
  size?: number
  className?: string
}

export function BookIcon({ size = 16, className = '' }: BookIconProps) {
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
      <path
        d="M2 3.5A1.5 1.5 0 0 1 3.5 2H6a2 2 0 0 1 2 2v9.5a.5.5 0 0 1-.5.5.5.5 0 0 1-.5-.5A1.5 1.5 0 0 0 5.5 12H3.5A1.5 1.5 0 0 1 2 10.5v-7z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M14 3.5A1.5 1.5 0 0 0 12.5 2H10a2 2 0 0 0-2 2v9.5a.5.5 0 0 0 .5.5.5.5 0 0 0 .5-.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 0 1.5-1.5v-7z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
