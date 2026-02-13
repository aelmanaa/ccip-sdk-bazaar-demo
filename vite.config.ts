/**
 * Vite Configuration for CCIP SDK Demo
 *
 * Key configurations:
 * 1. Node polyfills - See detailed breakdown below
 * 2. Codespaces compatibility - Host binding and HMR settings
 * 3. Chunk splitting - Optimized loading for wallet and SDK libraries
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    /**
     * Node.js Polyfills for Browser Compatibility
     *
     * IMPORTANT: Different libraries require different polyfills.
     * This demo uses both CCIP SDK and wallet libraries, each with distinct needs.
     *
     * ┌─────────────────────────────────────────────────────────────────────────┐
     * │ Polyfill │ Required By                  │ NOT Required By              │
     * ├─────────────────────────────────────────────────────────────────────────┤
     * │ buffer   │ @chainlink/ccip-sdk          │                              │
     * │          │ (Solana, TON, Sui chains)    │                              │
     * ├─────────────────────────────────────────────────────────────────────────┤
     * │ crypto   │ @metamask/sdk (uuid)         │ @chainlink/ccip-sdk          │
     * │ stream   │ @metamask/sdk (is-stream)    │ @chainlink/ccip-sdk          │
     * │ process  │ @metamask/sdk, @walletconnect│ @chainlink/ccip-sdk          │
     * │ util     │ @solana/wallet-adapter       │ @chainlink/ccip-sdk          │
     * └─────────────────────────────────────────────────────────────────────────┘
     *
     * If you're ONLY using @chainlink/ccip-sdk (no wallet UI):
     *   include: ['buffer']
     *   globals: { Buffer: true }
     *
     * This demo includes wallet libraries (RainbowKit, Solana Wallet Adapter),
     * so we need the full set of polyfills below.
     */
    nodePolyfills({
      // 'buffer' = CCIP SDK requirement (for Solana/TON/Sui chains)
      // 'crypto', 'stream', 'util', 'process' = Wallet library requirements (NOT SDK)
      include: ['buffer', 'crypto', 'stream', 'util', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],

  /**
   * CRITICAL for GitHub Codespaces
   *
   * - host: '0.0.0.0' binds to all network interfaces, allowing Codespaces
   *   to forward the port through their proxy
   * - hmr.clientPort: 443 is needed because Codespaces proxies through HTTPS
   */
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    hmr: {
      clientPort: 443,
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
  },

  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        /**
         * Chunk splitting for optimal loading
         *
         * Separating vendors allows browsers to cache these independently.
         * Users who visit multiple times won't re-download unchanged libraries.
         */
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-solana': [
            '@solana/web3.js',
            '@solana/wallet-adapter-react',
            '@solana/wallet-adapter-base',
          ],
          'vendor-evm': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
          'vendor-ccip': ['@chainlink/ccip-sdk'],
        },
      },
    },
  },

  define: {
    global: 'globalThis',
    'process.env': {},
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
