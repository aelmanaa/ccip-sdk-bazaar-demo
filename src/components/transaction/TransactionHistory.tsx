/**
 * Transaction History Drawer Component
 *
 * Slides from the right side of the screen.
 * Shows all stored transactions with their statuses.
 * Polls pending transactions for updates.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { TransactionHistoryItem } from './TransactionHistoryItem'
import { ClipboardIcon, HistoryIcon, XIcon } from '../ui/icons'
import styles from './TransactionHistory.module.css'

/**
 * Focus trap hook for modal/drawer accessibility
 */
function useFocusTrap(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus the first focusable element when opening
    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return containerRef
}

/**
 * Transaction history drawer component
 */
export function TransactionHistory() {
  const { transactions, pendingCount, isDrawerOpen, closeDrawer, removeTransaction, clearHistory } =
    useTransactionHistory()

  // Focus trap for accessibility
  const drawerRef = useFocusTrap(isDrawerOpen, closeDrawer)

  // Don't render if drawer is closed
  if (!isDrawerOpen) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div className={styles.backdrop} onClick={closeDrawer} aria-hidden="true" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Transaction History"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h2 className={styles.title}>Transaction History</h2>
            {pendingCount > 0 && (
              <span className={styles.pendingBadge}>{pendingCount} pending</span>
            )}
          </div>
          <button className={styles.closeButton} onClick={closeDrawer} aria-label="Close history">
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {transactions.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <ClipboardIcon size={48} />
              </span>
              <p className={styles.emptyText}>No transactions yet</p>
              <p className={styles.emptySubtext}>Your cross-chain transfers will appear here</p>
            </div>
          ) : (
            <div className={styles.list}>
              {transactions.map((tx) => (
                <TransactionHistoryItem
                  key={tx.messageId}
                  transaction={tx}
                  onRemove={removeTransaction}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {transactions.length > 0 && (
          <div className={styles.footer}>
            <button
              className={styles.clearButton}
              onClick={() => {
                if (window.confirm('Clear all transaction history?')) {
                  clearHistory()
                }
              }}
            >
              Clear History
            </button>
            <p className={styles.footerNote}>Stored locally in your browser</p>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * History button for the header
 */
export function HistoryButton() {
  const { pendingCount, openDrawer } = useTransactionHistory()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = useCallback(() => {
    openDrawer(buttonRef.current)
  }, [openDrawer])

  return (
    <button
      ref={buttonRef}
      className={styles.historyButton}
      onClick={handleClick}
      aria-label="Open transaction history"
    >
      <span className={styles.historyIcon}>
        <HistoryIcon size={16} />
      </span>
      <span className={styles.historyLabel}>History</span>
      {pendingCount > 0 && <span className={styles.historyBadge}>{pendingCount}</span>}
    </button>
  )
}
