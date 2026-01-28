/**
 * Chain Context
 *
 * React context for CCIP SDK chain management.
 * Separated from provider for React Fast Refresh compatibility.
 */

import { createContext } from 'react'
import { type ChainInstance } from './chainUtils'

/**
 * Context value shape
 */
export interface ChainContextValue {
  /** Map of network key to initialized chain instance */
  chains: Map<string, ChainInstance>
  /** Whether chains are still loading */
  isLoading: boolean
  /** Any error during initialization */
  error: Error | null
  /** Get chain instance by network key */
  getChain: (networkKey: string) => ChainInstance | undefined
  /** Check if a network is EVM */
  isEVM: (networkKey: string) => boolean
  /** Check if a network is Solana */
  isSolana: (networkKey: string) => boolean
}

export const ChainContext = createContext<ChainContextValue | null>(null)
