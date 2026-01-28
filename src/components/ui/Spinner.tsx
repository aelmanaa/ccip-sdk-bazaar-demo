/**
 * Spinner Component
 *
 * A reusable loading spinner with multiple sizes and colors.
 * Used throughout the app for loading states.
 */

import styles from './Spinner.module.css'

interface SpinnerProps {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  color?: 'primary' | 'white' | 'gray'
  /** Additional CSS class */
  className?: string
  /** Accessibility label */
  label?: string
}

/**
 * Loading spinner component
 *
 * @example
 * <Spinner size="md" color="primary" />
 *
 * @example
 * <Spinner size="sm" color="white" label="Loading balances" />
 */
export function Spinner({
  size = 'md',
  color = 'primary',
  className = '',
  label = 'Loading',
}: SpinnerProps) {
  const sizeClass = styles[size]
  const colorClass = styles[color]

  return (
    <div
      className={`${styles.spinner} ${sizeClass} ${colorClass} ${className}`}
      role="status"
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" fill="none" className={styles.svg}>
        {/* Background circle */}
        <circle
          className={styles.track}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        {/* Spinning arc */}
        <circle
          className={styles.arc}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
      <span className="visually-hidden">{label}</span>
    </div>
  )
}

/**
 * Inline loading text with spinner
 *
 * @example
 * <LoadingText>Fetching balance...</LoadingText>
 */
export function LoadingText({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`${styles.loadingText} ${className}`}>
      <Spinner size="sm" color="gray" />
      {children}
    </span>
  )
}

/**
 * Full container loading overlay
 *
 * @example
 * <LoadingOverlay>Preparing transaction...</LoadingOverlay>
 */
export function LoadingOverlay({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`${styles.overlay} ${className}`}>
      <Spinner size="lg" color="primary" />
      {children && <p className={styles.overlayText}>{children}</p>}
    </div>
  )
}

/**
 * Skeleton loader for placeholder content
 *
 * @example
 * <Skeleton width={100} height={20} />
 */
export function Skeleton({
  width,
  height = 20,
  className = '',
  borderRadius,
}: {
  width?: number | string
  height?: number | string
  className?: string
  borderRadius?: number | string
}) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: borderRadius
          ? typeof borderRadius === 'number'
            ? `${borderRadius}px`
            : borderRadius
          : undefined,
      }}
    />
  )
}
