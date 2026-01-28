/**
 * CCIP Error Parsing Utilities
 *
 * EDUCATIONAL: This module demonstrates how to parse and decode CCIP-specific errors
 * using the @chainlink/ccip-sdk error parsing utilities.
 *
 * The SDK provides chain-specific parse methods:
 * - EVMChain.parse(error) - Decodes hex error selectors using CCIP contract ABIs
 * - SolanaChain.parse(logs) - Parses Solana transaction logs for error information
 *
 * Common CCIP Errors:
 * - ChainNotAllowed: Destination chain is not enabled for this token/route
 * - RateLimitReached: Token bucket rate limit exceeded
 * - UnsupportedToken: Token is not supported on this lane
 * - InsufficientFeeTokenAmount: Not enough fee token provided
 * - InvalidReceiver: Receiver address format is invalid for destination chain
 */

import { EVMChain, SolanaChain } from '@chainlink/ccip-sdk'

/**
 * Parsed CCIP error with user-friendly message
 */
export interface ParsedCCIPError {
  /** Original error name from the contract (e.g., 'ChainNotAllowed') */
  errorName: string
  /** User-friendly error message */
  userMessage: string
  /** Raw parsed data from the SDK */
  rawParsed: Record<string, unknown>
  /** Chain type where error originated */
  chainType: 'evm' | 'solana'
}

/**
 * Map of known CCIP error names to user-friendly messages
 *
 * EDUCATIONAL: These errors come from CCIP smart contracts.
 * When adding support for new CCIP versions, you may need to add new error mappings here.
 *
 * To find error selectors, use: cast sig "ErrorName(paramTypes)"
 * Example: cast sig "ChainNotAllowed(uint64)" => 0xa9902c7e
 */
const CCIP_ERROR_MESSAGES: Record<string, string> = {
  // Router errors
  ChainNotAllowed:
    'This route is not supported. The destination chain is not enabled for this token.',
  UnsupportedDestinationChain: 'The destination chain is not supported by CCIP.',
  InvalidMsgValue: 'Invalid message value. The fee amount may be incorrect.',

  // Token pool errors
  RateLimitReached:
    'Rate limit reached. Please try a smaller amount or wait for the bucket to refill.',
  TokenRateLimitReached: 'Token rate limit reached. Please try a smaller amount.',
  AggregateValueRateLimitReached: 'Aggregate value rate limit reached.',
  UnsupportedToken: 'This token is not supported on the selected route.',
  PoolDoesNotExist: 'Token pool does not exist for this token.',
  CallerIsNotARampOnRouter: 'Invalid caller - not authorized.',

  // OnRamp errors
  InvalidExtraArgsTag: 'Invalid extra arguments format.',
  MessageGasLimitTooHigh: 'Message gas limit exceeds maximum allowed.',
  InvalidAddress: 'Invalid address format.',
  InvalidReceiver: 'Invalid receiver address for the destination chain.',

  // Fee errors
  InsufficientFeeTokenAmount:
    'Insufficient fee. Please ensure you have enough native tokens for the fee.',
  InvalidFeeToken: 'Invalid fee token specified.',

  // General errors
  ZeroAddressNotAllowed: 'Zero address is not allowed.',
  MustBeProposedOwner: 'Caller must be the proposed owner.',
  OnlyCallableByOwner: 'Only callable by the contract owner.',
}

/**
 * Extract revert data from viem's nested error structure
 *
 * EDUCATIONAL: viem wraps errors in a cause chain:
 * CallExecutionError -> ExecutionRevertedError -> RpcRequestError
 * The revert data (hex) may be in the 'data' property of any level.
 *
 * @param error - The error object from viem
 * @returns Hex string of revert data or undefined
 */
function extractViemRevertData(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined

  const err = error as Record<string, unknown>

  // Check direct 'data' property (hex string starting with 0x)
  if ('data' in err && typeof err.data === 'string' && err.data.startsWith('0x')) {
    return err.data
  }

  // Check 'revert' property which may contain the data
  if ('revert' in err && err.revert && typeof err.revert === 'object') {
    const revert = err.revert as Record<string, unknown>
    if ('data' in revert && typeof revert.data === 'string' && revert.data.startsWith('0x')) {
      return revert.data
    }
  }

  // Traverse the cause chain (viem's error structure)
  if ('cause' in err && err.cause) {
    return extractViemRevertData(err.cause)
  }

  // Check for hex pattern in error message (some RPCs embed it)
  if ('message' in err && typeof err.message === 'string') {
    const hexMatch = err.message.match(/\b(0x[0-9a-fA-F]{8,})\b/)
    if (hexMatch) {
      return hexMatch[1]
    }
  }

  // Check details field (some viem errors)
  if ('details' in err && typeof err.details === 'string') {
    const hexMatch = err.details.match(/\b(0x[0-9a-fA-F]{8,})\b/)
    if (hexMatch) {
      return hexMatch[1]
    }
  }

  return undefined
}

/**
 * Parse an EVM error using the CCIP SDK
 *
 * EDUCATIONAL: EVMChain.parse() uses the CCIP contract ABIs to decode error selectors.
 * It searches through all known CCIP contract interfaces to find matching error signatures.
 *
 * For viem errors, we first extract the revert data from the nested cause chain,
 * then pass it to the SDK for decoding.
 *
 * @param error - The error object from viem/ethers (should contain 'data' property with hex error)
 * @returns Parsed error info or undefined if not a known CCIP error
 *
 * @example
 * try {
 *   await publicClient.call({ ... })
 * } catch (error) {
 *   const parsed = parseEVMError(error)
 *   if (parsed) {
 *     console.log(parsed.userMessage) // "This route is not supported..."
 *   }
 * }
 */
export function parseEVMError(error: unknown): ParsedCCIPError | undefined {
  try {
    // First, try to extract revert data from viem's error structure
    const revertData = extractViemRevertData(error)
    if (revertData) {
      console.log('Extracted revert data from viem error:', revertData)
    }

    // Try parsing with the SDK - pass either the extracted hex or the full error
    // The SDK can handle both hex strings and ethers-style error objects
    const parsed = EVMChain.parse(revertData || error)
    if (!parsed) {
      // If SDK couldn't parse, but we have revert data, try parsing just the hex
      if (revertData && revertData !== error) {
        const hexParsed = EVMChain.parse(revertData)
        if (hexParsed) {
          console.log('EVMChain.parse() result from hex:', hexParsed)
          return extractParsedError(hexParsed)
        }
      }
      return undefined
    }

    console.log('EVMChain.parse() result:', parsed)
    return extractParsedError(parsed)
  } catch (e) {
    console.debug('EVMChain.parse() failed:', e)
    return undefined
  }
}

/**
 * Extract error name and message from SDK parsed result
 *
 * EDUCATIONAL: The SDK returns different key formats depending on input:
 * - When parsing hex directly: { "error": "ChainNotAllowed(uint64 destChainSelector)", "destChainSelector": 123n }
 * - When parsing full error object: { "revert": "...", "revert.ChainNotAllowed": "..." }
 */
function extractParsedError(parsed: Record<string, unknown>): ParsedCCIPError {
  // Find the error name from the parsed result
  let errorName = 'Unknown'
  let errorInfo = ''

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      // Check for error description like "ChainNotAllowed(uint64 destChainSelector)"
      const match = value.match(/^(\w+)\(/)
      if (match && match[1]) {
        // Verify it's a known error name pattern (starts with uppercase)
        const potentialName = match[1]
        if (potentialName.length > 0 && potentialName[0] === potentialName[0]?.toUpperCase()) {
          errorName = potentialName
          errorInfo = value
          break // Found a good match
        }
      }
    }

    // Also check keys like 'revert.ChainNotAllowed' or 'error.ChainNotAllowed'
    if ((key.startsWith('revert.') || key.startsWith('error.')) && key.includes('.')) {
      const lastPart = key.split('.').pop()
      if (lastPart && lastPart.length > 0 && lastPart[0] === lastPart[0]?.toUpperCase()) {
        errorName = lastPart
        errorInfo = typeof value === 'string' ? value : String(value)
      }
    }
  }

  console.log('Extracted error name:', errorName, 'info:', errorInfo)

  // Provide user-friendly message, with fallback guidance for unknown errors
  const knownMessage = CCIP_ERROR_MESSAGES[errorName]
  let userMessage: string
  if (knownMessage) {
    userMessage = knownMessage
  } else if (errorInfo) {
    userMessage = `Transaction failed: ${errorInfo}. If this persists, please report the error.`
  } else {
    userMessage = `Transaction failed: ${errorName}. If this persists, please report the error.`
  }

  return {
    errorName,
    userMessage,
    rawParsed: parsed,
    chainType: 'evm',
  }
}

/**
 * Parse a Solana error using the CCIP SDK
 *
 * EDUCATIONAL: SolanaChain.parse() extracts error information from Solana transaction logs.
 * Solana programs log errors as text, which are then parsed into structured format.
 *
 * @param errorOrLogs - Error object with logs property, or array of log strings
 * @returns Parsed error info or undefined if not parseable
 *
 * @example
 * try {
 *   await sendTransaction(transaction, connection)
 * } catch (error) {
 *   const parsed = parseSolanaError(error)
 *   if (parsed) {
 *     console.log(parsed.userMessage)
 *   }
 * }
 */
export function parseSolanaError(errorOrLogs: unknown): ParsedCCIPError | undefined {
  try {
    // Handle different error formats
    let dataToparse: unknown = errorOrLogs

    // If it's an error object, try to extract logs
    if (errorOrLogs && typeof errorOrLogs === 'object') {
      const err = errorOrLogs as Record<string, unknown>
      if ('logs' in err && Array.isArray(err.logs)) {
        dataToparse = err.logs
      } else if ('transactionLogs' in err) {
        dataToparse = err
      }
    }

    const parsed = SolanaChain.parse(dataToparse)
    if (!parsed) return undefined

    console.log('SolanaChain.parse() result:', parsed)

    // Cast to Record for flexible property access
    // The SDK returns different shapes depending on the error type
    const parsedRecord = parsed as Record<string, unknown>

    // Extract error name and message from parsed result
    const errorName = parsedRecord.program ? String(parsedRecord.program) : 'SolanaProgram'
    const errorMessage = parsedRecord.error ? String(parsedRecord.error) : JSON.stringify(parsed)

    // Check for known error patterns in the message
    let userMessage = `Solana transaction failed: ${errorMessage}. If this persists, please report the error.`
    for (const [pattern, message] of Object.entries(CCIP_ERROR_MESSAGES)) {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        userMessage = message
        break
      }
    }

    return {
      errorName,
      userMessage,
      rawParsed: parsedRecord,
      chainType: 'solana',
    }
  } catch (e) {
    console.debug('SolanaChain.parse() failed:', e)
    return undefined
  }
}

/**
 * Parse any CCIP error (auto-detects chain type)
 *
 * EDUCATIONAL: This is a convenience function that tries both parsers.
 * In a real application, you would know which chain the error came from
 * and call the appropriate parser directly.
 *
 * @param error - Error from transaction
 * @param chainType - Optional hint for which chain the error is from
 * @returns Parsed error or undefined
 */
export function parseCCIPError(
  error: unknown,
  chainType?: 'evm' | 'solana'
): ParsedCCIPError | undefined {
  if (chainType === 'evm') {
    return parseEVMError(error)
  }
  if (chainType === 'solana') {
    return parseSolanaError(error)
  }

  // Try EVM first (more common), then Solana
  return parseEVMError(error) || parseSolanaError(error)
}

/**
 * Check if an error is a known CCIP error that can be parsed
 *
 * @param error - Error to check
 * @returns true if the error can be parsed as a CCIP error
 */
export function isCCIPError(error: unknown): boolean {
  return parseCCIPError(error) !== undefined
}

/**
 * Get user-friendly message for a CCIP error
 *
 * @param error - Error from transaction
 * @param chainType - Chain type hint
 * @returns User-friendly error message
 */
export function getCCIPErrorMessage(error: unknown, chainType?: 'evm' | 'solana'): string {
  const parsed = parseCCIPError(error, chainType)
  if (parsed) {
    return parsed.userMessage
  }

  // Fallback to generic message
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}
