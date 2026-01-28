/**
 * Network Selection Section
 *
 * Source and destination network dropdowns for the bridge form.
 */

import { NetworkSelect } from '../NetworkSelect'
import { NETWORK_KEYS } from '../../../config'
import styles from '../BridgeForm.module.css'

interface NetworkSelectionSectionProps {
  sourceNetwork: string
  destNetwork: string
  onSourceChange: (network: string) => void
  onDestChange: (network: string) => void
}

export function NetworkSelectionSection({
  sourceNetwork,
  destNetwork,
  onSourceChange,
  onDestChange,
}: NetworkSelectionSectionProps) {
  return (
    <>
      <div className={styles.section}>
        <label className={styles.label}>From</label>
        <NetworkSelect
          value={sourceNetwork}
          onChange={onSourceChange}
          networks={NETWORK_KEYS}
          excludeNetwork={destNetwork}
          placeholder="Select source chain"
        />
      </div>

      <div className={styles.section}>
        <label className={styles.label}>To</label>
        <NetworkSelect
          value={destNetwork}
          onChange={onDestChange}
          networks={NETWORK_KEYS}
          excludeNetwork={sourceNetwork}
          placeholder="Select destination chain"
        />
      </div>
    </>
  )
}
