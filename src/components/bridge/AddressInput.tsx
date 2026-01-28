/**
 * Address Input Component
 *
 * Input field for destination address with validation.
 * Shows different placeholders based on chain type.
 * Validates EVM (0x-prefixed) and Solana (Base58) addresses.
 * Shows visual validation feedback with check/x icons.
 */

import { useState, useCallback, useMemo } from 'react'
import { validateAddress, detectAddressType } from '../../utils/validation'
import { InlineError } from '../ui/ErrorMessage'
import { CheckIcon, XIcon } from '../ui/icons'
import styles from './AddressInput.module.css'

interface AddressInputProps {
  /** Current address value */
  value: string
  /** Callback when address changes */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Expected chain type for validation (optional - will auto-detect if not provided) */
  chainType?: 'evm' | 'solana'
  /** Whether input is disabled */
  disabled?: boolean
}

export function AddressInput({
  value,
  onChange,
  placeholder = 'Enter destination address',
  chainType,
  disabled = false,
}: AddressInputProps) {
  const [touched, setTouched] = useState(false)

  // Validate on blur
  const handleBlur = useCallback(() => {
    setTouched(true)
  }, [])

  // Validation result
  const validation = useMemo(() => {
    if (!value || !touched) return { isValid: true }

    // If chain type is specified, validate against it
    if (chainType) {
      return validateAddress(value, chainType)
    }

    // Auto-detect chain type and validate
    const detectedType = detectAddressType(value)
    if (!detectedType) {
      // If we can't detect the type, check if it looks like an attempt at either format
      if (value.startsWith('0x')) {
        return validateAddress(value, 'evm')
      }
      // Check if it's too short/long for either format
      if (value.length < 32) {
        return { isValid: false, error: 'Address is too short' }
      }
      if (value.length > 44) {
        return { isValid: false, error: 'Address is too long' }
      }
      return validateAddress(value, 'solana')
    }

    return validateAddress(value, detectedType)
  }, [value, chainType, touched])

  const hasError = touched && !validation.isValid && value.length > 0

  const inputId = 'address-input'
  const errorId = 'address-error'
  const isValid = touched && value.length > 0 && validation.isValid

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.container} ${hasError ? styles.invalid : ''} ${isValid ? styles.valid : ''}`}
      >
        <input
          id={inputId}
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          aria-label="Receiver address"
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
        />
        {touched && value.length > 0 && (
          <div
            className={`${styles.validationIcon} ${isValid ? styles.valid : ''} ${hasError ? styles.invalid : ''}`}
          >
            {isValid ? <CheckIcon size={16} /> : hasError ? <XIcon size={16} /> : null}
          </div>
        )}
      </div>
      {hasError && validation.error && (
        <span id={errorId} role="alert">
          <InlineError message={validation.error} />
        </span>
      )}
    </div>
  )
}
