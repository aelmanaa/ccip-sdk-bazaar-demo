/**
 * Transfer Rate Limits Component
 *
 * Displays real-time rate limit status during a cross-chain transfer.
 * Shows both source (outbound) and destination (inbound) rate limits,
 * updating periodically to show the impact of the transfer.
 *
 * EDUCATIONAL: Demonstrates using getTokenPoolRemotes() to fetch
 * rate limiter state from both source and destination pools.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { RateLimiterState } from '@chainlink/ccip-sdk'
import { useChains } from '../../hooks/useChains'
import {
  NETWORKS,
  getRouterAddress,
  formatTokenAmount,
  getTokenAddress,
  CCIP_BNM,
} from '../../config'
import { withTimeout, TIMEOUT_DEFAULTS } from '../../utils/timeout'
import { Skeleton } from '../ui/Spinner'

// Import chain logos
import ethereumLogo from '../../assets/chains/ethereum.svg'
import solanaLogo from '../../assets/chains/solana.svg'
import avalancheLogo from '../../assets/chains/avalanche.svg'
import baseLogo from '../../assets/chains/base.svg'

import styles from './TransferRateLimits.module.css'

const CHAIN_LOGOS: Record<string, string> = {
  'ethereum-sepolia': ethereumLogo,
  'base-sepolia': baseLogo,
  'avalanche-fuji': avalancheLogo,
  'solana-devnet': solanaLogo,
}

interface RateLimitData {
  outbound: RateLimiterState | null
  inbound: RateLimiterState | null
}

interface TransferRateLimitsProps {
  /** Source network key */
  sourceNetwork: string
  /** Destination network key */
  destNetwork: string
  /** Token decimals for formatting */
  tokenDecimals?: number
  /** Token symbol for display */
  tokenSymbol?: string
  /** Whether the transfer is in progress (triggers polling) */
  isTransferring?: boolean
}

/**
 * Display real-time rate limits during cross-chain transfer
 */
export function TransferRateLimits({
  sourceNetwork,
  destNetwork,
  tokenDecimals = 18,
  tokenSymbol = 'CCIP-BnM',
  isTransferring = false,
}: TransferRateLimitsProps) {
  const { getChain } = useChains()

  // Rate limit state for source chain (outbound)
  const [sourceRateLimits, setSourceRateLimits] = useState<RateLimitData | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)

  // Rate limit state for destination chain (inbound)
  const [destRateLimits, setDestRateLimits] = useState<RateLimitData | null>(null)
  const [destLoading, setDestLoading] = useState(false)

  // Track mounted state
  const isMountedRef = useRef(true)

  // Get token address
  const sourceTokenAddress = getTokenAddress(CCIP_BNM, sourceNetwork)

  // Fetch source chain rate limits (outbound from source to dest)
  const fetchSourceRateLimits = useCallback(async () => {
    if (!sourceNetwork || !destNetwork || !sourceTokenAddress) return

    const chain = getChain(sourceNetwork)
    const router = getRouterAddress(sourceNetwork)
    const destConfig = NETWORKS[destNetwork]

    if (!chain || !router || !destConfig) return

    setSourceLoading(true)

    try {
      // Get token admin registry
      const registryResult = await withTimeout(
        chain.getTokenAdminRegistryFor(router),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Token Admin Registry lookup'
      )

      if (registryResult.timedOut || registryResult.error || !registryResult.data) return

      // Get token config
      const tokenConfigResult = await withTimeout(
        chain.getRegistryTokenConfig(registryResult.data, sourceTokenAddress),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Token config lookup'
      )

      if (tokenConfigResult.timedOut || tokenConfigResult.error || !tokenConfigResult.data) return

      const poolAddress = tokenConfigResult.data.tokenPool
      if (!poolAddress) return

      // Get remote config for rate limits
      const remotesResult = await withTimeout(
        chain.getTokenPoolRemotes(poolAddress, destConfig.chainSelector),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Remote pool lookup'
      )

      if (!remotesResult.timedOut && !remotesResult.error && remotesResult.data) {
        const remoteEntries = Object.values(remotesResult.data)

        if (remoteEntries.length > 0 && remoteEntries[0]) {
          const remote = remoteEntries[0]
          if (isMountedRef.current) {
            setSourceRateLimits({
              outbound: remote.outboundRateLimiterState,
              inbound: remote.inboundRateLimiterState,
            })
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch source rate limits:', err)
    } finally {
      if (isMountedRef.current) {
        setSourceLoading(false)
      }
    }
  }, [sourceNetwork, destNetwork, sourceTokenAddress, getChain])

  // Fetch destination chain rate limits (inbound from source)
  const fetchDestRateLimits = useCallback(async () => {
    if (!sourceNetwork || !destNetwork) return

    const chain = getChain(destNetwork)
    const router = getRouterAddress(destNetwork)
    const sourceConfig = NETWORKS[sourceNetwork]
    const destTokenAddress = getTokenAddress(CCIP_BNM, destNetwork)

    if (!chain || !router || !sourceConfig || !destTokenAddress) return

    setDestLoading(true)

    try {
      // Get token admin registry on destination
      const registryResult = await withTimeout(
        chain.getTokenAdminRegistryFor(router),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Token Admin Registry lookup'
      )

      if (registryResult.timedOut || registryResult.error || !registryResult.data) return

      // Get token config
      const tokenConfigResult = await withTimeout(
        chain.getRegistryTokenConfig(registryResult.data, destTokenAddress),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Token config lookup'
      )

      if (tokenConfigResult.timedOut || tokenConfigResult.error || !tokenConfigResult.data) return

      const poolAddress = tokenConfigResult.data.tokenPool
      if (!poolAddress) return

      // Get remote config for rate limits (querying source chain selector)
      const remotesResult = await withTimeout(
        chain.getTokenPoolRemotes(poolAddress, sourceConfig.chainSelector),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Remote pool lookup'
      )

      if (!remotesResult.timedOut && !remotesResult.error && remotesResult.data) {
        const remoteEntries = Object.values(remotesResult.data)

        if (remoteEntries.length > 0 && remoteEntries[0]) {
          const remote = remoteEntries[0]
          if (isMountedRef.current) {
            setDestRateLimits({
              outbound: remote.outboundRateLimiterState,
              inbound: remote.inboundRateLimiterState,
            })
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch dest rate limits:', err)
    } finally {
      if (isMountedRef.current) {
        setDestLoading(false)
      }
    }
  }, [sourceNetwork, destNetwork, getChain])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    fetchSourceRateLimits()
    fetchDestRateLimits()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchSourceRateLimits, fetchDestRateLimits])

  // Poll while transferring
  useEffect(() => {
    if (!isTransferring) return

    const interval = setInterval(() => {
      fetchSourceRateLimits()
      fetchDestRateLimits()
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [isTransferring, fetchSourceRateLimits, fetchDestRateLimits])

  const sourceConfig = NETWORKS[sourceNetwork]
  const destConfig = NETWORKS[destNetwork]

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Rate Limits</h4>

      <div className={styles.rateLimits}>
        {/* Source Pool Rate Limits */}
        <RateLimitCard
          networkName={sourceConfig?.name || sourceNetwork}
          logo={CHAIN_LOGOS[sourceNetwork]}
          label="Source Pool"
          outbound={sourceRateLimits?.outbound}
          inbound={sourceRateLimits?.inbound}
          isLoading={sourceLoading}
          decimals={tokenDecimals}
          symbol={tokenSymbol}
          highlight="outbound"
        />

        {/* Destination Pool Rate Limits */}
        <RateLimitCard
          networkName={destConfig?.name || destNetwork}
          logo={CHAIN_LOGOS[destNetwork]}
          label="Destination Pool"
          outbound={destRateLimits?.outbound}
          inbound={destRateLimits?.inbound}
          isLoading={destLoading}
          decimals={tokenDecimals}
          symbol={tokenSymbol}
          highlight="inbound"
        />
      </div>

      {isTransferring && (
        <p className={styles.pollingNote}>Rate limits update every 10 seconds during transfer</p>
      )}
    </div>
  )
}

/**
 * Individual rate limit card
 */
function RateLimitCard({
  networkName,
  logo,
  label,
  outbound,
  inbound,
  isLoading,
  decimals,
  symbol,
  highlight,
}: {
  networkName: string
  logo?: string
  label: string
  outbound: RateLimiterState | null | undefined
  inbound: RateLimiterState | null | undefined
  isLoading: boolean
  decimals: number
  symbol: string
  highlight: 'outbound' | 'inbound'
}) {
  return (
    <div className={styles.rateLimitCard}>
      <div className={styles.cardHeader}>
        {logo && <img src={logo} alt={networkName} className={styles.chainLogo} />}
        <div className={styles.cardInfo}>
          <span className={styles.cardLabel}>{label}</span>
          <span className={styles.networkName}>{networkName}</span>
        </div>
      </div>

      <div className={styles.limitRows}>
        {/* Outbound limit */}
        <RateLimitRow
          label="Outbound"
          state={outbound}
          isLoading={isLoading}
          decimals={decimals}
          symbol={symbol}
          isHighlighted={highlight === 'outbound'}
        />

        {/* Inbound limit */}
        <RateLimitRow
          label="Inbound"
          state={inbound}
          isLoading={isLoading}
          decimals={decimals}
          symbol={symbol}
          isHighlighted={highlight === 'inbound'}
        />
      </div>
    </div>
  )
}

/**
 * Individual rate limit row with progress bar
 */
function RateLimitRow({
  label,
  state,
  isLoading,
  decimals,
  symbol,
  isHighlighted,
}: {
  label: string
  state: RateLimiterState | null | undefined
  isLoading: boolean
  decimals: number
  symbol: string
  isHighlighted: boolean
}) {
  if (!state) {
    return (
      <div className={styles.limitRow}>
        <span className={styles.limitLabel}>{label}</span>
        {isLoading ? (
          <Skeleton width={60} height={16} />
        ) : (
          <span className={styles.unlimited}>Unlimited</span>
        )}
      </div>
    )
  }

  const current = Number(state.tokens) / 10 ** decimals
  const max = Number(state.capacity) / 10 ** decimals
  const rate = Number(state.rate) / 10 ** decimals
  const percentage = max > 0 ? (current / max) * 100 : 0

  // Determine color based on percentage
  const getColor = () => {
    if (percentage > 50) return 'green'
    if (percentage > 20) return 'yellow'
    return 'red'
  }

  return (
    <div className={`${styles.limitRow} ${isHighlighted ? styles.highlighted : ''}`}>
      <div className={styles.limitHeader}>
        <span className={styles.limitLabel}>{label}</span>
        <span className={styles.limitValue}>
          {formatTokenAmount(state.tokens, decimals)} /{' '}
          {formatTokenAmount(state.capacity, decimals)} {symbol}
        </span>
      </div>

      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${styles[getColor()]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className={styles.limitMeta}>
        <span className={styles.percentage}>{percentage.toFixed(1)}%</span>
        <span className={styles.refillRate}>Refill: {rate.toLocaleString()}/sec</span>
      </div>
    </div>
  )
}
