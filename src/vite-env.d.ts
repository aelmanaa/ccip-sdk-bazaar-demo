/// <reference types="vite/client" />

interface ImportMetaEnv {
  // RPC URLs - named after SDK network IDs from selectors.ts
  readonly VITE_RPC_ETHEREUM_TESTNET_SEPOLIA?: string
  readonly VITE_RPC_ETHEREUM_TESTNET_SEPOLIA_BASE_1?: string
  readonly VITE_RPC_AVALANCHE_TESTNET_FUJI?: string
  readonly VITE_RPC_SOLANA_DEVNET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// CSS Modules type declarations
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
