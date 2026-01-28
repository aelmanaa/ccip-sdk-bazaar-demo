/**
 * Wallet Balance Section
 *
 * Displays connected wallet indicator and token balances.
 */

import { WalletIcon } from '../../ui/icons'
import { Skeleton } from '../../ui/Spinner'
import styles from '../BridgeForm.module.css'

interface WalletBalanceSectionProps {
  sourceNetwork: string
  isWalletConnected: boolean
  connectedAddress: string | undefined
  isEVM: (network: string) => boolean
  nativeCurrencySymbol: string
  nativeFormatted: string
  tokenFormatted: string
  balanceLoading: boolean
}

export function WalletBalanceSection({
  sourceNetwork,
  isWalletConnected,
  connectedAddress,
  isEVM,
  nativeCurrencySymbol,
  nativeFormatted,
  tokenFormatted,
  balanceLoading,
}: WalletBalanceSectionProps) {
  // Truncate address for display
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!sourceNetwork) return null

  return (
    <>
      {/* Wallet Indicator (shows which wallet will be used) */}
      {isWalletConnected && connectedAddress && (
        <div className={styles.walletIndicator}>
          <span className={styles.walletIcon} aria-hidden="true">
            <WalletIcon size={16} />
          </span>
          <span>
            Using {isEVM(sourceNetwork) ? 'EVM' : 'Solana'} wallet:{' '}
            {truncateAddress(connectedAddress)}
          </span>
        </div>
      )}

      {/* Balances (shown when source selected and wallet connected) */}
      {isWalletConnected && (
        <div className={styles.balances}>
          <div className={styles.balance}>
            <span className={styles.balanceLabel}>{nativeCurrencySymbol} Balance</span>
            <span className={styles.balanceValue}>
              {balanceLoading ? <Skeleton width={60} height={16} /> : nativeFormatted}
            </span>
          </div>
          <div className={styles.balance}>
            <span className={styles.balanceLabel}>CCIP-BnM Balance</span>
            <span className={styles.balanceValue}>
              {balanceLoading ? <Skeleton width={60} height={16} /> : tokenFormatted}
            </span>
          </div>
        </div>
      )}
    </>
  )
}
