/**
 * LocalStorage Utilities
 *
 * Type-safe localStorage helpers for persisting transaction history.
 * Handles JSON serialization, schema versioning, and error recovery.
 */

/**
 * Storage key prefix to namespace our data
 */
const STORAGE_PREFIX = 'ccip-bridge:'

/**
 * Current storage schema version (increment when schema changes)
 */
const SCHEMA_VERSION = 1

/**
 * Maximum number of transactions to store
 */
const MAX_TRANSACTIONS = 50

/**
 * Transaction status enum
 */
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'timeout'

/**
 * Stored transaction record
 */
export interface StoredTransaction {
  /** Unique message ID from CCIP */
  messageId: string
  /** Source chain transaction hash */
  txHash: string
  /** Destination chain transaction hash (if completed) */
  destTxHash?: string
  /** Source network key */
  sourceNetwork: string
  /** Destination network key */
  destNetwork: string
  /** Token amount transferred */
  amount: string
  /** Token symbol */
  tokenSymbol: string
  /** Receiver address on destination */
  receiver: string
  /** Sender address on source */
  sender: string
  /** Transaction status */
  status: TransactionStatus
  /** Timestamp when transaction was initiated */
  timestamp: number
  /** Last time status was checked */
  lastChecked: number
}

/**
 * Storage structure with versioning
 */
interface StorageData {
  version: number
  transactions: StoredTransaction[]
}

/**
 * Get full storage key
 */
function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`
}

/**
 * Safe JSON parse with fallback
 */
function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = `${STORAGE_PREFIX}test`
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Get all stored transactions
 */
export function getStoredTransactions(): StoredTransaction[] {
  if (!isLocalStorageAvailable()) return []

  const key = getStorageKey('transactions')
  const raw = localStorage.getItem(key)
  const data = safeParse<StorageData>(raw, { version: 0, transactions: [] })

  // Handle schema migration if needed
  if (data.version !== SCHEMA_VERSION) {
    // For now, just return empty array on version mismatch
    // In production, you'd implement migrations
    return []
  }

  return data.transactions
}

/**
 * Save transactions to localStorage
 */
function saveTransactions(transactions: StoredTransaction[]): void {
  if (!isLocalStorageAvailable()) return

  const key = getStorageKey('transactions')
  const data: StorageData = {
    version: SCHEMA_VERSION,
    transactions: transactions.slice(0, MAX_TRANSACTIONS),
  }

  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Storage quota exceeded - remove oldest transactions
    console.warn('LocalStorage quota exceeded, removing old transactions')
    data.transactions = transactions.slice(0, Math.floor(MAX_TRANSACTIONS / 2))
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      // Give up if still failing
      console.error('Failed to save transactions to localStorage')
    }
  }
}

/**
 * Add a new transaction to history
 */
export function addTransaction(
  transaction: Omit<StoredTransaction, 'timestamp' | 'lastChecked'>
): void {
  const transactions = getStoredTransactions()

  // Check if transaction already exists (by messageId)
  const existingIndex = transactions.findIndex((t) => t.messageId === transaction.messageId)
  if (existingIndex !== -1) {
    // Update existing transaction
    const existing = transactions[existingIndex]!
    transactions[existingIndex] = {
      ...existing,
      ...transaction,
      lastChecked: Date.now(),
    }
  } else {
    // Add new transaction at the beginning
    const newTx: StoredTransaction = {
      ...transaction,
      timestamp: Date.now(),
      lastChecked: Date.now(),
    }
    transactions.unshift(newTx)
  }

  saveTransactions(transactions)
}

/**
 * Update a transaction's status
 */
export function updateTransactionStatus(
  messageId: string,
  status: TransactionStatus,
  destTxHash?: string
): void {
  const transactions = getStoredTransactions()
  const index = transactions.findIndex((t) => t.messageId === messageId)

  if (index !== -1) {
    const existing = transactions[index]!
    transactions[index] = {
      ...existing,
      status,
      destTxHash: destTxHash ?? existing.destTxHash,
      lastChecked: Date.now(),
    }
    saveTransactions(transactions)
  }
}

/**
 * Get a single transaction by message ID
 */
export function getTransaction(messageId: string): StoredTransaction | undefined {
  const transactions = getStoredTransactions()
  return transactions.find((t) => t.messageId === messageId)
}

/**
 * Get transactions that are still pending (need status polling)
 */
export function getPendingTransactions(): StoredTransaction[] {
  const transactions = getStoredTransactions()
  return transactions.filter((t) => t.status === 'pending')
}

/**
 * Remove a transaction from history
 */
export function removeTransaction(messageId: string): void {
  const transactions = getStoredTransactions()
  const filtered = transactions.filter((t) => t.messageId !== messageId)
  saveTransactions(filtered)
}

/**
 * Clear all transactions
 */
export function clearAllTransactions(): void {
  if (!isLocalStorageAvailable()) return
  const key = getStorageKey('transactions')
  localStorage.removeItem(key)
}

/**
 * Get count of pending transactions
 */
export function getPendingCount(): number {
  return getPendingTransactions().length
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}
