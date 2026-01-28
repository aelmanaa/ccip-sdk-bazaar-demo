/**
 * Vite Configuration for CCIP SDK Demo
 *
 * Key configurations:
 * 1. Node polyfills - Required for Solana and crypto libraries in browser
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
     * CRITICAL: Node.js polyfills for browser compatibility
     *
     * The CCIP SDK and wallet libraries use Node.js built-ins that don't exist
     * in browsers. This plugin provides browser-compatible implementations.
     *
     * Required for:
     * - @solana/web3.js (Buffer, crypto)
     * - @chainlink/ccip-sdk (stream, util)
     * - Various crypto operations
     */
    nodePolyfills({
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
