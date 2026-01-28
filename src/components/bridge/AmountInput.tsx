/**
 * Amount Input Component
 *
 * Input field for token amounts with symbol display and validation.
 * Validates numeric input, decimal places, and balance checks.
 * Includes MAX button to fill with available balance.
 */

import { useState, useCallback, useMemo } from 'react'
import { validateAmount } from '../../utils/validation'
import { formatTokenAmount } from '../../config'
import { InlineError } from '../ui/ErrorMessage'
import styles from './AmountInput.module.css'

interface AmountInputProps {
  /** Current amount value */
  value: string
  /** Callback when amount changes */
  onChange: (value: string) => void
  /** Token symbol to display */
  symbol: string
  /** Whether input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Maximum decimals allowed */
  maxDecimals?: number
  /** Maximum amount (user's balance) for validation */
  maxAmount?: bigint
  /** Callback when MAX button is clicked (optional, falls back to maxAmount) */
  onMaxClick?: () => void
}

export function AmountInput({
  value,
  onChange,
  symbol,
  disabled = false,
  placeholder = '0.0',
  maxDecimals = 18,
  maxAmount,
  onMaxClick,
}: AmountInputProps) {
  const [touched, setTouched] = useState(false)

  // Only allow valid numeric input
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value
      // Allow empty, numbers, and single decimal point
      if (input === '' || /^\d*\.?\d*$/.test(input)) {
        onChange(input)
      }
    },
    [onChange]
  )

  // Validate on blur
  const handleBlur = useCallback(() => {
    setTouched(true)
  }, [])

  // Handle MAX button click
  const handleMaxClick = useCallback(() => {
    if (onMaxClick) {
      onMaxClick()
    } else if (maxAmount !== undefined) {
      // Format the max amount and set it as the value
      const formatted = formatTokenAmount(maxAmount, maxDecimals)
      onChange(formatted)
    }
  }, [onMaxClick, maxAmount, maxDecimals, onChange])

  // Validation result
  const validation = useMemo(() => {
    if (!value || !touched) return { isValid: true }

    return validateAmount(value, {
      maxDecimals,
      maxAmount,
      symbol,
    })
  }, [value, touched, maxDecimals, maxAmount, symbol])

  const hasError = touched && !validation.isValid && value.length > 0

  const inputId = 'amount-input'
  const errorId = 'amount-error'

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container} ${hasError ? styles.error : ''}`}>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className={styles.input}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Transfer amount"
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
        />
        {maxAmount !== undefined && maxAmount > 0n && (
          <button
            type="button"
            className={styles.maxButton}
            onClick={handleMaxClick}
            disabled={disabled}
            aria-label="Set maximum amount"
          >
            MAX
          </button>
        )}
        <span className={styles.symbol} aria-hidden="true">
          {symbol}
        </span>
      </div>
      {hasError && validation.error && (
        <span id={errorId} role="alert">
          <InlineError message={validation.error} />
        </span>
      )}
    </div>
  )
}
