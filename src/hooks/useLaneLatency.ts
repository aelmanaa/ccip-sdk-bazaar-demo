/**
 * Lane Latency Hook
 *
 * CCIP SDK INTEGRATION: Uses chain.getLaneLatency() to get the
 * estimated transfer time between two chains.
 *
 * SDK Function: chain.getLaneLatency(destChainSelector)
 * Returns: { totalMs: number, ... } - Estimated time in milliseconds
 *
 * This helps users understand how long their transfer will take.
 * Latency varies based on:
 * 1. Source chain finality time
 * 2. DON (Decentralized Oracle Network) processing
 * 3. Destination chain confirmation time
 */

import { useState, useEffect, useCallback } from 'react'
import { CCIPError } from '@chainlink/ccip-sdk'
import { useChains } from './useChains'
import { NETWORKS } from '../config'

interface LaneLatencyResult {
  /** Estimated latency in milliseconds */
  latencyMs: number | null
  /** Formatted latency string (e.g., "~15 minutes") */
  latencyFormatted: string
  /** Whether latency is being fetched */
  isLoading: boolean
  /** Any error during fetch */
  error: Error | null
}

/**
 * Hook to get estimated transfer time for a CCIP lane
 *
 * @example
 * const { latencyFormatted, isLoading } = useLaneLatency(
 *   'ethereum-sepolia',
 *   'base-sepolia'
 * )
 *
 * // Display: "Estimated delivery: ~15 minutes"
 */
export function useLaneLatency(sourceNetwork: string, destNetwork: string): LaneLatencyResult {
  const { getChain } = useChains()
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLatency = useCallback(async () => {
    if (!sourceNetwork || !destNetwork) {
      setLatencyMs(null)
      return
    }

    const sourceChain = getChain(sourceNetwork)
    const destConfig = NETWORKS[destNetwork]

    if (!sourceChain || !destConfig) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      /**
       * CCIP SDK: chain.getLaneLatency()
       *
       * Gets the estimated transfer time for a specific lane.
       *
       * Parameters:
       * - destChainSelector: CCIP chain selector of destination
       *
       * Returns: LaneLatencyResponse with totalMs property
       *
       * The latency includes:
       * - Source chain finality (~12 mins for Ethereum, faster for L2s)
       * - DON processing and attestation
       * - Destination chain execution
       */
      const latency = await sourceChain.getLaneLatency(destConfig.chainSelector)
      setLatencyMs(latency.totalMs)
    } catch (err) {
      /**
       * CCIP SDK Error Handling:
       * Use CCIPError.isCCIPError() to check for SDK errors
       */
      if (CCIPError.isCCIPError(err)) {
        console.error('Failed to get lane latency:', err.message)
        if (err.recovery) {
          console.warn('Recovery suggestion:', err.recovery)
        }
        setError(err)
      } else {
        console.error('Failed to get lane latency:', err)
        setError(err instanceof Error ? err : new Error('Failed to get latency'))
      }
      setLatencyMs(null)
    } finally {
      setIsLoading(false)
    }
  }, [sourceNetwork, destNetwork, getChain])

  useEffect(() => {
    fetchLatency()
  }, [fetchLatency])

  return {
    latencyMs,
    latencyFormatted: formatLatency(latencyMs),
    isLoading,
    error,
  }
}

/**
 * Format latency for human-readable display
 *
 * @example
 * formatLatency(900000) // "~15 minutes"
 * formatLatency(3600000) // "~1 hour"
 */
function formatLatency(ms: number | null): string {
  if (ms === null) return '-'

  const minutes = Math.round(ms / 60000)

  if (minutes < 1) {
    return '< 1 minute'
  } else if (minutes === 1) {
    return '~1 minute'
  } else if (minutes < 60) {
    return `~${minutes} minutes`
  } else {
    const hours = Math.round(minutes / 60)
    return hours === 1 ? '~1 hour' : `~${hours} hours`
  }
}
