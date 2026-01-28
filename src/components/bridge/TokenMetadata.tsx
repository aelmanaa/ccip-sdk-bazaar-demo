/**
 * Token Metadata Component
 *
 * Displays token information fetched from the blockchain.
 * Shows symbol, name, and decimals in a compact card format.
 *
 * EDUCATIONAL: Demonstrates using chain.getTokenInfo() to query
 * on-chain token data via the CCIP SDK.
 */

import { useTokenMetadata } from '../../hooks/useTokenMetadata'
import { Skeleton } from '../ui/Spinner'
import { SearchIcon } from '../ui/icons'
import styles from './TokenMetadata.module.css'

interface TokenMetadataProps {
  /** Network key (e.g., 'ethereum-sepolia') */
  networkKey: string | undefined
  /** Token contract address */
  tokenAddress: string | undefined
  /** Whether to show compact version */
  compact?: boolean
}

/**
 * Token metadata display component
 */
export function TokenMetadata({ networkKey, tokenAddress, compact = false }: TokenMetadataProps) {
  const { metadata, isLoading, error } = useTokenMetadata(networkKey, tokenAddress)

  // Don't render if no inputs
  if (!networkKey || !tokenAddress) return null

  // Loading state
  if (isLoading) {
    return (
      <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
        <Skeleton width={60} height={16} />
        <Skeleton width={120} height={14} />
      </div>
    )
  }

  // Error state - show fallback
  if (error || !metadata) {
    return null
  }

  // Compact version for inline display
  if (compact) {
    return (
      <span className={styles.compactDisplay}>
        {metadata.symbol} ({metadata.decimals} decimals)
      </span>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.symbol}>{metadata.symbol}</span>
        <span className={styles.decimals}>{metadata.decimals} decimals</span>
      </div>
      <div className={styles.name}>{metadata.name}</div>
      <div className={styles.badge}>
        <span className={styles.badgeIcon} aria-hidden="true">
          <SearchIcon size={12} />
        </span>
        <span className={styles.badgeText}>On-chain data via CCIP SDK</span>
      </div>
    </div>
  )
}
