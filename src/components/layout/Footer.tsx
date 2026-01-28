/**
 * Footer Component
 *
 * Displays helpful links and credits.
 * Includes links to documentation, faucets, and the SDK.
 */

import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <nav className={styles.links} aria-label="Footer links">
          <a href="https://docs.chain.link/ccip" target="_blank" rel="noopener noreferrer">
            CCIP Docs
          </a>
          <span className={styles.divider} aria-hidden="true">
            |
          </span>
          <a href="https://faucets.chain.link/" target="_blank" rel="noopener noreferrer">
            Get Testnet Tokens
          </a>
          <span className={styles.divider} aria-hidden="true">
            |
          </span>
          <a href="https://ccip.chain.link/" target="_blank" rel="noopener noreferrer">
            CCIP Explorer
          </a>
          <span className={styles.divider} aria-hidden="true">
            |
          </span>
          <a
            href="https://github.com/smartcontractkit/ccip-tools-ts"
            target="_blank"
            rel="noopener noreferrer"
          >
            SDK GitHub
          </a>
        </nav>

        <p className={styles.credit}>
          Built with{' '}
          <a
            href="https://www.npmjs.com/package/@chainlink/ccip-sdk"
            target="_blank"
            rel="noopener noreferrer"
          >
            @chainlink/ccip-sdk
          </a>
        </p>
      </div>
    </footer>
  )
}
