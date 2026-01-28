/**
 * Lane Info Section
 *
 * Displays token metadata, pool info, and destination balance.
 */

import { TokenMetadata } from '../TokenMetadata'
import { PoolInfo } from '../PoolInfo'
import { DestinationBalanceDisplay } from '../DestinationBalanceDisplay'

interface LaneInfoSectionProps {
  sourceNetwork: string
  destNetwork: string
  sourceTokenAddress: string | undefined
  tokenDecimals: number
  effectiveDestAddress: string
}

export function LaneInfoSection({
  sourceNetwork,
  destNetwork,
  sourceTokenAddress,
  tokenDecimals,
  effectiveDestAddress,
}: LaneInfoSectionProps) {
  return (
    <>
      {/* Token Metadata (shown when source selected) */}
      {sourceNetwork && (
        <TokenMetadata networkKey={sourceNetwork} tokenAddress={sourceTokenAddress} />
      )}

      {/* Pool Info with Rate Limits (shown when both chains selected) */}
      {sourceNetwork && destNetwork && (
        <PoolInfo
          sourceNetwork={sourceNetwork}
          destNetwork={destNetwork}
          tokenAddress={sourceTokenAddress}
          tokenDecimals={tokenDecimals}
          tokenSymbol="CCIP-BnM"
        />
      )}

      {/* Destination Balance (shown when both chains and address selected) */}
      {sourceNetwork && destNetwork && effectiveDestAddress && (
        <DestinationBalanceDisplay
          sourceNetwork={sourceNetwork}
          destNetwork={destNetwork}
          sourceTokenAddress={sourceTokenAddress}
          receiverAddress={effectiveDestAddress}
          tokenSymbol="CCIP-BnM"
          tokenDecimals={tokenDecimals}
        />
      )}
    </>
  )
}
