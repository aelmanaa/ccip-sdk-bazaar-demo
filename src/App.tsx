/**
 * Root Application Component
 *
 * WALLET INTEGRATION: This component sets up all the providers needed
 * for wallet connectivity on both EVM and Solana chains.
 *
 * Provider hierarchy (order matters!):
 * 1. QueryClientProvider - React Query for async state management
 * 2. WagmiProvider - EVM wallet state (wagmi)
 * 3. RainbowKitProvider - EVM wallet UI (RainbowKit)
 * 4. SolanaWalletProvider - Solana wallet connectivity
 * 5. ChainProvider - CCIP SDK chain instances (our custom provider)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { useMemo } from 'react'

import { wagmiConfig, NETWORKS } from './config'
import { ChainProvider } from './hooks/ChainProvider'
import { TransactionHistoryProvider } from './hooks/TransactionHistoryContext'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { BridgeForm } from './components/bridge/BridgeForm'
import { TransactionHistory } from './components/transaction/TransactionHistory'

import styles from './App.module.css'

/**
 * React Query client for async state management
 *
 * Used by wagmi for caching blockchain data and
 * by our custom hooks for SDK operations.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus for blockchain data
      refetchOnWindowFocus: false,
      // Retry failed requests 3 times
      retry: 3,
      // Consider data stale after 30 seconds
      staleTime: 30_000,
    },
  },
})

/**
 * Solana RPC endpoint from our network config
 */
const SOLANA_RPC = NETWORKS['solana-devnet']?.rpcUrl ?? ''

export function App() {
  /**
   * Solana wallet adapters
   *
   * We support popular Solana wallets. Users with these wallets
   * installed will see them in the connection modal.
   *
   * Note: useMemo prevents recreating adapters on every render
   */
  const solanaWallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Add more wallets as needed:
      // new BackpackWalletAdapter(),
      // new LedgerWalletAdapter(),
    ],
    []
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* EVM Wallet Providers */}
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#0847F7', // Chainlink blue
            borderRadius: 'medium',
          })}
        >
          {/* Solana Wallet Providers */}
          <ConnectionProvider endpoint={SOLANA_RPC}>
            <SolanaWalletProvider wallets={solanaWallets} autoConnect>
              <WalletModalProvider>
                {/* CCIP SDK Chain Provider (our custom context) */}
                <ChainProvider>
                  {/* Transaction History Provider */}
                  <TransactionHistoryProvider>
                    <div className={styles.app}>
                      <Header />
                      <main className={styles.main}>
                        <div className={styles.container}>
                          <BridgeForm />
                        </div>
                      </main>
                      <Footer />
                      {/* Transaction History Drawer */}
                      <TransactionHistory />
                    </div>
                  </TransactionHistoryProvider>
                </ChainProvider>
              </WalletModalProvider>
            </SolanaWalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
