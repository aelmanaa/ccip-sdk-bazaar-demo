/**
 * Token Configuration
 *
 * CCIP SDK INTEGRATION: CCIP-BnM (Burn and Mint) is a test token
 * specifically designed for CCIP testing. It can be freely minted
 * from faucets and transferred across supported chains.
 *
 * In production, you would:
 * 1. Fetch token addresses from the CCIP API
 * 2. Support multiple tokens
 * 3. Validate token support on each lane
 */

import type { NetworkConfig } from './networks'

export interface TokenConfig {
  /** Token symbol */
  symbol: string
  /** Token name */
  name: string
  /** Token decimals */
  decimals: number
  /** Token addresses per network */
  addresses: Record<string, string>
}

/**
 * CCIP-BnM Token Configuration
 *
 * These addresses are for the CCIP-BnM test token on testnets.
 * Get tokens from: https://faucets.chain.link/
 *
 * Address format:
 * - EVM: 0x-prefixed hex address
 * - Solana: Base58-encoded public key
 */
export const CCIP_BNM: TokenConfig = {
  symbol: 'CCIP-BnM',
  name: 'CCIP Burn & Mint Test Token',
  decimals: 18, // Note: Solana uses 9 decimals, but SDK handles conversion
  addresses: {
    'ethereum-sepolia': '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
    'base-sepolia': '0x88A2d74F47a237a62e7A51cdDa67270CE381555e',
    'avalanche-fuji': '0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4',
    'solana-devnet': '3PjyGzj1jGVgHSKS4VR1Hr1memm63PmN8L9rtPDKwzZ6',
  },
}

/**
 * Router addresses per network
 *
 * The CCIP Router is the main entry point for sending cross-chain messages.
 * These addresses are used with chain.sendMessage() and chain.getFee()
 */
export const ROUTERS: Record<string, string> = {
  'ethereum-sepolia': '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59',
  'base-sepolia': '0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93',
  'avalanche-fuji': '0xF694E193200268f9a4868e4Aa017A0118C9a8177',
  'solana-devnet': 'Ccip842gzYHhvdDkSyi2YVCoAWPbYJoApMFzSxQroE9C',
}

/**
 * Get token address for a specific network
 *
 * @example
 * const bnmAddress = getTokenAddress(CCIP_BNM, 'ethereum-sepolia')
 * // => '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05'
 */
export function getTokenAddress(token: TokenConfig, networkKey: string): string | undefined {
  return token.addresses[networkKey]
}

/**
 * Get router address for a network
 *
 * @example
 * const router = getRouterAddress('ethereum-sepolia')
 */
export function getRouterAddress(networkKey: string): string | undefined {
  return ROUTERS[networkKey]
}

/**
 * Check if a token is supported on a network
 */
export function isTokenSupportedOnNetwork(token: TokenConfig, networkKey: string): boolean {
  return networkKey in token.addresses
}

/**
 * Get token decimals for a network
 *
 * Note: Solana uses 9 decimals for SPL tokens, EVM uses 18.
 * The SDK handles the conversion internally.
 */
export function getTokenDecimals(token: TokenConfig, network: NetworkConfig): number {
  if (network.type === 'solana') {
    return 9 // SPL tokens use 9 decimals
  }
  return token.decimals
}

/**
 * Format token amount for display
 *
 * @example
 * formatTokenAmount(1000000000000000000n, 18) // => '1.0'
 * formatTokenAmount(1000000000n, 9) // => '1.0'
 */
export function formatTokenAmount(amount: bigint, decimals: number, maxDecimals = 6): string {
  const divisor = BigInt(10 ** decimals)
  const intPart = amount / divisor
  const fracPart = amount % divisor

  if (fracPart === 0n) {
    return intPart.toString()
  }

  // Convert fractional part to string with proper padding
  const fracStr = fracPart.toString().padStart(decimals, '0')
  // Trim trailing zeros and limit to maxDecimals
  const trimmed = fracStr.slice(0, maxDecimals).replace(/0+$/, '')

  if (trimmed === '') {
    return intPart.toString()
  }

  return `${intPart}.${trimmed}`
}

/**
 * Parse token amount from user input
 * Returns 0n on invalid input instead of throwing
 *
 * @example
 * parseTokenAmount('1.5', 18) // => 1500000000000000000n
 * parseTokenAmount('invalid', 18) // => 0n
 */
export function parseTokenAmount(input: string, decimals: number): bigint {
  // Handle empty or invalid input
  if (!input || !/^\d*\.?\d*$/.test(input)) {
    return 0n
  }

  try {
    const [intPart = '0', fracPart = ''] = input.split('.')
    const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals)
    return BigInt(intPart + paddedFrac)
  } catch {
    return 0n
  }
}
