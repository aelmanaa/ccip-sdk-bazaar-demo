/**
 * Pool Info Component
 *
 * Displays comprehensive token pool information in a collapsible section.
 * Shows pool address, type, remote configuration, and rate limits.
 *
 * EDUCATIONAL: Demonstrates using multiple CCIP SDK functions:
 * - getTokenAdminRegistryFor()
 * - getRegistryTokenConfig()
 * - getTokenPoolConfigs()
 * - getTokenPoolRemotes()
 */

import { useState } from 'react'
import { useTokenPoolInfo } from '../../hooks/useTokenPoolInfo'
import { RateLimitDisplay } from './RateLimitDisplay'
import { Skeleton } from '../ui/Spinner'
import { CopyableAddress, CopyableAddressList } from '../ui/CopyableAddress'
import { WarningIcon, ChainIcon, ChevronIcon, BookIcon } from '../ui/icons'
import styles from './PoolInfo.module.css'

interface PoolInfoProps {
  /** Source network key */
  sourceNetwork: string | undefined
  /** Destination network key */
  destNetwork: string | undefined
  /** Token address on source chain */
  tokenAddress: string | undefined
  /** Token decimals for rate limit display */
  tokenDecimals?: number
  /** Token symbol for display */
  tokenSymbol?: string
}

/**
 * Pool information display with collapsible details
 */
export function PoolInfo({
  sourceNetwork,
  destNetwork,
  tokenAddress,
  tokenDecimals = 18,
  tokenSymbol = 'tokens',
}: PoolInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { poolInfo, isLaneSupported, isLoading, error } = useTokenPoolInfo(
    sourceNetwork,
    destNetwork,
    tokenAddress
  )

  // Don't render if no inputs
  if (!sourceNetwork || !destNetwork || !tokenAddress) return null

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton width={100} height={16} />
          <Skeleton width={60} height={14} />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon} aria-hidden="true">
            <WarningIcon size={16} />
          </span>
          <span>Could not load pool information</span>
        </div>
      </div>
    )
  }

  // Lane not supported warning
  if (!isLaneSupported && poolInfo) {
    return (
      <div className={`${styles.container} ${styles.warning}`}>
        <div className={styles.warningContent}>
          <span className={styles.warningIcon} aria-hidden="true">
            <WarningIcon size={18} />
          </span>
          <div className={styles.warningText}>
            <strong>Lane Not Supported</strong>
            <p>This token cannot be transferred on the selected route.</p>
          </div>
        </div>
      </div>
    )
  }

  // No pool info available
  if (!poolInfo) return null

  return (
    <div className={styles.container}>
      {/* Collapsible header */}
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon} aria-hidden="true">
            <ChainIcon size={16} />
          </span>
          <span className={styles.headerTitle}>Pool Info</span>
          <span className={styles.poolType}>{poolInfo.typeAndVersion}</span>
        </div>
        <span
          className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
          aria-hidden="true"
        >
          <ChevronIcon size={14} direction={isExpanded ? 'up' : 'down'} />
        </span>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className={styles.content}>
          {/* Pool type and version - prominent display */}
          <div className={styles.typeVersionRow}>
            <span className={styles.typeVersionLabel}>Pool Type</span>
            <span className={styles.typeVersionValue}>{poolInfo.typeAndVersion}</span>
          </div>

          {/* Pool address */}
          <div className={styles.row}>
            <CopyableAddress
              address={poolInfo.poolAddress}
              label="Pool Address"
              startChars={8}
              endChars={6}
            />
          </div>

          {/* Remote token */}
          {poolInfo.remoteToken && (
            <div className={styles.row}>
              <CopyableAddress
                address={poolInfo.remoteToken}
                label="Remote Token"
                startChars={8}
                endChars={6}
              />
            </div>
          )}

          {/* Remote pools (array) */}
          {poolInfo.remotePools.length > 0 && (
            <div className={styles.row}>
              <CopyableAddressList
                addresses={poolInfo.remotePools}
                label={`Remote Pools (${poolInfo.remotePools.length})`}
                startChars={8}
                endChars={6}
              />
            </div>
          )}

          {/* Rate limits */}
          <div className={styles.rateLimits}>
            <RateLimitDisplay
              bucket={poolInfo.outboundRateLimit}
              label="Outbound"
              decimals={tokenDecimals}
              symbol={tokenSymbol}
            />
            <RateLimitDisplay
              bucket={poolInfo.inboundRateLimit}
              label="Inbound"
              decimals={tokenDecimals}
              symbol={tokenSymbol}
            />
          </div>

          {/* Educational note */}
          <div className={styles.educationalNote}>
            <span className={styles.noteIcon} aria-hidden="true">
              <BookIcon size={14} />
            </span>
            <span>
              Data fetched via CCIP SDK: getTokenAdminRegistryFor, getRegistryTokenConfig,
              getTokenPoolConfigs, getTokenPoolRemotes
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Lane support indicator badge
 */
export function LaneSupportBadge({
  sourceNetwork,
  destNetwork,
  tokenAddress,
}: {
  sourceNetwork: string | undefined
  destNetwork: string | undefined
  tokenAddress: string | undefined
}) {
  const { isLaneSupported, isLoading } = useTokenPoolInfo(sourceNetwork, destNetwork, tokenAddress)

  if (!sourceNetwork || !destNetwork || !tokenAddress) return null
  if (isLoading) return <span className={styles.loadingBadge}>Checking...</span>

  return (
    <span className={isLaneSupported ? styles.supportedBadge : styles.unsupportedBadge}>
      {isLaneSupported ? 'Lane Supported' : 'Lane Not Supported'}
    </span>
  )
}
