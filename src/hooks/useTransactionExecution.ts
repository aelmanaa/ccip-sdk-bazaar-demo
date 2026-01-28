/**
 * useTransactionExecution Hook
 *
 * Handles the execution of CCIP cross-chain transfers.
 * Supports both EVM and Solana chains with appropriate wallet handling.
 *
 * EDUCATIONAL NOTE: This hook demonstrates how to:
 * - Use generateUnsignedSendMessage() for browser wallet compatibility
 * - Handle approval + send flow for EVM
 * - Build versioned transactions for Solana
 * - Parse and handle CCIP-specific errors
 */

import { useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { EVMChain, SolanaChain } from '@chainlink/ccip-sdk'

import { type NetworkConfig, type CCIPMessage } from '../config'
import { isEVMChain, isSolanaChain } from './chainUtils'
import { parseEVMError, parseSolanaError } from '../utils/ccipErrors'

/**
 * Helper to convert SDK transaction fields to viem hex types.
 * SDK returns AddressLike | string | null | undefined, viem requires `0x${string}`.
 */
type HexString = `0x${string}`
function toHex(value: unknown): HexString {
  return String(value) as HexString
}

/** Transaction execution result */
export interface TransactionResult {
  messageId: string | undefined
  txHash: string
}

/** Transaction state callback types */
export type TransactionStateCallback = (
  state: 'approving' | 'sending' | 'confirming' | 'tracking'
) => void

/** Parameters for the useTransactionExecution hook */
export interface UseTransactionExecutionParams {
  /** Callback to update transaction state */
  onStateChange: TransactionStateCallback
  /** Callback when transaction hash is available */
  onTxHash: (hash: string) => void
  /** Callback when message ID is available */
  onMessageId: (id: string) => void
}

/** Return type for the useTransactionExecution hook */
export interface UseTransactionExecutionReturn {
  /** Execute an EVM transfer */
  executeEVMTransfer: (
    chain: EVMChain,
    router: string,
    destConfig: NetworkConfig,
    message: CCIPMessage,
    fee: bigint
  ) => Promise<TransactionResult>
  /** Execute a Solana transfer */
  executeSolanaTransfer: (
    chain: SolanaChain,
    router: string,
    destConfig: NetworkConfig,
    message: CCIPMessage,
    fee: bigint
  ) => Promise<TransactionResult>
  /** Execute a transfer (auto-detects chain type) */
  executeTransfer: (
    chain: EVMChain | SolanaChain,
    router: string,
    destConfig: NetworkConfig,
    message: CCIPMessage,
    fee: bigint
  ) => Promise<TransactionResult>
}

/**
 * Hook for executing CCIP cross-chain transfers
 */
export function useTransactionExecution({
  onStateChange,
  onTxHash,
  onMessageId,
}: UseTransactionExecutionParams): UseTransactionExecutionReturn {
  // EVM wallet (wagmi)
  const { address: evmAddress } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  // Solana wallet
  const { publicKey: solanaPublicKey, sendTransaction } = useWallet()
  const { connection: solanaConnection } = useConnection()

  /**
   * EVM Transfer Flow
   *
   * 1. Generate unsigned transactions (may include approve + send)
   * 2. Sign each with connected wallet
   * 3. Wait for confirmations
   * 4. Extract message ID for tracking
   */
  const executeEVMTransfer = useCallback(
    async (
      chain: EVMChain,
      router: string,
      destConfig: NetworkConfig,
      message: CCIPMessage,
      fee: bigint
    ): Promise<TransactionResult> => {
      if (!walletClient || !publicClient || !evmAddress) {
        throw new Error('EVM wallet not connected')
      }

      /**
       * CCIP SDK: generateUnsignedSendMessage()
       *
       * Generates unsigned transactions for the transfer.
       * For token transfers, this typically returns:
       * 1. Approve transaction (if allowance insufficient)
       * 2. ccipSend transaction
       *
       * We sign these with the connected wallet (MetaMask, etc.)
       */
      const unsignedTx = await chain.generateUnsignedSendMessage({
        sender: evmAddress,
        router,
        destChainSelector: destConfig.chainSelector,
        message: { ...message, fee },
      })

      const transactions = unsignedTx.transactions

      // Process approval transactions (all except last)
      const approvalTxs = transactions.slice(0, -1)
      for (const tx of approvalTxs) {
        onStateChange('approving')
        const hash = await walletClient.sendTransaction({
          to: toHex(tx.to),
          data: toHex(tx.data),
          account: evmAddress,
        })
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
      }

      // Send the main ccipSend transaction (always last)
      onStateChange('sending')
      const sendTx = transactions[transactions.length - 1]!

      /**
       * EDUCATIONAL: Pre-flight simulation to catch CCIP errors BEFORE sending
       *
       * This simulation will revert with the actual error data if there's an issue
       * (e.g., ChainNotAllowed, RateLimitReached). This is more reliable than
       * simulating after the transaction fails because:
       * 1. We get the revert data directly, not from historical state
       * 2. User doesn't waste gas on a transaction that will fail
       */
      try {
        await publicClient.call({
          to: toHex(sendTx.to),
          data: toHex(sendTx.data),
          value: fee,
          account: evmAddress,
        })
      } catch (simError: unknown) {
        console.error('Pre-flight simulation failed:', simError)

        const parsedError = parseEVMError(simError)
        if (parsedError) {
          console.error('Parsed CCIP error (pre-flight):', parsedError)
          throw new Error(parsedError.userMessage)
        }
        // Re-throw if we couldn't parse a specific CCIP error
        throw simError
      }

      const sendHash = await walletClient.sendTransaction({
        to: toHex(sendTx.to),
        data: toHex(sendTx.data),
        value: fee, // Pay fee in native token
        account: evmAddress,
      })

      onTxHash(sendHash)
      onStateChange('confirming')

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: sendHash,
        confirmations: 1,
      })

      if (receipt.status === 'reverted') {
        // Try to get more details about why the transaction reverted by re-simulating
        let revertReason = 'Transaction reverted'
        try {
          // Simulate the failed transaction at the block it failed to get revert data
          await publicClient.call({
            to: toHex(sendTx.to),
            data: toHex(sendTx.data),
            value: fee,
            account: evmAddress,
            blockNumber: receipt.blockNumber,
          })
        } catch (simError: unknown) {
          /**
           * CCIP SDK: EVMChain.parse() for error decoding
           *
           * EDUCATIONAL: The SDK includes all CCIP contract ABIs and can decode
           * error selectors (4-byte hex) into human-readable error names.
           * See src/utils/ccipErrors.ts for the full implementation.
           */
          console.error('Transaction revert details:', simError)

          const parsedError = parseEVMError(simError)
          if (parsedError) {
            console.error('Parsed CCIP error:', parsedError)
            revertReason = parsedError.userMessage
          } else {
            // Fall back to raw error message
            const simMessage = simError instanceof Error ? simError.message : String(simError)
            if (simMessage && simMessage !== 'Transaction reverted') {
              revertReason = `Transaction reverted: ${simMessage.slice(0, 300)}`
            }
          }
        }
        throw new Error(revertReason)
      }

      // Extract message ID
      onStateChange('tracking')
      const messages = await chain.getMessagesInTx(sendHash)
      const msgId = messages[0]?.message.messageId
      if (msgId) {
        onMessageId(msgId)
      }

      return { messageId: msgId, txHash: sendHash }
    },
    [walletClient, publicClient, evmAddress, onStateChange, onTxHash, onMessageId]
  )

  /**
   * Solana Transfer Flow
   *
   * 1. Generate unsigned instructions
   * 2. Build versioned transaction with compute budget
   * 3. Sign and send with wallet adapter
   * 4. Confirm and extract message ID
   */
  const executeSolanaTransfer = useCallback(
    async (
      chain: SolanaChain,
      router: string,
      destConfig: NetworkConfig,
      message: CCIPMessage,
      fee: bigint
    ): Promise<TransactionResult> => {
      if (!solanaPublicKey || !sendTransaction) {
        throw new Error('Solana wallet not connected')
      }

      try {
        /**
         * CCIP SDK: generateUnsignedSendMessage() for Solana
         *
         * Returns instructions and lookup tables for building
         * a versioned transaction.
         */
        const unsignedTx = await chain.generateUnsignedSendMessage({
          sender: solanaPublicKey.toBase58(),
          router,
          destChainSelector: destConfig.chainSelector,
          message: { ...message, fee },
        })

        onStateChange('sending')

        // Build versioned transaction
        // Note: We don't add ComputeBudgetProgram instruction - Phantom wallet
        // automatically adds compute budget and priority fees when not specified.
        // See: https://docs.phantom.com/developer-powertools/solana-priority-fees
        const blockhash = await solanaConnection.getLatestBlockhash('finalized')
        const messageV0 = new TransactionMessage({
          payerKey: solanaPublicKey,
          recentBlockhash: blockhash.blockhash,
          instructions: unsignedTx.instructions,
        }).compileToV0Message(unsignedTx.lookupTables)

        const transaction = new VersionedTransaction(messageV0)

        // Sign and send in one step using wallet adapter (aligns with explorer)
        const signature = await sendTransaction(transaction, solanaConnection)
        onTxHash(signature)

        onStateChange('confirming')

        // Confirm transaction
        await solanaConnection.confirmTransaction({ signature, ...blockhash }, 'confirmed')

        // Extract message ID
        onStateChange('tracking')
        const tx = await chain.getTransaction(signature)
        const messages = await chain.getMessagesInTx(tx)
        const msgId = messages[0]?.message.messageId
        if (msgId) {
          onMessageId(msgId)
        }

        return { messageId: msgId, txHash: signature }
      } catch (err: unknown) {
        /**
         * CCIP SDK: SolanaChain.parse() for error decoding
         *
         * EDUCATIONAL: Solana errors are different from EVM - they come from
         * transaction logs rather than error selectors. The SDK parses these
         * logs to extract meaningful error information.
         * See src/utils/ccipErrors.ts for the full implementation.
         */
        console.error('Solana transaction error:', err)

        const parsedError = parseSolanaError(err)
        if (parsedError) {
          console.error('Parsed Solana CCIP error:', parsedError)
          throw new Error(parsedError.userMessage)
        }

        // Re-throw original error if not parseable
        throw err
      }
    },
    [solanaPublicKey, sendTransaction, solanaConnection, onStateChange, onTxHash, onMessageId]
  )

  /**
   * Execute transfer - auto-detects chain type
   */
  const executeTransfer = useCallback(
    async (
      chain: EVMChain | SolanaChain,
      router: string,
      destConfig: NetworkConfig,
      message: CCIPMessage,
      fee: bigint
    ): Promise<TransactionResult> => {
      if (isEVMChain(chain)) {
        return executeEVMTransfer(chain, router, destConfig, message, fee)
      } else if (isSolanaChain(chain)) {
        return executeSolanaTransfer(chain, router, destConfig, message, fee)
      }
      throw new Error('Unsupported chain type')
    },
    [executeEVMTransfer, executeSolanaTransfer]
  )

  return {
    executeEVMTransfer,
    executeSolanaTransfer,
    executeTransfer,
  }
}
