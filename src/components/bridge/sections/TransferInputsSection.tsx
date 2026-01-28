/**
 * Transfer Inputs Section
 *
 * Amount and destination address inputs for the bridge form.
 */

import { AmountInput } from '../AmountInput'
import { AddressInput } from '../AddressInput'
import styles from '../BridgeForm.module.css'

interface TransferInputsSectionProps {
  amount: string
  onAmountChange: (value: string) => void
  sourceNetwork: string
  tokenDecimals: number
  maxAmount: bigint | undefined
  effectiveDestAddress: string
  destAddress: string
  onDestAddressChange: (value: string) => void
  destChainType: 'evm' | 'solana' | undefined
}

export function TransferInputsSection({
  amount,
  onAmountChange,
  sourceNetwork,
  tokenDecimals,
  maxAmount,
  effectiveDestAddress,
  destAddress,
  onDestAddressChange,
  destChainType,
}: TransferInputsSectionProps) {
  return (
    <>
      {/* Amount Input */}
      <div className={styles.section}>
        <label className={styles.label}>Amount</label>
        <AmountInput
          value={amount}
          onChange={onAmountChange}
          symbol="CCIP-BnM"
          disabled={!sourceNetwork}
          maxDecimals={tokenDecimals}
          maxAmount={maxAmount}
        />
      </div>

      {/* Destination Address */}
      <div className={styles.section}>
        <label className={styles.label}>Destination Address</label>
        <AddressInput
          value={effectiveDestAddress}
          onChange={onDestAddressChange}
          placeholder="Enter destination address"
          chainType={destChainType}
        />
        {effectiveDestAddress && !destAddress && (
          <p className={styles.hint}>
            Pre-filled with your connected wallet. Edit above to send to a different address.
          </p>
        )}
      </div>
    </>
  )
}
