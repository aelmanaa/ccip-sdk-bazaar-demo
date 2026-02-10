/**
 * Message Status Hook (React Query Implementation)
 *
 * CCIP SDK INTEGRATION: Uses chain.getMessageById() with React Query's
 * built-in polling to track message status until final state.
 *
 * SDK Function: chain.getMessageById(messageId)
 * Returns: Message status object with state, timestamps, etc.
 *
 * This implementation uses React Query for:
 * - Automatic polling with dynamic intervals
 * - Built-in caching and request deduplication
 * - Automatic cleanup on unmount
 * - Error handling with automatic retry
 *
 * Message lifecycle:
 * 1. SENT - Transaction submitted on source chain
 * 2. COMMITTED - Message committed by DON
 * 3. SUCCESS - Message executed on destination
 * 4. FAILED - Execution failed (can be retried)
 *
 * Timeout: Polling will stop after 35 minutes if message doesn't reach final state
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CCIPError,
  CCIPMessageIdNotFoundError,
  MessageStatus,
  getRetryDelay,
} from '@chainlink/ccip-sdk'

import { useChains } from './useChains'
import { TIMEOUT_DEFAULTS, formatElapsedTime, DEFAULT_POLLING_CONFIG } from '../utils/timeout'

/**
 * Detailed CCIP message status stages
 */
export type DetailedMessageStatus =
  | 'UNKNOWN'
  | 'SENT'
  | 'SOURCE_FINALIZED'
  | 'COMMITTED'
  | 'BLESSED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'SUCCESS'
  | 'FAILED'

/**
 * Simplified message states for high-level UI display
 */
export type MessageState = 'SENT' | 'COMMITTED' | 'SUCCESS' | 'FAILED' | 'UNKNOWN'

/**
 * Map SDK MessageStatus to detailed status
 */
function mapToDetailedStatus(
  status: (typeof MessageStatus)[keyof typeof MessageStatus]
): DetailedMessageStatus {
  switch (status) {
    case MessageStatus.Sent:
      return 'SENT'
    case MessageStatus.SourceFinalized:
      return 'SOURCE_FINALIZED'
    case MessageStatus.Committed:
      return 'COMMITTED'
    case MessageStatus.Blessed:
      return 'BLESSED'
    case MessageStatus.Verifying:
      return 'VERIFYING'
    case MessageStatus.Verified:
      return 'VERIFIED'
    case MessageStatus.Success:
      return 'SUCCESS'
    case MessageStatus.Failed:
      return 'FAILED'
    default:
      return 'UNKNOWN'
  }
}

/**
 * Map detailed status to simplified state
 */
function mapToSimplifiedState(detailed: DetailedMessageStatus): MessageState {
  switch (detailed) {
    case 'SENT':
    case 'SOURCE_FINALIZED':
      return 'SENT'
    case 'COMMITTED':
    case 'BLESSED':
    case 'VERIFYING':
    case 'VERIFIED':
      return 'COMMITTED'
    case 'SUCCESS':
      return 'SUCCESS'
    case 'FAILED':
      return 'FAILED'
    default:
      return 'UNKNOWN'
  }
}

/**
 * Get human-readable description for detailed CCIP status
 */
function getDetailedDescription(status: DetailedMessageStatus): string {
  switch (status) {
    case 'SENT':
      return 'Transaction submitted on source chain...'
    case 'SOURCE_FINALIZED':
      return 'Source chain reached finality, waiting for DON...'
    case 'COMMITTED':
      return 'DON committed merkle root to destination...'
    case 'BLESSED':
      return 'Risk Management Network approved the message...'
    case 'VERIFYING':
      return 'Verifying message on destination chain...'
    case 'VERIFIED':
      return 'Message verified, ready for execution...'
    case 'SUCCESS':
      return 'Transfer completed successfully!'
    case 'FAILED':
      return 'Transfer failed. Please try again.'
    default:
      return 'Checking status...'
  }
}

interface MessageStatusResult {
  /** Current message state (simplified) */
  state: MessageState
  /** Detailed CCIP status for educational display */
  detailedStatus: DetailedMessageStatus
  /** Human-readable status description */
  description: string
  /** Source transaction hash */
  sourceTxHash: string | null
  /** Destination transaction hash (when available) */
  destTxHash: string | null
  /** Whether still polling */
  isPolling: boolean
  /** Whether message reached final state */
  isFinal: boolean
  /** Whether polling timed out (max 35 minutes) */
  isTimedOut: boolean
  /** Elapsed time since polling started (formatted) */
  elapsedTime: string
  /** Any error during polling */
  error: Error | null
  /** Stop polling manually */
  stopPolling: () => void
}

/**
 * Hook to poll message status until final state using React Query
 *
 * Uses dynamic polling intervals with exponential backoff.
 * Automatically stops when message reaches SUCCESS or FAILED.
 *
 * @example
 * const { state, description, isFinal, destTxHash } = useMessageStatus(
 *   'ethereum-sepolia',
 *   '0xabc123...'  // messageId
 * )
 *
 * if (state === 'SUCCESS') {
 *   console.log('Transfer complete! Dest tx:', destTxHash)
 * }
 */
export function useMessageStatus(
  sourceNetwork: string,
  messageId: string | null
): MessageStatusResult {
  const { getChain } = useChains()

  // Track polling state
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('')
  const [manualStop, setManualStop] = useState(false)

  // Refs for timing
  const startTimeRef = useRef<number | null>(null)
  const pollCountRef = useRef(0)
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Reset state when messageId changes
  useEffect(() => {
    setIsTimedOut(false)
    setElapsedTime('')
    setManualStop(false)
    pollCountRef.current = 0

    if (messageId) {
      startTimeRef.current = Date.now()
    } else {
      startTimeRef.current = null
    }

    // Cleanup elapsed interval
    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current)
        elapsedIntervalRef.current = null
      }
    }
  }, [messageId])

  // Update elapsed time every second
  useEffect(() => {
    if (!messageId || isTimedOut || manualStop) return

    // Start elapsed time tracking
    setElapsedTime('0s')
    elapsedIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current
        setElapsedTime(formatElapsedTime(elapsed))

        // Check for timeout (35 minutes)
        if (elapsed >= TIMEOUT_DEFAULTS.MESSAGE_POLLING) {
          setIsTimedOut(true)
        }
      }
    }, 1000)

    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current)
        elapsedIntervalRef.current = null
      }
    }
  }, [messageId, isTimedOut, manualStop])

  /**
   * React Query for message status polling
   *
   * CCIP SDK INTEGRATION: Uses chain.getMessageById() which internally
   * handles retries with SDK's withRetry utility. We add polling on top
   * for continuous status updates.
   */
  const {
    data,
    error: queryError,
    isFetching,
  } = useQuery({
    queryKey: ['message-status', sourceNetwork, messageId],

    queryFn: async () => {
      if (!messageId) return null

      const chain = getChain(sourceNetwork)
      if (!chain) {
        throw new Error(`Chain not found for network: ${sourceNetwork}`)
      }

      /**
       * CCIP SDK: chain.getMessageById()
       *
       * Fetches the current status of a CCIP message.
       * The SDK internally handles transient errors with retry logic.
       *
       * SDK v0.96.0: Status fields are now in the `metadata` property:
       * - metadata.status: Message lifecycle status
       * - metadata.receiptTransactionHash: Destination tx hash (if executed)
       */
      const message = await chain.getMessageById(messageId)

      // Increment poll count for backoff calculation
      pollCountRef.current++

      // Access status via metadata field (SDK v0.96.0+)
      const status = message.metadata?.status ?? MessageStatus.Unknown

      return {
        detailedStatus: mapToDetailedStatus(status),
        sourceTxHash: message.log?.transactionHash ?? null,
        destTxHash: message.metadata?.receiptTransactionHash ?? null,
        rawStatus: status,
      }
    },

    // Only run when we have a messageId and haven't timed out/stopped
    enabled: !!messageId && !isTimedOut && !manualStop,

    // Use SDK's error classification for retry decisions
    retry: (failureCount, error) => {
      // CCIPMessageIdNotFoundError is expected during early polling
      if (error instanceof CCIPMessageIdNotFoundError) {
        return failureCount < 20 // Keep retrying, message may not be indexed yet
      }

      // Use SDK's transient error detection
      if (CCIPError.isCCIPError(error) && error.isTransient) {
        return failureCount < 10
      }

      // Retry other errors a few times
      return failureCount < 3
    },

    // Use SDK's error-specific delays for retries
    retryDelay: (attemptIndex, error) => {
      if (CCIPError.isCCIPError(error)) {
        const sdkDelay = getRetryDelay(error)
        if (sdkDelay !== null) {
          return sdkDelay
        }
      }

      // Default exponential backoff
      return Math.min(1000 * 2 ** attemptIndex, 30000)
    },

    // Dynamic polling interval with backoff
    refetchInterval: (query) => {
      const result = query.state.data

      // Stop polling if no messageId or timed out
      if (!messageId || isTimedOut || manualStop) return false

      // Stop polling if final state reached
      if (result?.detailedStatus === 'SUCCESS' || result?.detailedStatus === 'FAILED') {
        return false
      }

      // Exponential backoff: 10s, 15s, 20s, 25s, 30s (capped)
      const delay = Math.min(
        DEFAULT_POLLING_CONFIG.initialDelay +
          pollCountRef.current * DEFAULT_POLLING_CONFIG.delayIncrement,
        DEFAULT_POLLING_CONFIG.maxDelay
      )

      return delay
    },

    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,

    // Consider data stale immediately for continuous polling
    staleTime: 0,

    // Keep in cache for debugging
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Derive values from query result
  const detailedStatus = data?.detailedStatus ?? 'UNKNOWN'
  const state = mapToSimplifiedState(detailedStatus)
  const isFinal = state === 'SUCCESS' || state === 'FAILED'
  const isPolling = isFetching || (!!messageId && !isFinal && !isTimedOut && !manualStop)

  // Get description based on state
  const description = useMemo(() => {
    if (isTimedOut) {
      return 'Status polling timed out. The transfer may still complete.'
    }
    if (!messageId) {
      return 'Waiting for transaction...'
    }
    return getDetailedDescription(detailedStatus)
  }, [isTimedOut, messageId, detailedStatus])

  // Stop polling manually
  const stopPolling = useCallback(() => {
    setManualStop(true)
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current)
      elapsedIntervalRef.current = null
    }
  }, [])

  // Convert query error to Error type
  const error = useMemo(() => {
    if (!queryError) return null
    if (queryError instanceof Error) return queryError
    return new Error(String(queryError))
  }, [queryError])

  return {
    state,
    detailedStatus,
    description,
    sourceTxHash: data?.sourceTxHash ?? null,
    destTxHash: data?.destTxHash ?? null,
    isPolling,
    isFinal,
    isTimedOut,
    elapsedTime,
    error,
    stopPolling,
  }
}
