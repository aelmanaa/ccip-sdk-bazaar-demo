/**
 * Fee Estimation Hook
 *
 * CCIP SDK INTEGRATION: Uses chain.getFee() to estimate the cost
 * of a cross-chain transfer in the source chain's native token.
 *
 * SDK Function: chain.getFee({ router, destChainSelector, message })
 * Returns: bigint - Fee in native token's smallest unit (wei for ETH)
 *
 * The fee covers:
 * 1. Source chain gas costs
 * 2. CCIP protocol fees
 * 3. Destination chain execution costs
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CCIPError } from '@chainlink/ccip-sdk'
import { useChains } from './useChains'
import { NETWORKS, getRouterAddress, type CCIPMessage } from '../config'

interface FeeEstimateParams {
  /** Source network key */
  sourceNetwork: string
  /** Destination network key */
  destNetwork: string
  /** CCIP message (built once, reused for fee estimation and sending) */
  message: CCIPMessage | null
}

interface FeeEstimateResult {
  /** Estimated fee in native token's smallest unit */
  fee: bigint | null
  /** Fee formatted for display */
  feeFormatted: string
  /** Whether fee is being calculated */
  isLoading: boolean
  /** Any error during estimation */
  error: Error | null
  /** Manually refresh the fee estimate */
  refetch: () => void
}

/**
 * Hook to estimate CCIP transfer fees
 *
 * @example
 * const message = buildCCIPMessage({
 *   receiver: '0x123...',
 *   tokenAddress: BNM_ADDRESS,
 *   amount: parseUnits('10', tokenDecimals), // Use token's actual decimals
 * })
 *
 * const { fee, feeFormatted, isLoading } = useFeeEstimate({
 *   sourceNetwork: 'ethereum-sepolia',
 *   destNetwork: 'base-sepolia',
 *   message,
 * })
 *
 * // Display: "Fee: 0.001 ETH"
 */
export function useFeeEstimate({
  sourceNetwork,
  destNetwork,
  message,
}: FeeEstimateParams): FeeEstimateResult {
  const { getChain } = useChains()
  const [fee, setFee] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Serialize message for stable dependency comparison
  // This prevents infinite loops when parent passes new object references
  const messageKey = useMemo(
    () =>
      message
        ? `${message.receiver}:${message.data}:${message.tokenAmounts.map((t) => `${t.token}:${t.amount}`).join(',')}`
        : '',
    [message]
  )

  const fetchFee = useCallback(async () => {
    // Skip if params are incomplete
    if (!sourceNetwork || !destNetwork || !message) {
      setFee(null)
      return
    }

    const sourceChain = getChain(sourceNetwork)
    const destConfig = NETWORKS[destNetwork]
    const router = getRouterAddress(sourceNetwork)

    if (!sourceChain || !destConfig || !router) {
      setError(new Error('Invalid network configuration'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      /**
       * CCIP SDK: chain.getFee()
       *
       * Estimates the fee for a cross-chain message.
       * The same message object is reused for sending.
       *
       * Parameters:
       * - router: CCIP Router address on source chain
       * - destChainSelector: Destination chain selector (bigint)
       * - message: CCIPMessage structure
       *
       * Returns: bigint - Fee in native token's smallest unit
       */
      const estimatedFee = await sourceChain.getFee({
        router,
        destChainSelector: destConfig.chainSelector,
        message,
      })

      setFee(estimatedFee)
    } catch (err) {
      /**
       * CCIP SDK Error Handling:
       * Use CCIPError.isCCIPError() to check for SDK errors and access
       * isTransient, retryAfterMs, and recovery properties
       */
      if (CCIPError.isCCIPError(err)) {
        console.error('Fee estimation failed:', err.message)
        if (err.recovery) {
          console.warn('Recovery suggestion:', err.recovery)
        }
        setError(err)
      } else {
        console.error('Fee estimation failed:', err)
        setError(err instanceof Error ? err : new Error('Fee estimation failed'))
      }
      setFee(null)
    } finally {
      setIsLoading(false)
    }
  }, [sourceNetwork, destNetwork, message, getChain])

  // Fetch fee on parameter changes
  // messageKey is used to trigger re-fetch when message values change
  // without causing infinite loops from object reference changes
  useEffect(() => {
    fetchFee()
  }, [fetchFee, messageKey])

  // Format fee for display
  const sourceConfig = NETWORKS[sourceNetwork]
  const feeFormatted = formatFee(fee, sourceConfig?.nativeCurrency.decimals ?? 18)

  return {
    fee,
    feeFormatted,
    isLoading,
    error,
    refetch: fetchFee,
  }
}

/**
 * Format fee for human-readable display
 */
function formatFee(fee: bigint | null, decimals: number): string {
  if (fee === null) return '-'

  const divisor = BigInt(10 ** decimals)
  const intPart = fee / divisor
  const fracPart = fee % divisor

  // Format with up to 6 decimal places
  const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6)
  const trimmedFrac = fracStr.replace(/0+$/, '')

  if (trimmedFrac === '') {
    return intPart.toString()
  }

  return `${intPart}.${trimmedFrac}`
}
