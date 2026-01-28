/**
 * Header Component
 *
 * Displays the app logo, wallet connection buttons, and history button.
 * Shows EVM wallet (RainbowKit) and Solana wallet (adapter) buttons.
 */

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useAccount } from 'wagmi'
import { HistoryButton } from '../transaction/TransactionHistory'
import styles from './Header.module.css'

export function Header() {
  const { chain: evmChain, isConnected: evmConnected } = useAccount()

  return (
    <header className={styles.header}>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="visually-hidden focusable">
        Skip to main content
      </a>
      <div className={styles.container}>
        {/* Logo and Title */}
        <div className={styles.brand}>
          <img
            src="/chainlink-logo.svg"
            alt="Chainlink"
            className={styles.logo}
            width={32}
            height={32}
          />
          <div className={styles.title}>
            <h1 className={styles.name}>CCIP Bridge</h1>
            <span className={styles.tagline}>Cross-Chain Token Transfer</span>
          </div>
        </div>

        {/* Wallet Buttons and History */}
        <div className={styles.wallets}>
          {/* EVM Wallet (MetaMask, etc.) */}
          <div className={styles.walletGroup}>
            <span className={styles.walletLabel}>EVM</span>
            {evmConnected && evmChain && <span className={styles.chainBadge}>{evmChain.name}</span>}
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>

          {/* Solana Wallet (Phantom, etc.) */}
          <div className={styles.walletGroup}>
            <span className={styles.walletLabel}>Solana</span>
            <WalletMultiButton />
          </div>

          {/* Transaction History Button */}
          <HistoryButton />
        </div>
      </div>
    </header>
  )
}
