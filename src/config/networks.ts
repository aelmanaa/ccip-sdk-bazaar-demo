/**
 * Network Configuration
 *
 * CCIP SDK INTEGRATION: This file defines all supported networks for the bridge.
 * Each network includes RPC URLs, explorer links, and faucet information.
 *
 * The SDK uses these configurations to:
 * 1. Initialize chain instances (EVMChain.fromUrl, SolanaChain.fromUrl)
 * 2. Generate explorer links for transactions
 * 3. Display network information in the UI
 */

import { getRpcUrl } from './env'

export type ChainType = 'evm' | 'solana'

export interface NetworkConfig {
  /** Human-readable network name */
  name: string
  /** Network identifier used internally */
  networkId: string
  /** Chain ID (number for EVM, string for others) */
  chainId: number | string
  /** Chain type for wallet selection */
  type: ChainType
  /** RPC endpoint for SDK operations */
  rpcUrl: string
  /** Block explorer base URL */
  explorerUrl: string
  /** Block explorer name for display */
  explorerName: string
  /** Additional URL params (e.g., ?cluster=devnet for Solana) */
  explorerParams?: string
  /** Native currency details */
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  /** Faucet URLs for getting testnet tokens */
  faucets: string[]
  /** CCIP chain selector (used for cross-chain routing) */
  chainSelector: bigint
}

/**
 * Supported Networks Configuration
 *
 * These are testnet networks for the demo. In production, you would
 * replace these with mainnet configurations.
 *
 * Chain selectors are unique identifiers used by CCIP to route messages
 * between chains. They are different from chain IDs!
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  'ethereum-sepolia': {
    name: 'Ethereum Sepolia',
    networkId: 'ethereum-testnet-sepolia',
    chainId: 11155111,
    type: 'evm',
    rpcUrl: getRpcUrl('ethereum-testnet-sepolia'),
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerName: 'Etherscan',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
    faucets: [
      'https://faucets.chain.link/sepolia',
      'https://www.alchemy.com/faucets/ethereum-sepolia',
    ],
    chainSelector: 16015286601757825753n,
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    networkId: 'ethereum-testnet-sepolia-base-1',
    chainId: 84532,
    type: 'evm',
    rpcUrl: getRpcUrl('ethereum-testnet-sepolia-base-1'),
    explorerUrl: 'https://sepolia.basescan.org',
    explorerName: 'BaseScan',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
    faucets: [
      'https://faucets.chain.link/base-sepolia',
      'https://www.alchemy.com/faucets/base-sepolia',
    ],
    chainSelector: 10344971235874465080n,
  },
  'avalanche-fuji': {
    name: 'Avalanche Fuji',
    networkId: 'avalanche-testnet-fuji',
    chainId: 43113,
    type: 'evm',
    rpcUrl: getRpcUrl('avalanche-testnet-fuji'),
    explorerUrl: 'https://testnet.snowtrace.io',
    explorerName: 'Snowtrace',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    faucets: [
      'https://faucets.chain.link/fuji',
      'https://core.app/tools/testnet-faucet/?subnet=c&token=c',
    ],
    chainSelector: 14767482510784806043n,
  },
  'solana-devnet': {
    name: 'Solana Devnet',
    networkId: 'solana-devnet',
    chainId: 'solana-devnet',
    type: 'solana',
    rpcUrl: getRpcUrl('solana-devnet'),
    explorerUrl: 'https://explorer.solana.com',
    explorerName: 'Solana Explorer',
    explorerParams: '?cluster=devnet',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    faucets: ['https://faucet.solana.com/'],
    chainSelector: 16423721717087811551n,
  },
} as const

/**
 * Get network by chain ID
 *
 * @example
 * const network = getNetworkByChainId(11155111)
 * console.log(network?.name) // 'Ethereum Sepolia'
 */
export function getNetworkByChainId(chainId: number | string): NetworkConfig | undefined {
  return Object.values(NETWORKS).find((n) => n.chainId === chainId)
}

/**
 * Get network by chain selector
 *
 * CCIP SDK uses chain selectors to identify destination chains.
 * This helper finds the network config from a selector.
 *
 * @example
 * const destNetwork = getNetworkBySelector(16015286601757825753n)
 */
export function getNetworkBySelector(selector: bigint): NetworkConfig | undefined {
  return Object.values(NETWORKS).find((n) => n.chainSelector === selector)
}

/**
 * Generate block explorer URL for a transaction
 *
 * @example
 * const url = getExplorerTxUrl('ethereum-sepolia', '0x123...')
 * // => 'https://sepolia.etherscan.io/tx/0x123...'
 */
export function getExplorerTxUrl(networkKey: string, txHash: string): string {
  const network = NETWORKS[networkKey]
  if (!network) return ''

  const params = network.explorerParams || ''
  if (network.type === 'solana') {
    return `${network.explorerUrl}/tx/${txHash}${params}`
  }
  return `${network.explorerUrl}/tx/${txHash}`
}

/**
 * Generate block explorer URL for an address
 *
 * @example
 * const url = getExplorerAddressUrl('solana-devnet', 'ABC123...')
 * // => 'https://explorer.solana.com/address/ABC123...?cluster=devnet'
 */
export function getExplorerAddressUrl(networkKey: string, address: string): string {
  const network = NETWORKS[networkKey]
  if (!network) return ''

  const params = network.explorerParams || ''
  if (network.type === 'solana') {
    return `${network.explorerUrl}/address/${address}${params}`
  }
  return `${network.explorerUrl}/address/${address}`
}

/**
 * Get all EVM networks (for wagmi chain configuration)
 */
export function getEVMNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS).filter((n) => n.type === 'evm')
}

/**
 * Get all Solana networks
 */
export function getSolanaNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS).filter((n) => n.type === 'solana')
}

/**
 * Network keys for iteration
 */
export const NETWORK_KEYS = Object.keys(NETWORKS) as (keyof typeof NETWORKS)[]
