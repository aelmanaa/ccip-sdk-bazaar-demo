/**
 * useChains Hook
 *
 * Hook to access the ChainContext for CCIP SDK chain operations.
 * Must be used within a ChainProvider.
 */

import { useContext } from 'react'
import { ChainContext, type ChainContextValue } from './ChainContext'

// Re-export types for convenience
export type { ChainContextValue } from './ChainContext'
export type { ChainInstance } from './chainUtils'

/**
 * Hook to access chain context
 *
 * @example
 * function MyComponent() {
 *   const { getChain, isLoading } = useChains()
 *
 *   if (isLoading) return <Spinner />
 *
 *   const chain = getChain('ethereum-sepolia')
 *   // Use chain for SDK operations...
 * }
 */
export function useChains(): ChainContextValue {
  const context = useContext(ChainContext)
  if (!context) {
    throw new Error('useChains must be used within a ChainProvider')
  }
  return context
}
