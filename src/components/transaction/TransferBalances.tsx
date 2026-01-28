/**
 * Transfer Balances Component
 *
 * Displays real-time source and destination balances during a cross-chain transfer.
 * Shows the balance changes as the transfer progresses:
 * - Source balance decreases after send
 * - Destination balance increases after execution
 *
 * EDUCATIONAL: Demonstrates using chain.getBalance() with polling
 * to show real-time balance updates across chains.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { CCIPError } from '@chainlink/ccip-sdk'
import { useChains } from '../../hooks/useChains'
import { useTokenPoolInfo } from '../../hooks/useTokenPoolInfo'
import { useTokenMetadata } from '../../hooks/useTokenMetadata'
import { NETWORKS, formatTokenAmount, getTokenAddress, CCIP_BNM } from '../../config'
import { Skeleton } from '../ui/Spinner'

// Import chain logos
import ethereumLogo from '../../assets/chains/ethereum.svg'
import solanaLogo from '../../assets/chains/solana.svg'
import avalancheLogo from '../../assets/chains/avalanche.svg'
import baseLogo from '../../assets/chains/base.svg'

import styles from './TransferBalances.module.css'

const CHAIN_LOGOS: Record<string, string> = {
  'ethereum-sepolia': ethereumLogo,
  'base-sepolia': baseLogo,
  'avalanche-fuji': avalancheLogo,
  'solana-devnet': solanaLogo,
}

interface TransferBalancesProps {
  /** Source network key */
  sourceNetwork: string
  /** Destination network key */
  destNetwork: string
  /** Sender address on source chain */
  senderAddress: string
  /** Receiver address on destination chain */
  receiverAddress: string
  /** Token decimals for formatting */
  tokenDecimals?: number
  /** Whether the transfer is in progress (triggers polling) */
  isTransferring?: boolean
  /** Initial balance on source (before transfer) */
  initialSourceBalance?: bigint
  /** Initial balance on destination (before transfer) */
  initialDestBalance?: bigint
}

interface BalanceState {
  balance: bigint | null
  isLoading: boolean
  error: Error | null
}

/**
 * Display real-time balances during cross-chain transfer
 */
export function TransferBalances({
  sourceNetwork,
  destNetwork,
  senderAddress,
  receiverAddress,
  tokenDecimals = 18,
  isTransferring = false,
  initialSourceBalance,
  initialDestBalance,
}: TransferBalancesProps) {
  const { getChain } = useChains()

  // Source balance state
  const [sourceBalance, setSourceBalance] = useState<BalanceState>({
    balance: initialSourceBalance ?? null,
    isLoading: false,
    error: null,
  })

  // Destination balance state
  const [destBalance, setDestBalance] = useState<BalanceState>({
    balance: initialDestBalance ?? null,
    isLoading: false,
    error: null,
  })

  // Track the ACTUAL initial balances captured on first fetch (per-component instance)
  // This ensures each transfer tracking session has its own baseline
  const capturedInitialSource = useRef<bigint | undefined>(initialSourceBalance)
  const capturedInitialDest = useRef<bigint | undefined>(initialDestBalance)

  // Track if component is mounted
  const isMountedRef = useRef(true)

  // Get token addresses
  const sourceTokenAddress = getTokenAddress(CCIP_BNM, sourceNetwork)

  // Get remote token address from pool info
  const { remoteToken } = useTokenPoolInfo(sourceNetwork, destNetwork, sourceTokenAddress)

  // Get source token metadata (for decimals/symbol)
  // Note: decimals are mandatory for tokens - we use the passed prop as fallback only
  const { metadata: sourceTokenMetadata } = useTokenMetadata(sourceNetwork, sourceTokenAddress)
  const sourceDecimals = sourceTokenMetadata?.decimals ?? tokenDecimals
  const sourceSymbol = sourceTokenMetadata?.symbol || 'UNKNOWN'

  // Get remote token metadata from destination chain (may have different decimals/symbol)
  const { metadata: destTokenMetadata } = useTokenMetadata(destNetwork, remoteToken ?? undefined)
  const destDecimals = destTokenMetadata?.decimals ?? tokenDecimals
  const destSymbol = destTokenMetadata?.symbol || 'UNKNOWN'

  // Fetch source balance
  const fetchSourceBalance = useCallback(async () => {
    if (!sourceNetwork || !senderAddress || !sourceTokenAddress) return

    const chain = getChain(sourceNetwork)
    if (!chain) return

    setSourceBalance((prev) => ({ ...prev, isLoading: true }))

    try {
      const balance = await chain.getBalance({
        holder: senderAddress,
        token: sourceTokenAddress,
      })

      if (isMountedRef.current) {
        // Capture initial balance on first successful fetch if not already set
        if (capturedInitialSource.current === undefined) {
          capturedInitialSource.current = balance
        }
        setSourceBalance({ balance, isLoading: false, error: null })
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSourceBalance((prev) => ({
          ...prev,
          isLoading: false,
          error: CCIPError.isCCIPError(err) ? err : new Error('Failed to fetch balance'),
        }))
      }
    }
  }, [sourceNetwork, senderAddress, sourceTokenAddress, getChain])

  // Fetch destination balance
  const fetchDestBalance = useCallback(async () => {
    if (!destNetwork || !receiverAddress || !remoteToken) return

    const chain = getChain(destNetwork)
    if (!chain) return

    setDestBalance((prev) => ({ ...prev, isLoading: true }))

    try {
      const balance = await chain.getBalance({
        holder: receiverAddress,
        token: remoteToken,
      })

      if (isMountedRef.current) {
        // Capture initial balance on first successful fetch if not already set
        if (capturedInitialDest.current === undefined) {
          capturedInitialDest.current = balance
        }
        setDestBalance({ balance, isLoading: false, error: null })
      }
    } catch (err) {
      if (isMountedRef.current) {
        setDestBalance((prev) => ({
          ...prev,
          isLoading: false,
          error: CCIPError.isCCIPError(err) ? err : new Error('Failed to fetch balance'),
        }))
      }
    }
  }, [destNetwork, receiverAddress, remoteToken, getChain])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    fetchSourceBalance()
    fetchDestBalance()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchSourceBalance, fetchDestBalance])

  // Poll balances while transferring
  useEffect(() => {
    if (!isTransferring) return

    const interval = setInterval(() => {
      fetchSourceBalance()
      fetchDestBalance()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [isTransferring, fetchSourceBalance, fetchDestBalance])

  const sourceConfig = NETWORKS[sourceNetwork]
  const destConfig = NETWORKS[destNetwork]

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Balance Changes</h4>

      <div className={styles.balances}>
        {/* Source Balance */}
        <BalanceCard
          network={sourceNetwork}
          networkName={sourceConfig?.name || sourceNetwork}
          logo={CHAIN_LOGOS[sourceNetwork]}
          label="Source"
          balance={sourceBalance.balance}
          initialBalance={capturedInitialSource.current}
          isLoading={sourceBalance.isLoading}
          decimals={sourceDecimals}
          tokenSymbol={sourceSymbol}
          direction="decrease"
        />

        {/* Arrow indicator */}
        <div className={styles.arrow}>→</div>

        {/* Destination Balance */}
        <BalanceCard
          network={destNetwork}
          networkName={destConfig?.name || destNetwork}
          logo={CHAIN_LOGOS[destNetwork]}
          label="Destination"
          balance={destBalance.balance}
          initialBalance={capturedInitialDest.current}
          isLoading={destBalance.isLoading}
          decimals={destDecimals}
          tokenSymbol={destSymbol}
          direction="increase"
        />
      </div>

      {isTransferring && (
        <p className={styles.pollingNote}>Balances update every 5 seconds during transfer</p>
      )}
    </div>
  )
}

/**
 * Individual balance card with change indicator
 */
function BalanceCard({
  networkName,
  logo,
  label,
  balance,
  initialBalance,
  isLoading,
  decimals,
  tokenSymbol,
  direction,
}: {
  network: string
  networkName: string
  logo?: string
  label: string
  balance: bigint | null
  initialBalance?: bigint
  isLoading: boolean
  decimals: number
  tokenSymbol: string
  direction: 'increase' | 'decrease'
}) {
  // Calculate change if we have both values
  const change = balance !== null && initialBalance !== undefined ? balance - initialBalance : null

  // Format the change amount
  const changeFormatted =
    change !== null ? formatTokenAmount(change < 0n ? -change : change, decimals) : null

  // Determine if change has occurred
  const hasChanged = change !== null && change !== 0n
  const changeType =
    change !== null && change > 0n ? 'increase' : change !== null && change < 0n ? 'decrease' : null

  return (
    <div className={styles.balanceCard}>
      <div className={styles.balanceHeader}>
        {logo && <img src={logo} alt={networkName} className={styles.chainLogo} />}
        <div className={styles.balanceInfo}>
          <span className={styles.balanceLabel}>{label}</span>
          <span className={styles.networkName}>{networkName}</span>
        </div>
      </div>

      <div className={styles.balanceValue}>
        {isLoading && balance === null ? (
          <Skeleton width={80} height={24} />
        ) : balance !== null ? (
          <>
            <span className={styles.amount}>{formatTokenAmount(balance, decimals)}</span>
            <span className={styles.symbol}>{tokenSymbol}</span>
          </>
        ) : (
          <span className={styles.noData}>-</span>
        )}
      </div>

      {/* Change indicator */}
      {hasChanged && changeFormatted && (
        <div
          className={`${styles.changeIndicator} ${changeType === direction ? styles.expected : styles.unexpected}`}
        >
          <span className={styles.changeIcon}>{changeType === 'increase' ? '↑' : '↓'}</span>
          <span className={styles.changeAmount}>
            {changeType === 'increase' ? '+' : '-'}
            {changeFormatted}
          </span>
        </div>
      )}

      {/* Loading indicator for refresh */}
      {isLoading && balance !== null && <div className={styles.refreshIndicator} />}
    </div>
  )
}
