/**
 * Bridge Form Component
 *
 * The main interface for cross-chain token transfers.
 * This component orchestrates all the bridge functionality:
 *
 * 1. Network selection (source & destination)
 * 2. Amount input
 * 3. Destination address input
 * 4. Fee estimation display
 * 5. Transaction submission
 * 6. Status tracking
 *
 * EDUCATIONAL NOTE: This component demonstrates how to integrate
 * the CCIP SDK with a React frontend. Key patterns:
 * - Lazy wallet connection (only when source chain selected)
 * - Using generateUnsignedSendMessage for browser wallets
 * - Polling message status until finality
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'

import {
  NETWORKS,
  CCIP_BNM,
  getTokenAddress,
  getRouterAddress,
  parseTokenAmount,
  NETWORK_TO_CHAIN_ID,
  buildCCIPMessage,
  type CCIPMessage,
} from '../../config'
import { useChains } from '../../hooks/useChains'
import { useFeeEstimate } from '../../hooks/useFeeEstimate'
import { useLaneLatency } from '../../hooks/useLaneLatency'
import { useTokenBalance } from '../../hooks/useTokenBalance'
import { useMessageStatus, type MessageState } from '../../hooks/useMessageStatus'
import { useTransactionExecution } from '../../hooks/useTransactionExecution'
import { categorizeError, type CategorizedError } from '../../utils/errors'

import { TransactionStatus } from '../transaction/TransactionStatus'
import { ErrorMessage } from '../ui/ErrorMessage'
import { XIcon } from '../ui/icons'
import { useTokenPoolInfo } from '../../hooks/useTokenPoolInfo'
import { useDestinationBalance } from '../../hooks/useDestinationBalance'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { useTokenMetadata } from '../../hooks/useTokenMetadata'

import {
  NetworkSelectionSection,
  WalletBalanceSection,
  TransferInputsSection,
  LaneInfoSection,
  FeeDisplaySection,
  SubmitButtonSection,
} from './sections'

import styles from './BridgeForm.module.css'

/** Transaction flow states */
type BridgeState =
  | 'idle'
  | 'approving'
  | 'sending'
  | 'confirming'
  | 'tracking'
  | 'success'
  | 'error'

export function BridgeForm() {
  // Network selection
  const [sourceNetwork, setSourceNetwork] = useState<string>('')
  const [destNetwork, setDestNetwork] = useState<string>('')

  // Form inputs
  const [amount, setAmount] = useState<string>('')
  const [destAddress, setDestAddress] = useState<string>('')

  // Transaction state
  const [bridgeState, setBridgeState] = useState<BridgeState>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [messageId, setMessageId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [categorizedErr, setCategorizedErr] = useState<CategorizedError | null>(null)

  // Initial balances for transfer tracking
  const [initialSourceBalance, setInitialSourceBalance] = useState<bigint | undefined>(undefined)
  const [initialDestBalance, setInitialDestBalance] = useState<bigint | undefined>(undefined)

  // SDK chains
  const { getChain, isLoading: chainsLoading, isEVM, isSolana } = useChains()

  // EVM wallet (wagmi)
  const { address: evmAddress, isConnected: evmConnected, chain: evmChain } = useAccount()
  const { switchChain } = useSwitchChain()

  // Solana wallet
  const { publicKey: solanaPublicKey, connected: solanaConnected } = useWallet()

  // Network configs
  const sourceConfig = NETWORKS[sourceNetwork]
  const destConfig = NETWORKS[destNetwork]

  // Get user's address based on source chain type
  const senderAddress = useMemo(() => {
    if (!sourceNetwork) return undefined
    if (isEVM(sourceNetwork)) return evmAddress
    if (isSolana(sourceNetwork)) return solanaPublicKey?.toBase58()
    return undefined
  }, [sourceNetwork, isEVM, isSolana, evmAddress, solanaPublicKey])

  // Get connected address for display
  const connectedAddress = useMemo(() => {
    if (isEVM(sourceNetwork)) return evmAddress
    if (isSolana(sourceNetwork)) return solanaPublicKey?.toBase58()
    return undefined
  }, [sourceNetwork, isEVM, isSolana, evmAddress, solanaPublicKey])

  // Track previous wallet addresses for account change detection
  const prevEvmAddressRef = useRef(evmAddress)
  const prevSolanaAddressRef = useRef(solanaPublicKey?.toBase58())

  // Token addresses
  const sourceTokenAddress = sourceNetwork ? getTokenAddress(CCIP_BNM, sourceNetwork) : undefined

  // Token metadata (get actual decimals instead of hardcoding)
  const { metadata: tokenMetadata } = useTokenMetadata(sourceNetwork, sourceTokenAddress)
  const tokenDecimals = tokenMetadata?.decimals ?? (sourceConfig?.type === 'solana' ? 9 : 18)

  // Balances
  const {
    nativeFormatted,
    tokenFormatted,
    tokenBalance,
    isLoading: balanceLoading,
    refetch: refetchBalances,
  } = useTokenBalance(sourceNetwork, senderAddress, sourceTokenAddress, tokenDecimals)

  // Parse amount for SDK
  const parsedAmount = useMemo(() => {
    if (!amount || !sourceConfig) return 0n
    try {
      return parseTokenAmount(amount, tokenDecimals)
    } catch {
      return 0n
    }
  }, [amount, sourceConfig, tokenDecimals])

  // Destination address (auto-fill based on connected wallets)
  const effectiveDestAddress = useMemo(() => {
    if (destAddress) return destAddress

    // EVM → EVM: use connected EVM wallet
    if (isEVM(sourceNetwork) && isEVM(destNetwork) && evmAddress) {
      return evmAddress
    }
    // EVM → Solana: use connected Solana wallet
    if (isEVM(sourceNetwork) && isSolana(destNetwork) && solanaPublicKey) {
      return solanaPublicKey.toBase58()
    }
    // Solana → EVM: use connected EVM wallet
    if (isSolana(sourceNetwork) && isEVM(destNetwork) && evmAddress) {
      return evmAddress
    }
    // Solana → Solana: use connected Solana wallet
    if (isSolana(sourceNetwork) && isSolana(destNetwork) && solanaPublicKey) {
      return solanaPublicKey.toBase58()
    }

    return ''
  }, [destAddress, sourceNetwork, destNetwork, isEVM, isSolana, evmAddress, solanaPublicKey])

  // Build CCIP message once - reused for fee estimation and sending
  const ccipMessage: CCIPMessage | null = useMemo(() => {
    if (!effectiveDestAddress || !sourceTokenAddress || parsedAmount <= 0n) {
      return null
    }
    return buildCCIPMessage({
      receiver: effectiveDestAddress,
      tokenAddress: sourceTokenAddress,
      amount: parsedAmount,
    })
  }, [effectiveDestAddress, sourceTokenAddress, parsedAmount])

  // Fee estimation (uses the same message that will be sent)
  const {
    fee,
    feeFormatted,
    isLoading: feeLoading,
  } = useFeeEstimate({
    sourceNetwork,
    destNetwork,
    message: ccipMessage,
  })

  // Lane latency
  const { latencyFormatted } = useLaneLatency(sourceNetwork, destNetwork)

  // Token pool info for lane validation
  const { isLaneSupported } = useTokenPoolInfo(sourceNetwork, destNetwork, sourceTokenAddress)

  // Destination balance (uses remote token from pool info)
  const { balance: destBalance, refetch: refetchDestBalance } = useDestinationBalance(
    sourceNetwork,
    destNetwork,
    sourceTokenAddress,
    effectiveDestAddress,
    tokenDecimals
  )

  // Transaction history
  const { addTransaction } = useTransactionHistory()

  // Transaction execution hook
  const { executeTransfer } = useTransactionExecution({
    onStateChange: setBridgeState,
    onTxHash: setTxHash,
    onMessageId: setMessageId,
  })

  // Message status tracking
  const {
    state: messageState,
    detailedStatus,
    description: statusDescription,
    destTxHash,
    isFinal,
    isTimedOut,
    elapsedTime,
  } = useMessageStatus(sourceNetwork, messageId)

  // Update bridge state based on message state
  const handleMessageStateChange = useCallback(
    (state: MessageState) => {
      if (state === 'SUCCESS') {
        setBridgeState('success')
        // Refresh both source and destination balances after successful transfer
        refetchBalances()
        refetchDestBalance()
      } else if (state === 'FAILED') {
        setBridgeState('error')
        setErrorMessage('Transfer failed on destination chain')
      }
    },
    [refetchBalances, refetchDestBalance]
  )

  // Watch message state changes - use useEffect for side effects, not useMemo
  useEffect(() => {
    if (messageState !== 'UNKNOWN') {
      handleMessageStateChange(messageState)
    }
  }, [messageState, handleMessageStateChange])

  // Account change detection - refetch balances when wallet address changes
  useEffect(() => {
    const currentSolanaAddress = solanaPublicKey?.toBase58()

    if (
      evmAddress !== prevEvmAddressRef.current ||
      currentSolanaAddress !== prevSolanaAddressRef.current
    ) {
      prevEvmAddressRef.current = evmAddress
      prevSolanaAddressRef.current = currentSolanaAddress
      // Trigger balance refetch on account change
      refetchBalances()
      refetchDestBalance()
    }
  }, [evmAddress, solanaPublicKey, refetchBalances, refetchDestBalance])

  // Wallet disconnect monitoring during transaction
  useEffect(() => {
    const isTransactionInProgress =
      bridgeState !== 'idle' && bridgeState !== 'success' && bridgeState !== 'error'

    if (isTransactionInProgress) {
      const walletDisconnected =
        (isEVM(sourceNetwork) && !evmConnected) || (isSolana(sourceNetwork) && !solanaConnected)

      if (walletDisconnected) {
        setBridgeState('error')
        setCategorizedErr({
          category: 'WALLET_REJECTION',
          message: 'Wallet disconnected during transaction',
          recovery: 'Please reconnect your wallet and try again',
          severity: 'error',
          recoverable: true,
        })
      }
    }
  }, [bridgeState, sourceNetwork, evmConnected, solanaConnected, isEVM, isSolana])

  // Check if wallet is connected for source chain
  const isWalletConnected = useMemo(() => {
    if (!sourceNetwork) return false
    if (isEVM(sourceNetwork)) return evmConnected
    if (isSolana(sourceNetwork)) return solanaConnected
    return false
  }, [sourceNetwork, isEVM, isSolana, evmConnected, solanaConnected])

  // Check if on correct network (EVM only)
  const isCorrectNetwork = useMemo(() => {
    if (!sourceNetwork || !isEVM(sourceNetwork)) return true
    const expectedChainId = NETWORK_TO_CHAIN_ID[sourceNetwork]
    return evmChain?.id === expectedChainId
  }, [sourceNetwork, isEVM, evmChain])

  // Form validation (includes lane support check)
  const canSubmit = useMemo(() => {
    return Boolean(
      sourceNetwork &&
      destNetwork &&
      effectiveDestAddress &&
      parsedAmount > 0n &&
      fee !== null &&
      isWalletConnected &&
      isCorrectNetwork &&
      bridgeState === 'idle' &&
      isLaneSupported // Lane must be supported for this token
    )
  }, [
    sourceNetwork,
    destNetwork,
    effectiveDestAddress,
    parsedAmount,
    fee,
    isWalletConnected,
    isCorrectNetwork,
    bridgeState,
    isLaneSupported,
  ])

  /**
   * Handle network switch (EVM only)
   */
  const handleSwitchNetwork = useCallback(() => {
    if (!sourceNetwork) return
    const chainId = NETWORK_TO_CHAIN_ID[sourceNetwork]
    if (chainId) {
      switchChain({ chainId })
    }
  }, [sourceNetwork, switchChain])

  /**
   * Handle bridge submission
   *
   * CCIP SDK INTEGRATION: This is the main transfer flow.
   * Uses the useTransactionExecution hook for wallet handling.
   * The same ccipMessage used for fee estimation is reused here.
   */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !senderAddress || !ccipMessage || !fee) return

    const chain = getChain(sourceNetwork)
    const router = getRouterAddress(sourceNetwork)
    if (!chain || !router || !destConfig) return

    // Capture initial balances before transfer
    setInitialSourceBalance(tokenBalance ?? undefined)
    setInitialDestBalance(destBalance ?? undefined)

    setBridgeState('approving')
    setErrorMessage('')
    setCategorizedErr(null)
    setTxHash(null)
    setMessageId(null)

    try {
      const result = await executeTransfer(chain, router, destConfig, ccipMessage, fee)

      // Add transaction to history
      if (result?.messageId) {
        addTransaction({
          messageId: result.messageId,
          txHash: result.txHash,
          sourceNetwork,
          destNetwork,
          amount,
          tokenSymbol: 'CCIP-BnM',
          receiver: effectiveDestAddress,
          sender: senderAddress,
        })
      }
    } catch (err) {
      console.error('Transfer failed:', err)
      const categorized = categorizeError(err)
      setBridgeState('error')
      setCategorizedErr(categorized)
      setErrorMessage(categorized.message)
    }
  }, [
    canSubmit,
    senderAddress,
    sourceNetwork,
    destNetwork,
    ccipMessage,
    fee,
    amount,
    effectiveDestAddress,
    getChain,
    destConfig,
    executeTransfer,
    addTransaction,
    tokenBalance,
    destBalance,
  ])

  /**
   * Reset form for new transfer
   */
  const handleReset = useCallback(() => {
    setBridgeState('idle')
    setTxHash(null)
    setMessageId(null)
    setErrorMessage('')
    setCategorizedErr(null)
    setAmount('')
    setDestAddress('')
    // Clear initial balances to prevent stale data on next transfer
    setInitialSourceBalance(undefined)
    setInitialDestBalance(undefined)
  }, [])

  // Show transaction status if in progress
  if (bridgeState !== 'idle' && bridgeState !== 'error') {
    return (
      <main id="main-content" className={styles.form}>
        <TransactionStatus
          key={messageId || txHash || 'pending'}
          state={bridgeState}
          messageState={messageState}
          detailedStatus={detailedStatus}
          statusDescription={statusDescription}
          txHash={txHash}
          destTxHash={destTxHash}
          messageId={messageId}
          sourceNetwork={sourceNetwork}
          destNetwork={destNetwork}
          onReset={handleReset}
          isFinal={isFinal}
          isTimedOut={isTimedOut}
          elapsedTime={elapsedTime}
          senderAddress={senderAddress}
          receiverAddress={effectiveDestAddress}
          tokenDecimals={tokenDecimals}
          initialSourceBalance={initialSourceBalance}
          initialDestBalance={initialDestBalance}
        />
      </main>
    )
  }

  return (
    <main id="main-content" className={styles.form}>
      <h2 className={styles.title}>Bridge Tokens</h2>
      <p className={styles.subtitle}>Transfer CCIP-BnM tokens across chains using Chainlink CCIP</p>

      {/* Error message - use categorized error display if available */}
      {categorizedErr ? (
        <ErrorMessage
          error={categorizedErr}
          onDismiss={() => {
            setCategorizedErr(null)
            setErrorMessage('')
            setBridgeState('idle')
          }}
        />
      ) : errorMessage ? (
        <div className={styles.error}>
          {errorMessage}
          <button
            onClick={() => {
              setErrorMessage('')
              setBridgeState('idle')
            }}
            className={styles.errorClose}
            aria-label="Dismiss error"
          >
            <XIcon size={16} />
          </button>
        </div>
      ) : null}

      {/* Network Selection */}
      <NetworkSelectionSection
        sourceNetwork={sourceNetwork}
        destNetwork={destNetwork}
        onSourceChange={setSourceNetwork}
        onDestChange={setDestNetwork}
      />

      {/* Wallet Indicator and Balances */}
      <WalletBalanceSection
        sourceNetwork={sourceNetwork}
        isWalletConnected={isWalletConnected}
        connectedAddress={connectedAddress}
        isEVM={isEVM}
        nativeCurrencySymbol={sourceConfig?.nativeCurrency.symbol || ''}
        nativeFormatted={nativeFormatted}
        tokenFormatted={tokenFormatted}
        balanceLoading={balanceLoading}
      />

      {/* Lane Info: Token Metadata, Pool Info, Destination Balance */}
      <LaneInfoSection
        sourceNetwork={sourceNetwork}
        destNetwork={destNetwork}
        sourceTokenAddress={sourceTokenAddress}
        tokenDecimals={tokenDecimals}
        effectiveDestAddress={effectiveDestAddress}
      />

      {/* Transfer Inputs: Amount and Destination Address */}
      <TransferInputsSection
        amount={amount}
        onAmountChange={setAmount}
        sourceNetwork={sourceNetwork}
        tokenDecimals={tokenDecimals}
        maxAmount={tokenBalance ?? undefined}
        effectiveDestAddress={effectiveDestAddress}
        destAddress={destAddress}
        onDestAddressChange={setDestAddress}
        destChainType={destConfig?.type}
      />

      {/* Fee and Latency Display */}
      <FeeDisplaySection
        sourceNetwork={sourceNetwork}
        destNetwork={destNetwork}
        feeFormatted={feeFormatted}
        feeSymbol={sourceConfig?.nativeCurrency.symbol || ''}
        latencyFormatted={latencyFormatted}
        feeLoading={feeLoading}
      />

      {/* Submit Button */}
      <SubmitButtonSection
        sourceNetwork={sourceNetwork}
        isWalletConnected={isWalletConnected}
        isCorrectNetwork={isCorrectNetwork}
        canSubmit={canSubmit}
        chainsLoading={chainsLoading}
        isEVM={isEVM}
        sourceNetworkName={sourceConfig?.name}
        onSwitchNetwork={handleSwitchNetwork}
        onSubmit={handleSubmit}
      />

      {/* Educational note */}
      <p className={styles.note}>
        This demo uses the{' '}
        <a
          href="https://www.npmjs.com/package/@chainlink/ccip-sdk"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View @chainlink/ccip-sdk on npm (opens in new tab)"
        >
          @chainlink/ccip-sdk
        </a>
        . Get native tokens (ETH, AVAX, SOL) from{' '}
        <a
          href="https://faucets.chain.link/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chainlink Faucets (opens in new tab)"
        >
          faucets.chain.link
        </a>{' '}
        and CCIP-BnM tokens from{' '}
        <a
          href="https://docs.chain.link/ccip/test-tokens"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CCIP Test Tokens documentation (opens in new tab)"
        >
          CCIP Test Tokens
        </a>
      </p>
    </main>
  )
}
