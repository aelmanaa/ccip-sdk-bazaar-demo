/**
 * Fee Display Section
 *
 * Shows estimated fee and latency for the transfer.
 */

import { FeeDisplay } from '../FeeDisplay'

interface FeeDisplaySectionProps {
  sourceNetwork: string
  destNetwork: string
  feeFormatted: string
  feeSymbol: string
  latencyFormatted: string
  feeLoading: boolean
}

export function FeeDisplaySection({
  sourceNetwork,
  destNetwork,
  feeFormatted,
  feeSymbol,
  latencyFormatted,
  feeLoading,
}: FeeDisplaySectionProps) {
  if (!sourceNetwork || !destNetwork) return null

  return (
    <FeeDisplay
      fee={feeFormatted}
      feeSymbol={feeSymbol}
      latency={latencyFormatted}
      isLoading={feeLoading}
    />
  )
}
