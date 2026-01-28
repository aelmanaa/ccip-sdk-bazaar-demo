/**
 * Copyable Address Component
 *
 * Displays a truncated address with:
 * - Copy to clipboard button
 * - Hover tooltip showing full address
 * - Visual feedback on copy
 */

import { useState, useCallback } from 'react'
import { truncateAddress } from '../../utils/validation'
import styles from './CopyableAddress.module.css'

interface CopyableAddressProps {
  /** Full address to display */
  address: string
  /** Number of characters to show at start (default: 6) */
  startChars?: number
  /** Number of characters to show at end (default: 4) */
  endChars?: number
  /** Optional label for the address */
  label?: string
  /** Whether to show as inline or block */
  inline?: boolean
}

export function CopyableAddress({
  address,
  startChars = 6,
  endChars = 4,
  label,
  inline = false,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [address])

  const truncated = truncateAddress(address, startChars, endChars)

  return (
    <div
      className={`${styles.container} ${inline ? styles.inline : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {label && <span className={styles.label}>{label}</span>}

      <div className={styles.addressWrapper}>
        <code className={styles.address} title={address}>
          {truncated}
        </code>

        <button
          className={styles.copyButton}
          onClick={handleCopy}
          aria-label="Copy address"
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {/* Tooltip showing full address */}
        {showTooltip && (
          <div className={styles.tooltip}>
            <code>{address}</code>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * List of copyable addresses (for remote pools array)
 */
export function CopyableAddressList({
  addresses,
  startChars = 6,
  endChars = 4,
  label,
}: {
  addresses: string[]
  startChars?: number
  endChars?: number
  label?: string
}) {
  if (addresses.length === 0) return null

  return (
    <div className={styles.listContainer}>
      {label && <span className={styles.listLabel}>{label}</span>}
      <div className={styles.addressList}>
        {addresses.map((address, index) => (
          <CopyableAddress
            key={`${address}-${index}`}
            address={address}
            startChars={startChars}
            endChars={endChars}
            inline
          />
        ))}
      </div>
    </div>
  )
}
