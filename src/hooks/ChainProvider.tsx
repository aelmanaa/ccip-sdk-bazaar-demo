/**
 * CCIP SDK Chain Provider
 *
 * CCIP SDK INTEGRATION: This provider initializes and manages
 * EVMChain and SolanaChain instances from the @chainlink/ccip-sdk.
 *
 * Key concepts:
 * 1. EVM chains use viem adapter to reuse wagmi's public clients
 * 2. Solana chains use SolanaChain.fromUrl()
 * 3. Chains are cached in context to avoid re-initialization
 *
 * SDK Functions used:
 * - fromViemClient(publicClient) - Create EVM chain from viem client
 * - SolanaChain.fromUrl(rpcUrl) - Create Solana chain instance
 */

import { useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { getPublicClient } from '@wagmi/core'
import type { Chain, PublicClient, Transport } from 'viem'
import { SolanaChain } from '@chainlink/ccip-sdk'
import { fromViemClient } from '@chainlink/ccip-sdk/viem'
import { NETWORKS, type NetworkConfig } from '../config/networks'
import { wagmiConfig } from '../config/wagmi'
import { type ChainInstance } from './chainUtils'
import { ChainContext, type ChainContextValue } from './ChainContext'

/**
 * Type for the chain IDs configured in wagmi
 */
type ConfiguredChainId = (typeof wagmiConfig)['chains'][number]['id']

/**
 * Bridge wagmi's strongly-typed PublicClient to the SDK's generic type.
 * Wagmi returns chain-specific PublicClient types while the SDK expects
 * a generic PublicClient<Transport, Chain>. Since both use the same viem
 * version, this is a safe type bridge.
 */
function toGenericPublicClient(
  client: ReturnType<typeof getPublicClient>
): PublicClient<Transport, Chain> {
  return client as PublicClient<Transport, Chain>
}

// Re-export for convenience
export type { ChainContextValue } from './ChainContext'

/**
 * Chain Provider Component
 *
 * Initializes CCIP SDK chain instances for all configured networks.
 * Chain instances are created lazily and cached for reuse.
 *
 * @example
 * // In your App.tsx
 * <ChainProvider>
 *   <YourApp />
 * </ChainProvider>
 *
 * // In any component
 * const { getChain, isLoading } = useChains()
 * const sepoliaChain = getChain('ethereum-sepolia')
 */
export function ChainProvider({ children }: { children: ReactNode }) {
  const [chains, setChains] = useState<Map<string, ChainInstance>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use ref to track chains for cleanup without triggering re-renders
  const chainsRef = useRef<Map<string, ChainInstance>>(new Map())

  /**
   * Initialize all chain instances on mount
   *
   * This runs once when the app loads. Each chain is initialized
   * from its RPC URL using the SDK's factory methods.
   */
  useEffect(() => {
    async function initializeChains() {
      const chainMap = new Map<string, ChainInstance>()

      try {
        // Initialize chains in parallel for faster startup
        const initPromises = Object.entries(NETWORKS).map(async ([key, config]) => {
          try {
            const chain = await createChainInstance(config)
            return { key, chain }
          } catch (err) {
            console.error(`Failed to initialize ${config.name}:`, err)
            // Don't fail completely if one chain fails
            return { key, chain: null }
          }
        })

        const results = await Promise.all(initPromises)

        for (const { key, chain } of results) {
          if (chain) {
            chainMap.set(key, chain)
          }
        }

        // Update both ref and state
        chainsRef.current = chainMap
        setChains(chainMap)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to initialize chains:', err)
        setError(err instanceof Error ? err : new Error('Failed to initialize chains'))
        setIsLoading(false)
      }
    }

    initializeChains()

    // Cleanup: destroy chain instances on unmount
    return () => {
      chainsRef.current.forEach((chain) => {
        // SDK chains may have cleanup methods
        if ('destroy' in chain && typeof chain.destroy === 'function') {
          chain.destroy()
        }
      })
    }
  }, [])

  /**
   * Get chain instance by network key
   */
  const getChain = useCallback(
    (networkKey: string): ChainInstance | undefined => {
      return chains.get(networkKey)
    },
    [chains]
  )

  /**
   * Check if network is EVM type
   */
  const isEVM = useCallback((networkKey: string): boolean => {
    const network = NETWORKS[networkKey]
    return network?.type === 'evm'
  }, [])

  /**
   * Check if network is Solana type
   */
  const isSolana = useCallback((networkKey: string): boolean => {
    const network = NETWORKS[networkKey]
    return network?.type === 'solana'
  }, [])

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<ChainContextValue>(
    () => ({
      chains,
      isLoading,
      error,
      getChain,
      isEVM,
      isSolana,
    }),
    [chains, isLoading, error, getChain, isEVM, isSolana]
  )

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>
}

/**
 * Create chain instance from network config
 *
 * CCIP SDK INTEGRATION: Factory function that creates the appropriate
 * chain instance based on the network type.
 *
 * - EVM chains use fromViemClient() with wagmi's public client
 * - Solana chains use SolanaChain.fromUrl()
 */
async function createChainInstance(config: NetworkConfig): Promise<ChainInstance> {
  if (config.type === 'evm') {
    /**
     * fromViemClient(publicClient)
     *
     * Creates an EVM chain instance from a viem PublicClient.
     * We get the public client from wagmi's config, which reuses
     * the same transport/RPC configuration as the wallet connection.
     *
     * Benefits:
     * - Reuses wagmi's existing transport (no duplicate RPC connections)
     * - Works with injected wallets (MetaMask, etc.)
     * - Shares connection pooling with wagmi
     */
    const chainId = config.chainId as ConfiguredChainId
    const publicClient = getPublicClient(wagmiConfig, { chainId })
    if (!publicClient) {
      throw new Error(`No public client configured for chain ${config.name} (${chainId})`)
    }
    return fromViemClient(toGenericPublicClient(publicClient))
  } else if (config.type === 'solana') {
    /**
     * SolanaChain.fromUrl(rpcUrl)
     *
     * Creates a Solana chain instance connected to the given RPC.
     * Supports devnet, testnet, and mainnet-beta clusters.
     */
    return SolanaChain.fromUrl(config.rpcUrl)
  }

  throw new Error(`Unsupported chain type: ${config.type}`)
}
