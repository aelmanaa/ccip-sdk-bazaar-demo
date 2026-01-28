/**
 * Rate Limit Display Component
 *
 * Visualizes CCIP token pool rate limits with a progress bar.
 * Shows current capacity, maximum, and refill rate.
 *
 * Color coding:
 * - Green: >50% capacity available
 * - Yellow: 20-50% capacity
 * - Red: <20% capacity (near limit)
 */

import { type RateLimitBucket, formatRateLimitBucket } from '../../hooks/useTokenPoolInfo'
import { RefreshIcon } from '../ui/icons'
import styles from './RateLimitDisplay.module.css'

interface RateLimitDisplayProps {
  /** Rate limit bucket data */
  bucket: RateLimitBucket | null
  /** Display label (e.g., "Outbound" or "Inbound") */
  label: string
  /** Token decimals for formatting */
  decimals?: number
  /** Token symbol for display */
  symbol?: string
}

/**
 * Rate limit visualization component
 */
export function RateLimitDisplay({
  bucket,
  label,
  decimals = 18,
  symbol = 'tokens',
}: RateLimitDisplayProps) {
  const formatted = formatRateLimitBucket(bucket, decimals)

  // Don't render if rate limiting is disabled
  if (!formatted || !bucket?.isEnabled) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>{label} Rate Limit</span>
          <span className={styles.disabled}>Not enabled</span>
        </div>
      </div>
    )
  }

  // Determine color based on percentage
  const getColorClass = (percentage: number): string => {
    if (percentage >= 50) return styles.green ?? ''
    if (percentage >= 20) return styles.yellow ?? ''
    return styles.red ?? ''
  }

  const colorClass = getColorClass(formatted.percentage)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{label} Capacity</span>
        <span className={styles.value}>
          {formatted.current}/{formatted.max} {symbol}
        </span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressContainer}>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={formatted.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} capacity: ${formatted.percentage}% available`}
        >
          <div
            className={`${styles.progressBar} ${colorClass}`}
            style={{ width: `${Math.min(formatted.percentage, 100)}%` }}
          />
        </div>
        <span className={`${styles.percentage} ${colorClass}`} aria-hidden="true">
          {formatted.percentage}%
        </span>
      </div>

      {/* Refill rate */}
      <div className={styles.refillRate}>
        <span className={styles.refillIcon} aria-hidden="true">
          <RefreshIcon size={14} />
        </span>
        <span>Refill: {formatted.rate}</span>
      </div>
    </div>
  )
}

/**
 * Compact rate limit badge
 */
export function RateLimitBadge({
  bucket,
  decimals = 18,
}: {
  bucket: RateLimitBucket | null
  decimals?: number
}) {
  const formatted = formatRateLimitBucket(bucket, decimals)

  if (!formatted || !bucket?.isEnabled) {
    return null
  }

  const getColorClass = (percentage: number): string => {
    if (percentage >= 50) return styles.badgeGreen ?? ''
    if (percentage >= 20) return styles.badgeYellow ?? ''
    return styles.badgeRed ?? ''
  }

  return (
    <span className={`${styles.badge} ${getColorClass(formatted.percentage)}`}>
      {formatted.percentage}% available
    </span>
  )
}
