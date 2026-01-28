/**
 * Wagmi & RainbowKit Configuration
 *
 * WALLET INTEGRATION: This file configures the EVM wallet connection
 * using RainbowKit (UI) + Wagmi (state management) + Viem (chain interaction).
 *
 * Key concepts:
 * 1. Chains - Define which EVM networks users can connect to
 * 2. Transports - How to communicate with each chain (HTTP RPC)
 * 3. Connectors - Wallet connection methods (injected, WalletConnect, etc.)
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { sepolia, baseSepolia, avalancheFuji } from 'wagmi/chains'
import { NETWORKS } from './networks'

/**
 * Custom chain configurations with our RPC URLs
 *
 * We override the default RPC URLs with our Alchemy endpoints
 * for better reliability and rate limits.
 */
const customSepolia = {
  ...sepolia,
  rpcUrls: {
    default: { http: [NETWORKS['ethereum-sepolia']!.rpcUrl] },
  },
}

const customBaseSepolia = {
  ...baseSepolia,
  rpcUrls: {
    default: { http: [NETWORKS['base-sepolia']!.rpcUrl] },
  },
}

const customAvalancheFuji = {
  ...avalancheFuji,
  rpcUrls: {
    default: { http: [NETWORKS['avalanche-fuji']!.rpcUrl] },
  },
}

/**
 * Wagmi Configuration
 *
 * getDefaultConfig() is a convenience function from RainbowKit that:
 * 1. Sets up the wagmi config with common defaults
 * 2. Configures RainbowKit-specific features
 * 3. Handles wallet connector setup
 *
 * For production:
 * - Replace projectId with your WalletConnect Cloud project ID
 * - Add your app's metadata (name, description, url, icons)
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'CCIP Token Bridge',
  // Get a free project ID at https://cloud.walletconnect.com
  projectId: 'ccip-sdk-demo-dev',
  chains: [customSepolia, customBaseSepolia, customAvalancheFuji],
  transports: {
    [sepolia.id]: http(NETWORKS['ethereum-sepolia']!.rpcUrl),
    [baseSepolia.id]: http(NETWORKS['base-sepolia']!.rpcUrl),
    [avalancheFuji.id]: http(NETWORKS['avalanche-fuji']!.rpcUrl),
  },
  ssr: false, // Set to true if using server-side rendering
})

/**
 * Map chain ID to network key
 *
 * Used to bridge between wagmi's chain ID and our network configuration.
 */
export const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  [sepolia.id]: 'ethereum-sepolia',
  [baseSepolia.id]: 'base-sepolia',
  [avalancheFuji.id]: 'avalanche-fuji',
}

/**
 * Map network key to chain ID
 */
export const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  'ethereum-sepolia': sepolia.id,
  'base-sepolia': baseSepolia.id,
  'avalanche-fuji': avalancheFuji.id,
}

/**
 * Get wagmi chain object by network key
 */
export function getWagmiChain(networkKey: string) {
  switch (networkKey) {
    case 'ethereum-sepolia':
      return customSepolia
    case 'base-sepolia':
      return customBaseSepolia
    case 'avalanche-fuji':
      return customAvalancheFuji
    default:
      return undefined
  }
}
