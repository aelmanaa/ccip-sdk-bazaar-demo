/**
 * Transaction History Types and Context
 *
 * Shared types and context definition for transaction history.
 * Separated to allow proper fast-refresh in development.
 */

import { createContext } from 'react'
import type { StoredTransaction } from '../utils/localStorage'

/**
 * Context value shape
 */
export interface TransactionHistoryContextValue {
  /** All stored transactions */
  transactions: StoredTransaction[]
  /** Number of pending transactions */
  pendingCount: number
  /** Whether the history drawer is open */
  isDrawerOpen: boolean
  /** Open the history drawer with optional trigger element for focus restoration */
  openDrawer: (triggerElement?: HTMLElement | null) => void
  /** Close the history drawer (restores focus to trigger) */
  closeDrawer: () => void
  /** Toggle the history drawer */
  toggleDrawer: () => void
  /** Add a new transaction to history */
  addTransaction: (tx: {
    messageId: string
    txHash: string
    sourceNetwork: string
    destNetwork: string
    amount: string
    tokenSymbol: string
    receiver: string
    sender: string
  }) => void
  /** Remove a transaction from history */
  removeTransaction: (messageId: string) => void
  /** Clear all transaction history */
  clearHistory: () => void
  /** Refresh transactions from localStorage */
  refresh: () => void
}

/**
 * Context with default values
 */
export const TransactionHistoryContext = createContext<TransactionHistoryContextValue>({
  transactions: [],
  pendingCount: 0,
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
  addTransaction: () => {},
  removeTransaction: () => {},
  clearHistory: () => {},
  refresh: () => {},
})
