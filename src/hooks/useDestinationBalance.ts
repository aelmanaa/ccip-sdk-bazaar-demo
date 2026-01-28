/**
 * Destination Balance Hook
 *
 * CCIP SDK INTEGRATION: Uses chain.getBalance() to fetch the token
 * balance on the destination chain for the receiver address.
 *
 * This hook combines information from:
 * 1. useTokenPoolInfo - to get the remote token address
 * 2. chain.getBalance() - to fetch the actual balance
 *
 * Educational Note: This demonstrates end-to-end CCIP integration:
 * - Query pool info to find the remote token address
 * - Query destination chain for balance of that token
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { CCIPError } from '@chainlink/ccip-sdk'
import { useChains } from './useChains'
import { useTokenPoolInfo } from './useTokenPoolInfo'
import { NETWORKS, formatTokenAmount } from '../config'
import { validateAddress } from '../utils/validation'

interface DestinationBalanceResult {
  /** Token balance on destination chain */
  balance: bigint | null
  /** Balance formatted for display */
  balanceFormatted: string
  /** Remote token address on destination chain */
  remoteToken: string | null
  /** Whether balance is loading */
  isLoading: boolean
  /** Any error during fetch */
  error: Error | null
  /** Manually refresh balance */
  refetch: () => void
}

/**
 * Hook to fetch token balance on the destination chain
 *
 * Uses pool info to determine the remote token address, then
 * fetches the balance for that token on the destination chain.
 *
 * @example
 * const {
 *   balanceFormatted,
 *   remoteToken,
 *   refetch
 * } = useDestinationBalance(
 *   'ethereum-sepolia',  // source
 *   'base-sepolia',      // destination
 *   '0xFd57...',        // source token
 *   '0x123...'          // receiver address
 * )
 *
 * // After transfer completes, refresh balance
 * if (transferComplete) refetch()
 */
export function useDestinationBalance(
  sourceNetwork: string | undefined,
  destNetwork: string | undefined,
  sourceTokenAddress: string | undefined,
  receiverAddress: string | undefined,
  tokenDecimals?: number
): DestinationBalanceResult {
  const { getChain } = useChains()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true)

  // Get remote token address from pool info
  const { remoteToken, isLoading: poolLoading } = useTokenPoolInfo(
    sourceNetwork,
    destNetwork,
    sourceTokenAddress
  )

  const fetchBalance = useCallback(async () => {
    // Need all inputs to fetch balance
    if (!destNetwork || !receiverAddress || !remoteToken) {
      setBalance(null)
      setIsLoading(false)
      return
    }

    // Get destination chain config to determine chain type
    const destConfig = NETWORKS[destNetwork]
    if (!destConfig) {
      return
    }

    // Validate receiver address format before calling SDK
    // This prevents "Non-base58 character" errors when an EVM address
    // is accidentally passed to Solana, or vice versa
    const validation = validateAddress(receiverAddress, destConfig.type)
    if (!validation.isValid) {
      console.debug('Invalid receiver address for destination chain:', validation.error)
      setBalance(null)
      setIsLoading(false)
      return
    }

    const chain = getChain(destNetwork)
    if (!chain) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      /**
       * CCIP SDK: chain.getBalance()
       *
       * Fetches the token balance on the destination chain.
       * We use the remoteToken address obtained from pool info.
       */
      const tokenBalance = await chain.getBalance({
        holder: receiverAddress,
        token: remoteToken,
      })

      if (isMountedRef.current) {
        setBalance(tokenBalance)
      }
    } catch (err) {
      if (CCIPError.isCCIPError(err)) {
        console.error('Failed to fetch destination balance:', err.message)
        if (isMountedRef.current) {
          setError(err)
        }
      } else {
        console.error('Failed to fetch destination balance:', err)
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch balance'))
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [destNetwork, receiverAddress, remoteToken, getChain])

  // Fetch when inputs change
  useEffect(() => {
    isMountedRef.current = true
    fetchBalance()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchBalance])

  // Get destination network config for formatting
  const destConfig = destNetwork ? NETWORKS[destNetwork] : null
  const decimals = tokenDecimals ?? (destConfig?.type === 'solana' ? 9 : 18)

  return {
    balance,
    balanceFormatted: formatBalance(balance, decimals),
    remoteToken,
    isLoading: isLoading || poolLoading,
    error,
    refetch: fetchBalance,
  }
}

/**
 * Format balance for display
 */
function formatBalance(balance: bigint | null, decimals: number): string {
  if (balance === null) return '-'
  return formatTokenAmount(balance, decimals)
}
