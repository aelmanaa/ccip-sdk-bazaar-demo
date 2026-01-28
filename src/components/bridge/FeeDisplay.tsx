/**
 * Fee Display Component
 *
 * Shows estimated CCIP fee and transfer latency.
 * Updates in real-time as user changes inputs.
 */

import { Skeleton } from '../ui/Spinner'
import styles from './FeeDisplay.module.css'

interface FeeDisplayProps {
  fee: string
  feeSymbol: string
  latency: string
  isLoading?: boolean
}

export function FeeDisplay({ fee, feeSymbol, latency, isLoading }: FeeDisplayProps) {
  return (
    <dl className={styles.container}>
      <div className={styles.row}>
        <dt className={styles.label}>Estimated Fee</dt>
        <dd className={styles.value}>
          {isLoading ? (
            <Skeleton width={80} height={18} />
          ) : (
            <>
              {fee} {feeSymbol}
            </>
          )}
        </dd>
      </div>
      <div className={styles.row}>
        <dt className={styles.label}>Estimated Time</dt>
        <dd className={styles.value}>
          {isLoading ? <Skeleton width={60} height={18} /> : latency}
        </dd>
      </div>
    </dl>
  )
}
