/**
 * Destination Balance Display Component
 *
 * Shows the receiver's token balance on the destination chain.
 * Uses the remote token address from pool info to query balance.
 *
 * EDUCATIONAL: Demonstrates how to query balances on the
 * destination chain using the remote token address from CCIP pool config.
 */

import { useDestinationBalance } from '../../hooks/useDestinationBalance'
import { NETWORKS } from '../../config'
import { Skeleton } from '../ui/Spinner'
import { CopyableAddress } from '../ui/CopyableAddress'
import styles from './DestinationBalanceDisplay.module.css'

interface DestinationBalanceDisplayProps {
  /** Source network key */
  sourceNetwork: string | undefined
  /** Destination network key */
  destNetwork: string | undefined
  /** Source token address */
  sourceTokenAddress: string | undefined
  /** Receiver address on destination */
  receiverAddress: string | undefined
  /** Token symbol for display */
  tokenSymbol?: string
  /** Token decimals for formatting */
  tokenDecimals?: number
}

/**
 * Destination balance display component
 */
export function DestinationBalanceDisplay({
  sourceNetwork,
  destNetwork,
  sourceTokenAddress,
  receiverAddress,
  tokenSymbol = 'CCIP-BnM',
  tokenDecimals,
}: DestinationBalanceDisplayProps) {
  const { balanceFormatted, remoteToken, isLoading, error } = useDestinationBalance(
    sourceNetwork,
    destNetwork,
    sourceTokenAddress,
    receiverAddress,
    tokenDecimals
  )

  const destConfig = destNetwork ? NETWORKS[destNetwork] : null

  // Don't render if missing inputs
  if (!sourceNetwork || !destNetwork || !receiverAddress) return null

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.label}>Destination Balance</span>
        </div>
        <div className={styles.content}>
          <Skeleton width={80} height={20} />
        </div>
      </div>
    )
  }

  // Error or no remote token (lane not supported)
  if (error || !remoteToken) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Destination Balance</span>
        <span className={styles.network}>{destConfig?.name}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.balanceRow}>
          <span className={styles.balanceValue}>{balanceFormatted}</span>
          <span className={styles.symbol}>{tokenSymbol}</span>
        </div>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <CopyableAddress
              address={receiverAddress}
              label="Receiver"
              startChars={6}
              endChars={4}
            />
          </div>
          <div className={styles.detailRow}>
            <CopyableAddress
              address={remoteToken}
              label="Remote Token"
              startChars={6}
              endChars={4}
            />
          </div>
        </div>
      </div>

      <div className={styles.note}>Balance will update after successful transfer</div>
    </div>
  )
}

/**
 * Compact balance badge for inline display
 */
export function DestinationBalanceBadge({
  sourceNetwork,
  destNetwork,
  sourceTokenAddress,
  receiverAddress,
  tokenSymbol = 'CCIP-BnM',
  tokenDecimals,
}: DestinationBalanceDisplayProps) {
  const { balanceFormatted, isLoading, error, remoteToken } = useDestinationBalance(
    sourceNetwork,
    destNetwork,
    sourceTokenAddress,
    receiverAddress,
    tokenDecimals
  )

  if (!sourceNetwork || !destNetwork || !receiverAddress || !remoteToken) return null
  if (isLoading) return <span className={styles.loadingBadge}>Loading...</span>
  if (error) return null

  return (
    <span className={styles.badge}>
      Dest: {balanceFormatted} {tokenSymbol}
    </span>
  )
}
