/**
 * Input Validation Utilities
 *
 * Provides validation for user inputs including:
 * - EVM addresses (using viem's isAddress)
 * - Solana addresses (using @solana/web3.js PublicKey)
 * - Token amounts (decimals, balance checks)
 *
 * Uses proper library utilities instead of regex for robust validation.
 */

import { isAddress } from 'viem'
import { PublicKey } from '@solana/web3.js'

/**
 * Validation result with optional error message
 */
export interface ValidationResult {
  /** Whether the input is valid */
  isValid: boolean
  /** Error message if invalid */
  error?: string
}

/**
 * Amount regex pattern
 * - Positive number
 * - Optional decimal part
 */
const AMOUNT_REGEX = /^\d+\.?\d*$/

/**
 * Validate an EVM address using viem's isAddress
 *
 * @example
 * validateEVMAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f8f2A0')
 * // => { isValid: true }
 *
 * validateEVMAddress('invalid')
 * // => { isValid: false, error: 'Invalid EVM address format' }
 */
export function validateEVMAddress(address: string): ValidationResult {
  if (!address) {
    return { isValid: false, error: 'Address is required' }
  }

  if (!address.startsWith('0x')) {
    return { isValid: false, error: 'EVM address must start with 0x' }
  }

  // Use viem's isAddress for proper validation (includes checksum validation)
  if (!isAddress(address)) {
    return { isValid: false, error: 'Invalid EVM address format' }
  }

  return { isValid: true }
}

/**
 * Validate a Solana address using @solana/web3.js PublicKey
 *
 * @example
 * validateSolanaAddress('HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH')
 * // => { isValid: true }
 *
 * validateSolanaAddress('0x123')
 * // => { isValid: false, error: 'Invalid Solana address format' }
 */
export function validateSolanaAddress(address: string): ValidationResult {
  if (!address) {
    return { isValid: false, error: 'Address is required' }
  }

  // Quick check for EVM address (common mistake)
  if (address.startsWith('0x')) {
    return { isValid: false, error: 'This looks like an EVM address, not Solana' }
  }

  // Use @solana/web3.js PublicKey for proper Base58 validation
  try {
    new PublicKey(address)
    return { isValid: true }
  } catch {
    return { isValid: false, error: 'Invalid Solana address format' }
  }
}

/**
 * Validate an address based on chain type
 *
 * @example
 * validateAddress('0x742d...', 'evm')
 * validateAddress('HN7cAB...', 'solana')
 */
export function validateAddress(address: string, chainType: 'evm' | 'solana'): ValidationResult {
  if (!address) {
    return { isValid: true } // Empty is valid (allows clearing input)
  }

  if (chainType === 'evm') {
    return validateEVMAddress(address)
  }

  if (chainType === 'solana') {
    return validateSolanaAddress(address)
  }

  return { isValid: true }
}

/**
 * Auto-detect chain type from address format
 *
 * @example
 * detectAddressType('0x742d35Cc6634C0532925a3b844Bc9e7595f8f2A0')
 * // => 'evm'
 *
 * detectAddressType('HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH')
 * // => 'solana'
 */
export function detectAddressType(address: string): 'evm' | 'solana' | null {
  if (!address) return null

  // Check EVM first (starts with 0x)
  if (isAddress(address)) {
    return 'evm'
  }

  // Check Solana (Base58 public key)
  try {
    new PublicKey(address)
    return 'solana'
  } catch {
    return null
  }
}

/**
 * Options for amount validation
 */
export interface AmountValidationOptions {
  /** Maximum allowed decimals */
  maxDecimals?: number
  /** Minimum amount (as bigint) */
  minAmount?: bigint
  /** Maximum amount (as bigint) - typically user's balance */
  maxAmount?: bigint
  /** Token symbol for error messages */
  symbol?: string
}

/**
 * Validate a token amount
 *
 * @example
 * validateAmount('1.5', {
 *   maxDecimals: 18,
 *   maxAmount: parseTokenAmount('10', 18),
 *   symbol: 'ETH'
 * })
 */
export function validateAmount(
  amount: string,
  options: AmountValidationOptions = {}
): ValidationResult {
  const { maxDecimals = 18, minAmount = 1n, maxAmount, symbol = 'tokens' } = options

  // Empty is valid (allows clearing input)
  if (!amount) {
    return { isValid: true }
  }

  // Check format
  if (!AMOUNT_REGEX.test(amount)) {
    return { isValid: false, error: 'Invalid amount format' }
  }

  // Check for valid number
  const numValue = parseFloat(amount)
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Invalid amount' }
  }

  // Check for positive
  if (numValue <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' }
  }

  // Check decimals
  const decimalPart = amount.split('.')[1]
  if (decimalPart && decimalPart.length > maxDecimals) {
    return {
      isValid: false,
      error: `Maximum ${maxDecimals} decimal places allowed`,
    }
  }

  // Parse to bigint for balance check
  const parsedAmount = parseAmountToBigInt(amount, maxDecimals)

  // Check minimum
  if (parsedAmount < minAmount) {
    return { isValid: false, error: 'Amount too small' }
  }

  // Check maximum (balance)
  if (maxAmount !== undefined && parsedAmount > maxAmount) {
    return { isValid: false, error: `Insufficient ${symbol} balance` }
  }

  return { isValid: true }
}

/**
 * Parse amount string to bigint with decimals
 * Returns 0n for invalid inputs instead of throwing
 *
 * @example
 * parseAmountToBigInt('1.5', 18)
 * // => 1500000000000000000n
 */
export function parseAmountToBigInt(amount: string, decimals: number): bigint {
  if (!amount || !AMOUNT_REGEX.test(amount)) {
    return 0n
  }

  try {
    const [intPart = '0', fracPart = ''] = amount.split('.')
    const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals)
    return BigInt(intPart + paddedFrac)
  } catch {
    return 0n
  }
}

/**
 * Format bigint amount to string with decimals
 *
 * @example
 * formatBigIntAmount(1500000000000000000n, 18)
 * // => '1.5'
 */
export function formatBigIntAmount(amount: bigint, decimals: number, maxDisplay = 6): string {
  if (amount === 0n) return '0'

  const divisor = BigInt(10 ** decimals)
  const intPart = amount / divisor
  const fracPart = amount % divisor

  if (fracPart === 0n) {
    return intPart.toString()
  }

  const fracStr = fracPart.toString().padStart(decimals, '0')
  const trimmed = fracStr.slice(0, maxDisplay).replace(/0+$/, '')

  if (trimmed === '') {
    return intPart.toString()
  }

  return `${intPart}.${trimmed}`
}

/**
 * Truncate address for display
 *
 * @example
 * truncateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f8f2A0')
 * // => '0x742d...f2A0'
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return ''
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Check if a string is a valid hex string
 */
export function isValidHex(str: string): boolean {
  if (!str) return false
  const hexPattern = /^(0x)?[a-fA-F0-9]+$/
  return hexPattern.test(str)
}
