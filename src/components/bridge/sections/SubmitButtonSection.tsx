/**
 * Submit Button Section
 *
 * Conditional button that shows:
 * - "Connect Wallet" when not connected
 * - "Switch Network" when on wrong network
 * - "Bridge Tokens" when ready to submit
 */

import styles from '../BridgeForm.module.css'

interface SubmitButtonSectionProps {
  sourceNetwork: string
  isWalletConnected: boolean
  isCorrectNetwork: boolean
  canSubmit: boolean
  chainsLoading: boolean
  isEVM: (network: string) => boolean
  sourceNetworkName: string | undefined
  onSwitchNetwork: () => void
  onSubmit: () => void
}

export function SubmitButtonSection({
  sourceNetwork,
  isWalletConnected,
  isCorrectNetwork,
  canSubmit,
  chainsLoading,
  isEVM,
  sourceNetworkName,
  onSwitchNetwork,
  onSubmit,
}: SubmitButtonSectionProps) {
  return (
    <div className={styles.actions}>
      {!isWalletConnected && sourceNetwork ? (
        <button className={styles.button} disabled>
          Connect {isEVM(sourceNetwork) ? 'EVM' : 'Solana'} Wallet
        </button>
      ) : !isCorrectNetwork && sourceNetwork ? (
        <button className={styles.button} onClick={onSwitchNetwork}>
          Switch to {sourceNetworkName}
        </button>
      ) : (
        <button className={styles.button} onClick={onSubmit} disabled={!canSubmit || chainsLoading}>
          {chainsLoading ? 'Loading...' : 'Bridge Tokens'}
        </button>
      )}
    </div>
  )
}
