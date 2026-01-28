/**
 * Network Select Component
 *
 * Custom dropdown for selecting source or destination network.
 * Displays chain logos alongside network names.
 * Filters out the "other" network to prevent same-chain transfers.
 */

import { useState, useRef, useEffect } from 'react'
import { NETWORKS } from '../../config'
import styles from './NetworkSelect.module.css'

// Import chain logos
import ethereumLogo from '../../assets/chains/ethereum.svg'
import solanaLogo from '../../assets/chains/solana.svg'
import avalancheLogo from '../../assets/chains/avalanche.svg'
import baseLogo from '../../assets/chains/base.svg'

const CHAIN_LOGOS: Record<string, string> = {
  'ethereum-sepolia': ethereumLogo,
  'base-sepolia': baseLogo,
  'avalanche-fuji': avalancheLogo,
  'solana-devnet': solanaLogo,
}

interface NetworkSelectProps {
  value: string
  onChange: (network: string) => void
  networks: string[]
  excludeNetwork?: string
  placeholder?: string
}

export function NetworkSelect({
  value,
  onChange,
  networks,
  excludeNetwork,
  placeholder = 'Select network',
}: NetworkSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter out excluded network
  const availableNetworks = networks.filter((key) => key !== excludeNetwork)

  // Get selected network info
  const selectedNetwork = value ? NETWORKS[value] : null
  const selectedLogo = value ? CHAIN_LOGOS[value] : null

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelect = (networkKey: string) => {
    onChange(networkKey)
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedNetwork ? (
          <span className={styles.selected}>
            {selectedLogo && (
              <img src={selectedLogo} alt={selectedNetwork.name} className={styles.logo} />
            )}
            <span className={styles.networkName}>{selectedNetwork.name}</span>
            <span className={styles.networkType}>
              {selectedNetwork.type === 'solana' ? 'Solana' : 'EVM'}
            </span>
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <span className={styles.arrow}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul className={styles.dropdown} role="listbox">
          {availableNetworks.map((key) => {
            const network = NETWORKS[key]
            if (!network) return null
            const logo = CHAIN_LOGOS[key]
            const isSelected = key === value

            return (
              <li key={key} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                  onClick={() => handleSelect(key)}
                >
                  {logo && <img src={logo} alt={network.name} className={styles.logo} />}
                  <span className={styles.networkName}>{network.name}</span>
                  <span className={styles.networkType}>
                    {network.type === 'solana' ? 'Solana' : 'EVM'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
