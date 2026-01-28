/**
 * Chain Utility Functions
 *
 * Type guards and utility functions for CCIP SDK chain instances.
 * Separated from the provider for React Fast Refresh compatibility.
 */

import { EVMChain, SolanaChain } from '@chainlink/ccip-sdk'

/**
 * Chain instance type - either EVM or Solana
 */
export type ChainInstance = EVMChain | SolanaChain

/**
 * Type guard to check if chain is EVM
 */
export function isEVMChain(chain: ChainInstance): chain is EVMChain {
  return chain instanceof EVMChain
}

/**
 * Type guard to check if chain is Solana
 */
export function isSolanaChain(chain: ChainInstance): chain is SolanaChain {
  return chain instanceof SolanaChain
}
