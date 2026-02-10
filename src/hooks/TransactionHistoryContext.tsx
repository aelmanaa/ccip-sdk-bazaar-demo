/**
 * Transaction History Provider
 *
 * Provides centralized transaction history state management with:
 * - localStorage persistence
 * - Background polling for pending transactions
 * - Drawer visibility state
 *
 * CCIP SDK INTEGRATION: Uses chain.getMessageById() to poll status
 * of pending transactions in the background.
 *
 * SDK v0.96.0: Status fields are now available via message.metadata property.
 */

import { useCallback, useEffect, useState, useRef, type ReactNode } from 'react'
import { MessageStatus } from '@chainlink/ccip-sdk'
import { useChains } from './useChains'
import {
  TransactionHistoryContext,
  type TransactionHistoryContextValue,
} from './transactionHistoryTypes'
import {
  getStoredTransactions,
  addTransaction as addToStorage,
  updateTransactionStatus,
  getPendingTransactions,
  removeTransaction as removeFromStorage,
  clearAllTransactions,
  type TransactionStatus as TxStatus,
} from '../utils/localStorage'

/**
 * Polling interval for pending transactions (30 seconds)
 */
const POLLING_INTERVAL = 30_000

/**
 * Transaction History Provider Component
 *
 * Wraps the app and provides transaction history state to all children.
 * Handles background polling of pending transactions.
 */
export function TransactionHistoryProvider({ children }: { children: ReactNode }) {
  const { getChain } = useChains()
  const [transactions, setTransactions] = useState(getStoredTransactions())
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)

  // Load transactions from localStorage
  const refresh = useCallback(() => {
    const stored = getStoredTransactions()
    setTransactions(stored)
  }, [])

  // Poll pending transactions in the background
  const pollPendingTransactions = useCallback(async () => {
    const pending = getPendingTransactions()
    if (pending.length === 0) return

    for (const tx of pending) {
      try {
        const chain = getChain(tx.sourceNetwork)
        if (!chain) continue

        // SDK v0.96.0: Status fields available via metadata property
        const message = await chain.getMessageById(tx.messageId)
        const status = message.metadata?.status

        // Map SDK status to our status
        let newStatus: TxStatus = 'pending'
        let destTxHash: string | undefined

        if (status === MessageStatus.Success) {
          newStatus = 'success'
          destTxHash = message.metadata?.receiptTransactionHash
        } else if (status === MessageStatus.Failed) {
          newStatus = 'failed'
          destTxHash = message.metadata?.receiptTransactionHash
        }

        // Update if status changed
        if (newStatus !== 'pending') {
          updateTransactionStatus(tx.messageId, newStatus, destTxHash)
        }
      } catch (err) {
        // Ignore errors during background polling
        console.debug('Background polling error for', tx.messageId, err)
      }
    }

    // Refresh state after polling
    refresh()
  }, [getChain, refresh])

  // Set up polling interval
  useEffect(() => {
    // Initial poll
    pollPendingTransactions()

    // Set up interval
    pollingRef.current = setInterval(pollPendingTransactions, POLLING_INTERVAL)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [pollPendingTransactions])

  // Drawer controls with focus restoration
  const openDrawer = useCallback((triggerElement?: HTMLElement | null) => {
    if (triggerElement) {
      triggerElementRef.current = triggerElement
    }
    setIsDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    // Restore focus to the trigger element for accessibility
    if (triggerElementRef.current) {
      triggerElementRef.current.focus()
      triggerElementRef.current = null
    }
  }, [])

  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), [])

  // Add transaction
  const addTransaction = useCallback(
    (tx: {
      messageId: string
      txHash: string
      sourceNetwork: string
      destNetwork: string
      amount: string
      tokenSymbol: string
      receiver: string
      sender: string
    }) => {
      addToStorage({
        ...tx,
        status: 'pending',
      })
      refresh()
    },
    [refresh]
  )

  // Remove transaction
  const removeTransaction = useCallback(
    (messageId: string) => {
      removeFromStorage(messageId)
      refresh()
    },
    [refresh]
  )

  // Clear all history
  const clearHistory = useCallback(() => {
    clearAllTransactions()
    refresh()
  }, [refresh])

  // Calculate pending count
  const pendingCount = transactions.filter((t) => t.status === 'pending').length

  const value: TransactionHistoryContextValue = {
    transactions,
    pendingCount,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    addTransaction,
    removeTransaction,
    clearHistory,
    refresh,
  }

  return (
    <TransactionHistoryContext.Provider value={value}>
      {children}
    </TransactionHistoryContext.Provider>
  )
}
