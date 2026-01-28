/**
 * Token Pool Info Hook
 *
 * CCIP SDK INTEGRATION: Uses multiple SDK functions to fetch comprehensive
 * token pool information including rate limits and remote chain configuration.
 *
 * SDK Functions used:
 * - chain.getTokenAdminRegistryFor(router) → registry address
 * - chain.getRegistryTokenConfig(registry, token) → { tokenPool }
 * - chain.getTokenPoolConfigs(pool) → { token, router, typeAndVersion }
 * - chain.getTokenPoolRemotes(pool, destSelector) → Record<string, TokenPoolRemote>
 *
 * Educational Note: This demonstrates the full flow of querying CCIP
 * infrastructure to understand token pool configuration.
 */

import { useState, useEffect, useCallback } from 'react'
import type { RateLimiterState, TokenPoolRemote } from '@chainlink/ccip-sdk'
import { useChains } from './useChains'
import { NETWORKS, getRouterAddress } from '../config'
import { TIMEOUT_DEFAULTS, withTimeout } from '../utils/timeout'
import { categorizeError, type CategorizedError } from '../utils/errors'

/**
 * SDK WORKAROUND (Issue #3c) - Will be fixed in next SDK version
 *
 * Rate limit bucket configuration for display.
 * Extends SDK's RateLimiterState with isEnabled flag because RateLimiterState
 * nullability is not always clear from the SDK types.
 */
export interface RateLimitBucket {
  /** Current tokens available in bucket */
  tokens: bigint
  /** Maximum bucket capacity */
  capacity: bigint
  /** Refill rate (tokens per second) */
  rate: bigint
  /** Whether rate limiting is enabled (derived from RateLimiterState !== null) */
  isEnabled: boolean
}

/**
 * Convert SDK's RateLimiterState to our RateLimitBucket.
 * Handles null/undefined state explicitly (SDK Issue #3c - will be fixed in next version).
 */
function toRateLimitBucket(state: RateLimiterState): RateLimitBucket | null {
  if (!state) return null
  return {
    tokens: state.tokens,
    capacity: state.capacity,
    rate: state.rate,
    isEnabled: true,
  }
}

/**
 * Complete token pool information
 */
export interface TokenPoolInfo {
  /** Pool contract address */
  poolAddress: string
  /** Pool type and version (e.g., "BurnMintTokenPool 1.5.0") */
  typeAndVersion: string
  /** Remote token address on destination chain */
  remoteToken: string | null
  /** Remote pool addresses on destination chain */
  remotePools: string[]
  /** Inbound rate limit configuration */
  inboundRateLimit: RateLimitBucket | null
  /** Outbound rate limit configuration */
  outboundRateLimit: RateLimitBucket | null
}

/**
 * Hook result for token pool info
 */
interface UseTokenPoolInfoResult {
  /** Pool information if loaded */
  poolInfo: TokenPoolInfo | null
  /** Pool contract address shorthand */
  poolAddress: string | null
  /** Remote token address shorthand */
  remoteToken: string | null
  /** Whether the lane is supported for this token */
  isLaneSupported: boolean
  /** Whether currently fetching */
  isLoading: boolean
  /** Any error during fetch */
  error: CategorizedError | null
  /** Manually refetch pool info */
  refetch: () => void
}

/**
 * Hook to fetch token pool information including rate limits
 *
 * Uses multiple CCIP SDK calls to build a complete picture of the
 * token pool configuration for a specific source→destination lane.
 *
 * @example
 * const {
 *   poolInfo,
 *   isLaneSupported,
 *   isLoading
 * } = useTokenPoolInfo(
 *   'ethereum-sepolia',
 *   'base-sepolia',
 *   '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05'
 * )
 *
 * if (!isLaneSupported) {
 *   return <Warning>This lane is not supported</Warning>
 * }
 */
export function useTokenPoolInfo(
  sourceNetwork: string | undefined,
  destNetwork: string | undefined,
  tokenAddress: string | undefined
): UseTokenPoolInfoResult {
  const { getChain } = useChains()
  const [poolInfo, setPoolInfo] = useState<TokenPoolInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<CategorizedError | null>(null)

  const fetchPoolInfo = useCallback(async () => {
    // Need all three inputs to fetch pool info
    if (!sourceNetwork || !destNetwork || !tokenAddress) {
      setPoolInfo(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const sourceChain = getChain(sourceNetwork)
    const destConfig = NETWORKS[destNetwork]
    const router = getRouterAddress(sourceNetwork)
    const destChainSelector = destConfig?.chainSelector

    if (!sourceChain || !destConfig || !router || !destChainSelector) {
      setError(categorizeError(new Error('Invalid network configuration')))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      /**
       * Step 1: Get Token Admin Registry for this router
       *
       * CCIP SDK: chain.getTokenAdminRegistryFor(router)
       * The Token Admin Registry maps tokens to their pool contracts.
       */
      const registryResult = await withTimeout(
        sourceChain.getTokenAdminRegistryFor(router),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Token Admin Registry lookup'
      )

      if (registryResult.timedOut || registryResult.error || !registryResult.data) {
        throw registryResult.error || new Error('Failed to get Token Admin Registry')
      }

      const registryAddress = registryResult.data

      /**
       * Step 2: Get token configuration from registry
       *
       * CCIP SDK: chain.getRegistryTokenConfig(registry, token)
       * Returns the token pool address for this token.
       */
      const tokenConfigResult = await withTimeout(
        sourceChain.getRegistryTokenConfig(registryAddress, tokenAddress),
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Token configuration lookup'
      )

      if (tokenConfigResult.timedOut || tokenConfigResult.error || !tokenConfigResult.data) {
        throw tokenConfigResult.error || new Error('Failed to get token configuration')
      }

      const poolAddress = tokenConfigResult.data.tokenPool

      if (!poolAddress) {
        throw new Error('No token pool found for this token')
      }

      /**
       * Step 3: Get pool configuration
       *
       * CCIP SDK: chain.getTokenPoolConfigs(pool)
       * Returns general pool config including type and version.
       *
       * SDK WORKAROUND (Issue #3a) - Will be fixed in next SDK version
       * Return type is unclear, so we explicitly annotate it here.
       * Different chain families may return slightly different shapes,
       * but all include token, router, and optionally typeAndVersion.
       */
      const poolConfigPromise: Promise<{ token: string; router: string; typeAndVersion?: string }> =
        sourceChain.getTokenPoolConfigs(poolAddress)
      const poolConfigResult = await withTimeout(
        poolConfigPromise,
        TIMEOUT_DEFAULTS.POOL_INFO,
        'Pool configuration lookup'
      )

      if (poolConfigResult.timedOut || poolConfigResult.error || !poolConfigResult.data) {
        throw poolConfigResult.error || new Error('Failed to get pool configuration')
      }

      const poolConfig = poolConfigResult.data
      const typeAndVersion = poolConfig.typeAndVersion ?? 'Unknown'

      /**
       * Step 4: Get remote chain configuration
       *
       * CCIP SDK: chain.getTokenPoolRemotes(pool, destChainSelector)
       * Returns Record<string, TokenPoolRemote> mapping network names to remote configs.
       *
       * SDK WORKAROUND (Issue #3b) - Will be fixed in next SDK version
       * Return structure (Record with string keys) is not immediately clear from types.
       * We extract values safely and take the first entry.
       *
       * This is the key function for understanding lane support!
       */
      let remoteToken: string | null = null
      let remotePools: string[] = []
      let inboundRateLimit: RateLimitBucket | null = null
      let outboundRateLimit: RateLimitBucket | null = null

      try {
        const remotesResult = await withTimeout(
          sourceChain.getTokenPoolRemotes(poolAddress, destChainSelector),
          TIMEOUT_DEFAULTS.POOL_INFO,
          'Remote pool lookup'
        )

        if (!remotesResult.timedOut && !remotesResult.error && remotesResult.data) {
          // SDK returns Record<string, TokenPoolRemote> - get the first (and likely only) entry
          const remotesRecord: Record<string, TokenPoolRemote> = remotesResult.data
          const remoteEntries = Object.values(remotesRecord)

          if (remoteEntries.length > 0) {
            const remote = remoteEntries[0]
            if (remote) {
              remoteToken = remote.remoteToken
              remotePools = remote.remotePools
              inboundRateLimit = toRateLimitBucket(remote.inboundRateLimiterState)
              outboundRateLimit = toRateLimitBucket(remote.outboundRateLimiterState)
            }
          }
        }
      } catch {
        // Lane not supported - remote config doesn't exist
        // Continue with null values
      }

      setPoolInfo({
        poolAddress,
        typeAndVersion,
        remoteToken,
        remotePools,
        inboundRateLimit,
        outboundRateLimit,
      })
    } catch (err) {
      console.error('Failed to fetch pool info:', err)
      setError(categorizeError(err))
    } finally {
      setIsLoading(false)
    }
  }, [sourceNetwork, destNetwork, tokenAddress, getChain])

  // Fetch when inputs change
  useEffect(() => {
    fetchPoolInfo()
  }, [fetchPoolInfo])

  // Lane is supported if we have remote token configuration
  const isLaneSupported =
    poolInfo !== null && (poolInfo.remoteToken !== null || poolInfo.remotePools.length > 0)

  return {
    poolInfo,
    poolAddress: poolInfo?.poolAddress ?? null,
    remoteToken: poolInfo?.remoteToken ?? null,
    isLaneSupported,
    isLoading,
    error,
    refetch: fetchPoolInfo,
  }
}

/**
 * Format rate limit bucket for display
 *
 * @example
 * formatRateLimitBucket(bucket)
 * // => { current: "600", max: "1000", rate: "10/sec", percentage: 60 }
 */
export function formatRateLimitBucket(
  bucket: RateLimitBucket | null,
  decimals: number = 18
): {
  current: string
  max: string
  rate: string
  percentage: number
} | null {
  if (!bucket || !bucket.isEnabled) return null

  const divisor = BigInt(10 ** decimals)
  const current = Number(bucket.tokens / divisor)
  const max = Number(bucket.capacity / divisor)
  const rate = Number(bucket.rate / divisor)
  const percentage = max > 0 ? Math.round((current / max) * 100) : 0

  return {
    current: current.toLocaleString(),
    max: max.toLocaleString(),
    rate: `${rate.toLocaleString()}/sec`,
    percentage,
  }
}
