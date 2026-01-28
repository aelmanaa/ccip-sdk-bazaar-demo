/**
 * Error Handling Utilities
 *
 * Provides consistent error categorization, user-friendly messages,
 * and error classification for the CCIP bridge application.
 *
 * Error Categories:
 * - WALLET_REJECTION: User rejected transaction in wallet
 * - INSUFFICIENT_BALANCE: Not enough tokens/gas
 * - NETWORK_ERROR: RPC/network connectivity issues
 * - TIMEOUT_ERROR: Operation took too long
 * - VALIDATION_ERROR: Invalid input (address, amount)
 * - SDK_ERROR: CCIP SDK specific errors
 * - UNKNOWN_ERROR: Unclassified errors
 */

import { CCIPError } from '@chainlink/ccip-sdk'

/**
 * Type predicate to check if an unknown value is an Error-like object
 */
function isErrorLike(value: unknown): value is Error {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as Error).message === 'string'
  )
}

/**
 * Error category types for UI display and handling
 */
export type ErrorCategory =
  | 'WALLET_REJECTION'
  | 'INSUFFICIENT_BALANCE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'SDK_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Severity levels for error display
 */
export type ErrorSeverity = 'warning' | 'error'

/**
 * Categorized error with user-friendly message
 */
export interface CategorizedError {
  /** Error category for display/handling */
  category: ErrorCategory
  /** User-friendly error message */
  message: string
  /** Technical details for debugging */
  details?: string
  /** Severity for UI styling */
  severity: ErrorSeverity
  /** Whether the error is recoverable (user can retry) */
  recoverable: boolean
  /** Suggested recovery action */
  recovery?: string
  /** Original error for debugging */
  originalError?: Error
  /** Raw error data for bug reports (copyable by user) */
  rawErrorData?: string
}

/**
 * User-friendly messages for each error category
 */
const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  WALLET_REJECTION: 'Transaction was cancelled',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transfer',
  NETWORK_ERROR: 'Network connection issue. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Operation timed out. Please try again.',
  VALIDATION_ERROR: 'Invalid input. Please check your values.',
  SDK_ERROR: 'An error occurred with the CCIP service',
  UNKNOWN_ERROR: 'An unexpected error occurred',
}

/**
 * Recovery suggestions for each error category
 */
const RECOVERY_SUGGESTIONS: Record<ErrorCategory, string> = {
  WALLET_REJECTION: 'Click the button to try again',
  INSUFFICIENT_BALANCE: 'Get more tokens from the faucet',
  NETWORK_ERROR: 'Check your internet connection or try switching RPC',
  TIMEOUT_ERROR: 'The network may be congested. Try again in a moment.',
  VALIDATION_ERROR: 'Check your input values and try again',
  SDK_ERROR: 'Try again or contact support if the issue persists',
  UNKNOWN_ERROR: 'If this persists, please report this issue with the error details below',
}

/**
 * Patterns for detecting wallet rejection errors
 */
const WALLET_REJECTION_PATTERNS = [
  'user rejected',
  'user denied',
  'rejected by user',
  'user cancelled',
  'user canceled',
  'transaction was rejected',
  'request rejected',
  'action_rejected',
  'ACTION_REJECTED',
]

/**
 * Patterns for detecting insufficient balance errors
 */
const INSUFFICIENT_BALANCE_PATTERNS = [
  'insufficient funds',
  'insufficient balance',
  'not enough',
  'exceeds balance',
  'gas required exceeds',
  'INSUFFICIENT_FUNDS',
]

/**
 * Patterns for detecting network errors
 */
const NETWORK_ERROR_PATTERNS = [
  'network error',
  'failed to fetch',
  'connection refused',
  'timeout',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'network request failed',
  'could not connect',
]

/**
 * Format raw error data for bug reporting
 * Creates a copyable string with all relevant error information
 */
function formatRawErrorData(error: Error): string {
  const lines: string[] = [
    `Error: ${error.message}`,
    `Name: ${error.name}`,
    `Time: ${new Date().toISOString()}`,
    `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
  ]

  // Include stack trace (truncated)
  if (error.stack) {
    const stackLines = error.stack.split('\n').slice(0, 10)
    lines.push('', 'Stack trace:', ...stackLines)
  }

  // Try to extract additional properties from the error
  const errorObj = error as unknown as Record<string, unknown>
  const additionalProps = ['code', 'data', 'reason', 'cause']
  for (const prop of additionalProps) {
    if (prop in errorObj && errorObj[prop] !== undefined) {
      const value = errorObj[prop]
      if (typeof value === 'object') {
        try {
          lines.push(`${prop}: ${JSON.stringify(value, null, 2)}`)
        } catch {
          lines.push(`${prop}: [Unable to stringify]`)
        }
      } else {
        lines.push(`${prop}: ${String(value)}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Categorize an error and return user-friendly information
 *
 * @example
 * try {
 *   await sendTransaction()
 * } catch (err) {
 *   const categorized = categorizeError(err)
 *   showError(categorized.message)
 * }
 */
export function categorizeError(error: unknown): CategorizedError {
  // Handle null/undefined
  if (!error) {
    return createError('UNKNOWN_ERROR', 'An unknown error occurred')
  }

  // Handle CCIP SDK errors
  if (CCIPError.isCCIPError(error)) {
    return handleCCIPError(error)
  }

  // Handle Error instances
  if (error instanceof Error) {
    return handleStandardError(error)
  }

  // Handle string errors
  if (typeof error === 'string') {
    return handleStringError(error)
  }

  // Handle objects with message property
  if (isErrorLike(error)) {
    return handleStandardError(error)
  }

  return createError('UNKNOWN_ERROR', String(error))
}

/**
 * Handle CCIP SDK specific errors
 */
function handleCCIPError(error: CCIPError): CategorizedError {
  const message = error.message || 'CCIP service error'
  const details = error.recovery || undefined

  // Check for specific error types
  if (error.isTransient) {
    return createError('NETWORK_ERROR', message, {
      details,
      recovery: `Will retry automatically in ${Math.ceil((error.retryAfterMs ?? 10000) / 1000)} seconds`,
      recoverable: true,
      originalError: error,
    })
  }

  return createError('SDK_ERROR', message, {
    details,
    recovery: error.recovery || RECOVERY_SUGGESTIONS.SDK_ERROR,
    recoverable: true,
    originalError: error,
  })
}

/**
 * Handle standard Error instances
 */
function handleStandardError(error: Error): CategorizedError {
  const message = error.message.toLowerCase()

  // Check for wallet rejection
  if (WALLET_REJECTION_PATTERNS.some((pattern) => message.includes(pattern.toLowerCase()))) {
    return createError('WALLET_REJECTION', ERROR_MESSAGES.WALLET_REJECTION, {
      details: error.message,
      severity: 'warning',
      recoverable: true,
      originalError: error,
    })
  }

  // Check for insufficient balance
  if (INSUFFICIENT_BALANCE_PATTERNS.some((pattern) => message.includes(pattern.toLowerCase()))) {
    return createError('INSUFFICIENT_BALANCE', ERROR_MESSAGES.INSUFFICIENT_BALANCE, {
      details: error.message,
      recoverable: true,
      originalError: error,
    })
  }

  // Check for network errors
  if (NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern.toLowerCase()))) {
    return createError('NETWORK_ERROR', ERROR_MESSAGES.NETWORK_ERROR, {
      details: error.message,
      recoverable: true,
      originalError: error,
    })
  }

  // Check for timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return createError('TIMEOUT_ERROR', ERROR_MESSAGES.TIMEOUT_ERROR, {
      details: error.message,
      recoverable: true,
      originalError: error,
    })
  }

  // Default to unknown error with the original message
  // Include raw error data for bug reporting
  const rawErrorData = formatRawErrorData(error)
  return createError('UNKNOWN_ERROR', error.message || ERROR_MESSAGES.UNKNOWN_ERROR, {
    details: error.stack,
    recoverable: true,
    originalError: error,
    rawErrorData,
  })
}

/**
 * Handle string errors
 */
function handleStringError(error: string): CategorizedError {
  const lowercaseError = error.toLowerCase()

  if (WALLET_REJECTION_PATTERNS.some((p) => lowercaseError.includes(p.toLowerCase()))) {
    return createError('WALLET_REJECTION', ERROR_MESSAGES.WALLET_REJECTION, {
      details: error,
      severity: 'warning',
      recoverable: true,
    })
  }

  return createError('UNKNOWN_ERROR', error, { recoverable: true })
}

/**
 * Create a categorized error object
 */
function createError(
  category: ErrorCategory,
  message: string,
  options?: Partial<Omit<CategorizedError, 'category' | 'message'>>
): CategorizedError {
  return {
    category,
    message,
    severity: options?.severity ?? (category === 'WALLET_REJECTION' ? 'warning' : 'error'),
    recoverable: options?.recoverable ?? true,
    recovery: options?.recovery ?? RECOVERY_SUGGESTIONS[category],
    details: options?.details,
    originalError: options?.originalError,
    rawErrorData: options?.rawErrorData,
  }
}

/**
 * Create a validation error with a specific message
 *
 * @example
 * if (!isValidAddress(address)) {
 *   throw createValidationError('Invalid wallet address format')
 * }
 */
export function createValidationError(message: string, details?: string): CategorizedError {
  return createError('VALIDATION_ERROR', message, {
    details,
    recoverable: true,
  })
}

/**
 * Create a timeout error with optional operation name
 *
 * @example
 * throw createTimeoutError('Fee estimation', 30000)
 */
export function createTimeoutError(operation: string, timeoutMs: number): CategorizedError {
  return createError(
    'TIMEOUT_ERROR',
    `${operation} timed out after ${Math.ceil(timeoutMs / 1000)} seconds`,
    {
      recovery: 'The network may be slow. Please try again.',
      recoverable: true,
    }
  )
}

/**
 * Check if an error is a wallet rejection
 */
export function isWalletRejection(error: unknown): boolean {
  return categorizeError(error).category === 'WALLET_REJECTION'
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  return categorizeError(error).recoverable
}

/**
 * Get icon name for error category (for UI display)
 */
export function getErrorIcon(category: ErrorCategory): string {
  switch (category) {
    case 'WALLET_REJECTION':
      return 'lock'
    case 'INSUFFICIENT_BALANCE':
      return 'wallet'
    case 'NETWORK_ERROR':
      return 'globe'
    case 'TIMEOUT_ERROR':
      return 'clock'
    case 'VALIDATION_ERROR':
      return 'warning'
    case 'SDK_ERROR':
      return 'chain'
    default:
      return 'error'
  }
}
