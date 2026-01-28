/**
 * Transaction History Item Component
 *
 * Displays a single transaction in the history list.
 * Shows: source→dest, amount, status, explorer links, relative time.
 */

import type { ReactNode } from 'react'
import { getCCIPExplorerUrl } from '@chainlink/ccip-sdk'
import { NETWORKS, getExplorerTxUrl } from '../../config'
import { formatRelativeTime, type StoredTransaction } from '../../utils/localStorage'
import { truncateAddress } from '../../utils/validation'
import { CheckIcon, XIcon, ClockIcon, SpinnerIcon } from '../ui/icons'
import styles from './TransactionHistoryItem.module.css'

interface TransactionHistoryItemProps {
  /** Transaction data */
  transaction: StoredTransaction
  /** Callback to remove transaction */
  onRemove?: (messageId: string) => void
}

/**
 * Get status icon and color
 */
function getStatusInfo(status: StoredTransaction['status']): {
  icon: ReactNode
  colorClass: string
  label: string
} {
  switch (status) {
    case 'success':
      return { icon: <CheckIcon size={14} />, colorClass: styles.success ?? '', label: 'Success' }
    case 'failed':
      return { icon: <XIcon size={14} />, colorClass: styles.failed ?? '', label: 'Failed' }
    case 'timeout':
      return { icon: <ClockIcon size={14} />, colorClass: styles.timeout ?? '', label: 'Timeout' }
    default:
      return { icon: <SpinnerIcon size={14} />, colorClass: styles.pending ?? '', label: 'Pending' }
  }
}

/**
 * Transaction history item component
 */
export function TransactionHistoryItem({ transaction, onRemove }: TransactionHistoryItemProps) {
  const sourceConfig = NETWORKS[transaction.sourceNetwork]
  const destConfig = NETWORKS[transaction.destNetwork]
  const statusInfo = getStatusInfo(transaction.status)

  return (
    <div className={styles.item}>
      {/* Header with route and status */}
      <div className={styles.header}>
        <div className={styles.route}>
          <span className={styles.network}>{sourceConfig?.name || transaction.sourceNetwork}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.network}>{destConfig?.name || transaction.destNetwork}</span>
        </div>
        <div className={`${styles.status} ${statusInfo.colorClass}`}>
          <span className={styles.statusIcon}>{statusInfo.icon}</span>
          <span className={styles.statusLabel}>{statusInfo.label}</span>
        </div>
      </div>

      {/* Amount */}
      <div className={styles.amount}>
        <span className={styles.amountValue}>{transaction.amount}</span>
        <span className={styles.amountSymbol}>{transaction.tokenSymbol}</span>
      </div>

      {/* Details */}
      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>To</span>
          <code className={styles.detailValue}>{truncateAddress(transaction.receiver, 6, 4)}</code>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Time</span>
          <span className={styles.detailValue}>{formatRelativeTime(transaction.timestamp)}</span>
        </div>
      </div>

      {/* Explorer links */}
      <div className={styles.links}>
        {transaction.txHash && (
          <a
            href={getExplorerTxUrl(transaction.sourceNetwork, transaction.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={`View source transaction on ${sourceConfig?.explorerName || 'explorer'} (opens in new tab)`}
          >
            Source Tx
          </a>
        )}
        <a
          href={getCCIPExplorerUrl('msg', transaction.messageId)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
          aria-label="View on CCIP Explorer (opens in new tab)"
        >
          CCIP Explorer
        </a>
        {transaction.destTxHash && (
          <a
            href={getExplorerTxUrl(transaction.destNetwork, transaction.destTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={`View destination transaction on ${destConfig?.explorerName || 'explorer'} (opens in new tab)`}
          >
            Dest Tx
          </a>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          className={styles.removeButton}
          onClick={() => onRemove(transaction.messageId)}
          aria-label="Remove from history"
        >
          <XIcon size={14} />
        </button>
      )}
    </div>
  )
}
