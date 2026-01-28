/**
 * Token Metadata Hook
 *
 * CCIP SDK INTEGRATION: Uses chain.getTokenInfo() to fetch on-chain
 * token metadata including symbol, name, and decimals.
 *
 * SDK Function: chain.getTokenInfo(tokenAddress)
 * Returns: { symbol, decimals, name } (for ERC20/SPL tokens)
 *
 * Educational Note: This demonstrates how to fetch token information
 * directly from the blockchain using the CCIP SDK.
 */

import { useState, useEffect, useCallback } from 'react'
import { useChains } from './useChains'
import { TIMEOUT_DEFAULTS, withTimeout } from '../utils/timeout'
import { categorizeError, type CategorizedError } from '../utils/errors'

/**
 * Token metadata structure from SDK
 */
export interface TokenMetadata {
  /** Token symbol (e.g., "CCIP-BnM") */
  symbol: string
  /** Token name (e.g., "CCIP Burn & Mint Test Token") */
  name: string
  /** Token decimals (e.g., 18 for EVM, 9 for Solana SPL) */
  decimals: number
}

/**
 * Hook result for token metadata
 */
interface UseTokenMetadataResult {
  /** Token metadata if loaded */
  metadata: TokenMetadata | null
  /** Token symbol shorthand */
  symbol: string | null
  /** Token name shorthand */
  name: string | null
  /** Token decimals shorthand */
  decimals: number | null
  /** Whether currently fetching */
  isLoading: boolean
  /** Any error during fetch */
  error: CategorizedError | null
  /** Manually refetch metadata */
  refetch: () => void
}

/**
 * Hook to fetch token metadata from the blockchain
 *
 * Uses the CCIP SDK's getTokenInfo() method to query on-chain token data.
 * Caches results and auto-fetches when network or token changes.
 *
 * @example
 * const { symbol, name, decimals, isLoading } = useTokenMetadata(
 *   'ethereum-sepolia',
 *   '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05'
 * )
 *
 * if (isLoading) return <Spinner />
 * return <div>{symbol} ({decimals} decimals)</div>
 */
export function useTokenMetadata(
  networkKey: string | undefined,
  tokenAddress: string | undefined
): UseTokenMetadataResult {
  const { getChain } = useChains()
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<CategorizedError | null>(null)

  const fetchMetadata = useCallback(async () => {
    if (!networkKey || !tokenAddress) {
      setMetadata(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const chain = getChain(networkKey)
    if (!chain) {
      setError(categorizeError(new Error(`Chain not found: ${networkKey}`)))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      /**
       * CCIP SDK: chain.getTokenInfo()
       *
       * Fetches token metadata directly from the blockchain.
       * For EVM: Calls ERC20 name(), symbol(), decimals()
       * For Solana: Queries SPL token mint account
       */
      const result = await withTimeout(
        chain.getTokenInfo(tokenAddress),
        TIMEOUT_DEFAULTS.TOKEN_INFO,
        'Token info fetch'
      )

      if (result.timedOut) {
        setError(categorizeError(result.error))
        setIsLoading(false)
        return
      }

      if (result.error) {
        setError(categorizeError(result.error))
        setIsLoading(false)
        return
      }

      const tokenInfo = result.data
      if (tokenInfo) {
        setMetadata({
          symbol: tokenInfo.symbol,
          name: tokenInfo.name ?? tokenInfo.symbol,
          decimals: tokenInfo.decimals,
        })
      }
    } catch (err) {
      console.error('Failed to fetch token metadata:', err)
      setError(categorizeError(err))
    } finally {
      setIsLoading(false)
    }
  }, [networkKey, tokenAddress, getChain])

  // Fetch when network or token changes
  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  return {
    metadata,
    symbol: metadata?.symbol ?? null,
    name: metadata?.name ?? null,
    decimals: metadata?.decimals ?? null,
    isLoading,
    error,
    refetch: fetchMetadata,
  }
}
