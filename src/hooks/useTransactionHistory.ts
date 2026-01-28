/**
 * Transaction History Hook
 *
 * Hook to access the transaction history context.
 * Must be used within TransactionHistoryProvider.
 */

import { useContext } from 'react'
import {
  TransactionHistoryContext,
  type TransactionHistoryContextValue,
} from './transactionHistoryTypes'

/**
 * Hook to access transaction history context
 *
 * @example
 * const { transactions, pendingCount, openDrawer } = useTransactionHistory()
 *
 * return (
 *   <button onClick={openDrawer}>
 *     History ({pendingCount} pending)
 *   </button>
 * )
 */
export function useTransactionHistory(): TransactionHistoryContextValue {
  const context = useContext(TransactionHistoryContext)
  if (!context) {
    throw new Error('useTransactionHistory must be used within TransactionHistoryProvider')
  }
  return context
}
