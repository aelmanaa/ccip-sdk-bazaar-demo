/**
 * Environment Configuration
 *
 * Handles RPC URL resolution with fallbacks to public endpoints.
 * Uses SDK-compatible network IDs for env var naming (from selectors.ts).
 * Priority: Environment variable > Public fallback
 */

/**
 * SDK Network IDs (from @chainlink/ccip-sdk selectors.ts)
 * These are the canonical identifiers used by the CCIP SDK.
 */
export type SdkNetworkId =
  | 'ethereum-testnet-sepolia'
  | 'ethereum-testnet-sepolia-base-1'
  | 'avalanche-testnet-fuji'
  | 'solana-devnet'

/** Public RPC fallbacks (work without API keys, may have rate limits) */
const FALLBACK_RPC_URLS: Record<SdkNetworkId, string> = {
  'ethereum-testnet-sepolia': 'https://ethereum-sepolia-rpc.publicnode.com',
  'ethereum-testnet-sepolia-base-1': 'https://sepolia.base.org',
  'avalanche-testnet-fuji': 'https://api.avax-test.network/ext/bc/C/rpc',
  'solana-devnet': 'https://api.devnet.solana.com',
}

/**
 * Convert SDK network ID to environment variable name
 * e.g., 'ethereum-testnet-sepolia' -> 'VITE_RPC_ETHEREUM_TESTNET_SEPOLIA'
 */
function toEnvVarName(networkId: SdkNetworkId): string {
  return `VITE_RPC_${networkId.toUpperCase().replace(/-/g, '_')}`
}

/** Track which networks have shown fallback info (dev mode only) */
const shownFallbackInfo = new Set<string>()

/**
 * Get RPC URL for a network with fallback support
 *
 * @param networkId - SDK network ID (from selectors.ts)
 * @returns RPC URL (from env var or public fallback)
 */
export function getRpcUrl(networkId: SdkNetworkId): string {
  const envVar = toEnvVarName(networkId)
  const envValue = import.meta.env[envVar]

  // Use env var if set and non-empty
  if (envValue && typeof envValue === 'string' && envValue.trim() !== '') {
    return envValue.trim()
  }

  // Log info once per network in dev mode
  if (import.meta.env.DEV && !shownFallbackInfo.has(networkId)) {
    shownFallbackInfo.add(networkId)
    console.info(
      `[RPC] Using public endpoint for ${networkId}. ` +
        `Set ${envVar} in .env for higher rate limits.`
    )
  }

  return FALLBACK_RPC_URLS[networkId]
}
