/**
 * Token Balance Hook
 *
 * CCIP SDK INTEGRATION: Uses chain.getBalance() to fetch both
 * native token and ERC20/SPL token balances.
 *
 * SDK Function: chain.getBalance({ holder, token? })
 * Returns: bigint - Balance in token's smallest unit
 *
 * Without token parameter: Returns native token balance (ETH, AVAX, SOL)
 * With token parameter: Returns ERC20/SPL token balance
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { CCIPError } from '@chainlink/ccip-sdk'
import { useChains } from './useChains'
import { NETWORKS, formatTokenAmount } from '../config'

interface BalanceResult {
  /** Native token balance (ETH, AVAX, SOL) */
  nativeBalance: bigint | null
  /** Native balance formatted for display */
  nativeFormatted: string
  /** Token balance (e.g., CCIP-BnM) */
  tokenBalance: bigint | null
  /** Token balance formatted for display */
  tokenFormatted: string
  /** Whether balances are loading */
  isLoading: boolean
  /** Any error during fetch */
  error: Error | null
  /** Manually refresh balances */
  refetch: () => void
}

/**
 * Hook to fetch native and token balances
 *
 * @example
 * const { nativeFormatted, tokenFormatted, isLoading } = useTokenBalance(
 *   'ethereum-sepolia',
 *   '0x123...', // holder address
 *   '0xFd57...', // token address
 *   18, // token decimals (from useTokenMetadata)
 * )
 *
 * // Display: "ETH: 0.5", "CCIP-BnM: 100.0"
 */
export function useTokenBalance(
  networkKey: string,
  holder: string | undefined,
  tokenAddress: string | undefined,
  tokenDecimals?: number
): BalanceResult {
  const { getChain } = useChains()
  const [nativeBalance, setNativeBalance] = useState<bigint | null>(null)
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  const fetchBalances = useCallback(async () => {
    if (!networkKey || !holder) {
      setNativeBalance(null)
      setTokenBalance(null)
      return
    }

    const chain = getChain(networkKey)
    if (!chain) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      /**
       * CCIP SDK: chain.getBalance()
       *
       * Fetches token balance for a holder address.
       *
       * Usage:
       * - chain.getBalance({ holder }) - Native token balance
       * - chain.getBalance({ holder, token }) - ERC20/SPL token balance
       *
       * Returns: bigint in token's smallest unit
       */

      // Fetch native balance
      const native = await chain.getBalance({ holder })
      // Check if still mounted before updating state
      if (!isMountedRef.current) return
      setNativeBalance(native)

      // Fetch token balance if token address provided
      if (tokenAddress) {
        const token = await chain.getBalance({ holder, token: tokenAddress })
        // Check if still mounted before updating state
        if (!isMountedRef.current) return
        setTokenBalance(token)
      } else {
        setTokenBalance(null)
      }
    } catch (err) {
      // Check if still mounted before updating state
      if (!isMountedRef.current) return

      /**
       * CCIP SDK Error Handling:
       * Use CCIPError.isCCIPError() to check for SDK errors
       */
      if (CCIPError.isCCIPError(err)) {
        console.error('Failed to fetch balances:', err.message)
        if (err.recovery) {
          console.warn('Recovery suggestion:', err.recovery)
        }
        setError(err)
      } else {
        console.error('Failed to fetch balances:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch balances'))
      }
    } finally {
      // Check if still mounted before updating state
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [networkKey, holder, tokenAddress, getChain])

  useEffect(() => {
    isMountedRef.current = true
    fetchBalances()

    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000)

    // Refresh balances when window regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBalances()
      }
    }

    const handleFocus = () => {
      fetchBalances()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchBalances])

  // Get network config for formatting
  const network = NETWORKS[networkKey]

  return {
    nativeBalance,
    nativeFormatted: formatBalance(nativeBalance, network?.nativeCurrency.decimals ?? 18),
    tokenBalance,
    tokenFormatted: formatBalance(
      tokenBalance,
      tokenDecimals ?? (network?.type === 'solana' ? 9 : 18)
    ),
    isLoading,
    error,
    refetch: fetchBalances,
  }
}

/**
 * Format balance for display
 */
function formatBalance(balance: bigint | null, decimals: number): string {
  if (balance === null) return '-'
  return formatTokenAmount(balance, decimals)
}
