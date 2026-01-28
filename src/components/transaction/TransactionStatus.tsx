/**
 * Transaction Status Component
 *
 * Shows the current state of a cross-chain transfer.
 * Displays progress, explorer links, and status messages.
 *
 * CCIP SDK INTEGRATION: Uses getCCIPExplorerUrl() to generate
 * links to the CCIP Explorer for tracking messages.
 */

import { getCCIPExplorerUrl } from '@chainlink/ccip-sdk'
import { NETWORKS, getExplorerTxUrl } from '../../config'
import type { MessageState, DetailedMessageStatus } from '../../hooks/useMessageStatus'
import { TransferBalances } from './TransferBalances'
import { TransferRateLimits } from './TransferRateLimits'
import { CheckIcon, XIcon, ClockIcon, SpinnerIcon } from '../ui/icons'
import styles from './TransactionStatus.module.css'

interface TransactionStatusProps {
  state: string
  messageState: MessageState
  detailedStatus: DetailedMessageStatus
  statusDescription: string
  txHash: string | null
  destTxHash: string | null
  messageId: string | null
  sourceNetwork: string
  destNetwork: string
  onReset: () => void
  isFinal: boolean
  isTimedOut?: boolean
  elapsedTime?: string
  /** Sender address for balance display */
  senderAddress?: string
  /** Receiver address for balance display */
  receiverAddress?: string
  /** Token decimals for balance formatting */
  tokenDecimals?: number
  /** Initial source balance before transfer */
  initialSourceBalance?: bigint
  /** Initial destination balance before transfer */
  initialDestBalance?: bigint
}

export function TransactionStatus({
  state,
  messageState,
  detailedStatus,
  statusDescription,
  txHash,
  destTxHash,
  messageId,
  sourceNetwork,
  destNetwork,
  onReset,
  isFinal,
  isTimedOut = false,
  elapsedTime = '',
  senderAddress,
  receiverAddress,
  tokenDecimals = 18,
  initialSourceBalance,
  initialDestBalance,
}: TransactionStatusProps) {
  const sourceConfig = NETWORKS[sourceNetwork]
  const destConfig = NETWORKS[destNetwork]

  // Determine status icon and color
  const getStatusIcon = () => {
    if (isTimedOut) return <ClockIcon size={20} />
    switch (messageState) {
      case 'SUCCESS':
        return <CheckIcon size={20} />
      case 'FAILED':
        return <XIcon size={20} />
      case 'SENT':
      case 'COMMITTED':
        return <SpinnerIcon size={20} />
      default:
        return <SpinnerIcon size={20} />
    }
  }

  const getStatusColor = () => {
    if (isTimedOut) return styles.warning
    switch (messageState) {
      case 'SUCCESS':
        return styles.success
      case 'FAILED':
        return styles.error
      default:
        return styles.pending
    }
  }

  // Calculate current step for progress tracking
  const getCurrentStep = () => {
    if (detailedStatus === 'SUCCESS') return 5
    if (['BLESSED', 'VERIFYING', 'VERIFIED'].includes(detailedStatus)) return 4
    if (detailedStatus === 'COMMITTED') return 3
    if (detailedStatus === 'SOURCE_FINALIZED') return 2
    if (detailedStatus === 'SENT' || txHash) return 1
    return 0
  }
  const currentStep = getCurrentStep()
  const totalSteps = 5

  return (
    <div className={styles.container}>
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {statusDescription}
      </div>

      {/* Status Header */}
      <div
        className={`${styles.header} ${getStatusColor()} ${messageState === 'SUCCESS' ? styles.successHeader : ''}`}
      >
        <span
          className={`${styles.icon} ${messageState === 'SUCCESS' ? styles.successIcon : ''}`}
          aria-hidden="true"
        >
          {getStatusIcon()}
        </span>
        <span className={styles.title}>
          {isTimedOut
            ? 'Status Polling Timed Out'
            : messageState === 'SUCCESS'
              ? 'Transfer Complete!'
              : messageState === 'FAILED'
                ? 'Transfer Failed'
                : 'Transfer in Progress'}
        </span>
      </div>

      {/* Status Description */}
      <p className={styles.description}>{statusDescription}</p>

      {/* Elapsed Time */}
      {!isFinal && elapsedTime && <p className={styles.elapsedTime}>Elapsed: {elapsedTime}</p>}

      {/* Timeout Recovery Actions */}
      {isTimedOut && messageId && (
        <div className={styles.timeoutActions}>
          <p className={styles.timeoutMessage}>Status polling timed out after 35 minutes.</p>
          <div className={styles.timeoutOptions}>
            <a
              href={getCCIPExplorerUrl('msg', messageId)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionLink}
              aria-label="Check CCIP Explorer (opens in new tab)"
            >
              Check CCIP Explorer
            </a>
            <button onClick={onReset} className={styles.actionButton}>
              Start New Transfer
            </button>
          </div>
          <p className={styles.timeoutNote}>
            Your transfer may still complete. Check the explorer for the latest status.
          </p>
        </div>
      )}

      {/* Real-time Balance Display */}
      {senderAddress && receiverAddress && (
        <TransferBalances
          sourceNetwork={sourceNetwork}
          destNetwork={destNetwork}
          senderAddress={senderAddress}
          receiverAddress={receiverAddress}
          tokenDecimals={tokenDecimals}
          isTransferring={!isFinal}
          initialSourceBalance={initialSourceBalance}
          initialDestBalance={initialDestBalance}
        />
      )}

      {/* Real-time Rate Limits Display */}
      <TransferRateLimits
        sourceNetwork={sourceNetwork}
        destNetwork={destNetwork}
        tokenDecimals={tokenDecimals}
        tokenSymbol="CCIP-BnM"
        isTransferring={!isFinal}
      />

      {/* Detailed CCIP Progress Steps */}
      <div
        className={styles.steps}
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-label={`Transfer progress: step ${currentStep} of ${totalSteps}`}
      >
        <Step
          label="Transaction Submitted"
          status={
            txHash
              ? 'complete'
              : state === 'approving' || state === 'sending'
                ? 'active'
                : 'pending'
          }
        />
        <Step
          label="Source Finalized"
          sublabel="Waiting for source chain finality"
          status={getStepStatus(
            detailedStatus,
            ['SENT'],
            ['SOURCE_FINALIZED', 'COMMITTED', 'BLESSED', 'VERIFYING', 'VERIFIED', 'SUCCESS']
          )}
        />
        <Step
          label="DON Committed"
          sublabel="Merkle root committed to destination"
          status={getStepStatus(
            detailedStatus,
            ['SOURCE_FINALIZED'],
            ['COMMITTED', 'BLESSED', 'VERIFYING', 'VERIFIED', 'SUCCESS']
          )}
        />
        <Step
          label="Risk Management"
          sublabel="Blessed by Risk Management Network"
          status={getStepStatus(
            detailedStatus,
            ['COMMITTED'],
            ['BLESSED', 'VERIFYING', 'VERIFIED', 'SUCCESS']
          )}
        />
        <Step
          label="Executed"
          sublabel="Message executed on destination"
          status={
            detailedStatus === 'SUCCESS'
              ? 'complete'
              : detailedStatus === 'FAILED'
                ? 'error'
                : ['BLESSED', 'VERIFYING', 'VERIFIED'].includes(detailedStatus)
                  ? 'active'
                  : 'pending'
          }
        />
      </div>

      {/* Explorer Links */}
      <div className={styles.links}>
        {txHash && sourceNetwork && (
          <a
            href={getExplorerTxUrl(sourceNetwork, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={`View on ${sourceConfig?.explorerName || 'Source Explorer'} (opens in new tab)`}
          >
            View on {sourceConfig?.explorerName || 'Source Explorer'} →
          </a>
        )}

        {messageId && (
          <a
            href={getCCIPExplorerUrl('msg', messageId)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label="View on CCIP Explorer (opens in new tab)"
          >
            View on CCIP Explorer →
          </a>
        )}

        {destTxHash && destNetwork && (
          <a
            href={getExplorerTxUrl(destNetwork, destTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label={`View on ${destConfig?.explorerName || 'Destination Explorer'} (opens in new tab)`}
          >
            View on {destConfig?.explorerName || 'Destination Explorer'} →
          </a>
        )}
      </div>

      {/* Message ID Display */}
      {messageId && (
        <div className={styles.messageId}>
          <span className={styles.messageIdLabel}>Message ID</span>
          <code className={styles.messageIdValue}>
            {messageId.slice(0, 10)}...{messageId.slice(-8)}
          </code>
        </div>
      )}

      {/* Action Button - always show to allow starting new transfer */}
      <button className={styles.button} onClick={onReset}>
        {isFinal
          ? messageState === 'SUCCESS'
            ? 'New Transfer'
            : 'Try Again'
          : 'Start Another Transfer'}
      </button>
    </div>
  )
}

/**
 * Helper to determine step status based on detailed CCIP status
 */
function getStepStatus(
  current: DetailedMessageStatus,
  activeStatuses: DetailedMessageStatus[],
  completeStatuses: DetailedMessageStatus[]
): 'pending' | 'active' | 'complete' | 'error' {
  if (current === 'FAILED') return 'error'
  if (completeStatuses.includes(current)) return 'complete'
  if (activeStatuses.includes(current)) return 'active'
  return 'pending'
}

/**
 * Step indicator component with optional sublabel
 */
function Step({
  label,
  sublabel,
  status,
}: {
  label: string
  sublabel?: string
  status: 'pending' | 'active' | 'complete' | 'error'
}) {
  return (
    <div className={`${styles.step} ${styles[status]}`}>
      <div className={styles.stepDot}>
        {status === 'complete' && <CheckIcon size={12} />}
        {status === 'error' && <XIcon size={12} />}
        {status === 'active' && <span className={styles.spinner} />}
      </div>
      <div className={styles.stepText}>
        <span className={styles.stepLabel}>{label}</span>
        {sublabel && <span className={styles.stepSublabel}>{sublabel}</span>}
      </div>
    </div>
  )
}
