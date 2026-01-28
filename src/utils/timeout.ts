/**
 * Timeout Utilities
 *
 * Provides utilities for managing timeouts in async operations:
 * - Message polling: 35 minutes max (some lanes are slow)
 * - Transaction receipt: 2 minutes
 * - Fee estimation: 30 seconds
 *
 * Uses AbortController for clean cancellation of fetch operations.
 */

/**
 * Default timeout values in milliseconds
 */
export const TIMEOUT_DEFAULTS = {
  /** Message status polling timeout (35 minutes - some lanes are slow) */
  MESSAGE_POLLING: 35 * 60 * 1000,
  /** Transaction receipt wait timeout (2 minutes) */
  TRANSACTION_RECEIPT: 2 * 60 * 1000,
  /** Fee estimation timeout (30 seconds) */
  FEE_ESTIMATION: 30 * 1000,
  /** Token info fetch timeout (15 seconds) */
  TOKEN_INFO: 15 * 1000,
  /** Balance fetch timeout (15 seconds) */
  BALANCE_FETCH: 15 * 1000,
  /** Pool info fetch timeout (30 seconds) */
  POOL_INFO: 30 * 1000,
} as const

/**
 * Result of a timeout-wrapped operation
 */
export interface TimeoutResult<T> {
  /** The result if successful */
  data?: T
  /** Whether the operation timed out */
  timedOut: boolean
  /** Any error that occurred */
  error?: Error
}

/**
 * Wrap a promise with a timeout
 *
 * @example
 * const result = await withTimeout(
 *   fetchData(),
 *   5000,
 *   'Data fetch'
 * )
 *
 * if (result.timedOut) {
 *   console.log('Operation timed out')
 * } else if (result.error) {
 *   console.log('Error:', result.error)
 * } else {
 *   console.log('Data:', result.data)
 * }
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName = 'Operation'
): Promise<TimeoutResult<T>> {
  let timeoutId: NodeJS.Timeout | null = null

  const timeoutPromise = new Promise<TimeoutResult<T>>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        timedOut: true,
        error: new Error(`${operationName} timed out after ${Math.ceil(timeoutMs / 1000)} seconds`),
      })
    }, timeoutMs)
  })

  try {
    const data = await Promise.race([
      promise.then((data) => ({ data, timedOut: false as const })),
      timeoutPromise,
    ])

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    return data
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    return {
      timedOut: false,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

/**
 * Create an AbortController with automatic timeout
 *
 * @example
 * const controller = createTimeoutController(5000)
 *
 * fetch(url, { signal: controller.signal })
 *   .finally(() => controller.clear())
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController
  signal: AbortSignal
  clear: () => void
} {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${Math.ceil(timeoutMs / 1000)} seconds`))
  }, timeoutMs)

  return {
    controller,
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  }
}

/**
 * Sleep for a specified duration
 *
 * @example
 * await sleep(1000) // Sleep for 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a cancellable delay that can be aborted
 *
 * @example
 * const abort = new AbortController()
 * await cancellableDelay(5000, abort.signal)
 */
export function cancellableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Delay was cancelled'))
      return
    }

    const timeoutId = setTimeout(resolve, ms)

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      reject(new Error('Delay was cancelled'))
    })
  })
}

/**
 * Polling configuration
 */
export interface PollingConfig {
  /** Initial delay between polls (ms) */
  initialDelay: number
  /** Maximum delay between polls (ms) */
  maxDelay: number
  /** Delay increase per poll (ms) */
  delayIncrement: number
  /** Maximum total time for polling (ms) */
  maxTotalTime: number
}

/**
 * Default polling configuration with exponential backoff
 */
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  initialDelay: 10_000, // 10 seconds
  maxDelay: 30_000, // 30 seconds max
  delayIncrement: 5_000, // +5 seconds per poll
  maxTotalTime: 35 * 60_000, // 35 minutes total (some lanes are slow)
}

/**
 * Create a polling manager with timeout and backoff
 *
 * @example
 * const poller = createPollingManager({
 *   maxTotalTime: 60000, // 1 minute
 * })
 *
 * while (!poller.isTimedOut()) {
 *   const result = await fetchStatus()
 *   if (result.done) break
 *   await poller.wait()
 * }
 */
export function createPollingManager(config: Partial<PollingConfig> = {}): {
  /** Wait for the next poll (with backoff) */
  wait: () => Promise<void>
  /** Check if polling has exceeded max time */
  isTimedOut: () => boolean
  /** Get elapsed time in ms */
  getElapsedTime: () => number
  /** Get current poll count */
  getPollCount: () => number
  /** Cancel polling */
  cancel: () => void
  /** Check if polling was cancelled */
  isCancelled: () => boolean
} {
  const fullConfig = { ...DEFAULT_POLLING_CONFIG, ...config }
  const startTime = Date.now()
  let pollCount = 0
  let cancelled = false

  return {
    wait: async () => {
      if (cancelled) {
        throw new Error('Polling was cancelled')
      }

      const delay = Math.min(
        fullConfig.initialDelay + pollCount * fullConfig.delayIncrement,
        fullConfig.maxDelay
      )
      pollCount++
      await sleep(delay)
    },

    isTimedOut: () => {
      return Date.now() - startTime >= fullConfig.maxTotalTime
    },

    getElapsedTime: () => {
      return Date.now() - startTime
    },

    getPollCount: () => pollCount,

    cancel: () => {
      cancelled = true
    },

    isCancelled: () => cancelled,
  }
}

/**
 * Format remaining time for display
 *
 * @example
 * formatRemainingTime(125000) // "2:05"
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0:00'

  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format elapsed time for display
 *
 * @example
 * formatElapsedTime(65000) // "1m 5s"
 */
export function formatElapsedTime(ms: number): string {
  if (ms < 1000) return 'just now'
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`

  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  if (seconds === 0) return `${minutes}m`
  return `${minutes}m ${seconds}s`
}
