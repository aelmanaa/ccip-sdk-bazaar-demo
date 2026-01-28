/**
 * ErrorMessage Component
 *
 * Displays categorized error messages with appropriate styling and icons.
 * Integrates with the error utilities for consistent error handling.
 *
 * Features:
 * - Color-coded by error category
 * - Dismissible with close button
 * - Shows recovery suggestions
 * - Expandable technical details for unknown errors
 * - Copy button for error details (for bug reporting)
 */

import { useState } from 'react'
import { type CategorizedError, type ErrorCategory } from '../../utils/errors'
import styles from './ErrorMessage.module.css'

interface ErrorMessageProps {
  /** The categorized error to display */
  error: CategorizedError
  /** Callback when close button is clicked */
  onDismiss?: () => void
  /** Whether to show technical details */
  showDetails?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Get icon SVG for error category
 */
function ErrorIcon({ category }: { category: ErrorCategory }) {
  switch (category) {
    case 'WALLET_REJECTION':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.icon}>
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'INSUFFICIENT_BALANCE':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.icon}>
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path
            fillRule="evenodd"
            d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'NETWORK_ERROR':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.icon}>
          <path
            fillRule="evenodd"
            d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'TIMEOUT_ERROR':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.icon}>
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'VALIDATION_ERROR':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.icon}>
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'SDK_ERROR':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.icon}>
          <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
        </svg>
      )

    default:
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.icon}>
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )
  }
}

/**
 * ErrorMessage component for displaying categorized errors
 */
export function ErrorMessage({
  error,
  onDismiss,
  showDetails = false,
  className = '',
}: ErrorMessageProps) {
  const [copied, setCopied] = useState(false)
  const severityClass = error.severity === 'warning' ? styles.warning : styles.error

  // Always show details for unknown errors (for bug reporting)
  const shouldShowDetails = showDetails || error.category === 'UNKNOWN_ERROR'
  const hasErrorData = error.rawErrorData || error.details

  const handleCopyError = async () => {
    const textToCopy = error.rawErrorData || error.details || error.message
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={`${styles.container} ${severityClass} ${className}`} role="alert">
      <div className={styles.content}>
        <ErrorIcon category={error.category} />
        <div className={styles.text}>
          <p className={styles.message}>{error.message}</p>
          {error.recovery && <p className={styles.recovery}>{error.recovery}</p>}

          {/* Show expandable error details for unknown errors or when showDetails is true */}
          {shouldShowDetails && hasErrorData && (
            <details className={styles.details} open={error.category === 'UNKNOWN_ERROR'}>
              <summary>
                Error details {error.category === 'UNKNOWN_ERROR' && '(for bug reports)'}
              </summary>
              <div className={styles.detailsContent}>
                <pre>{error.rawErrorData || error.details}</pre>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={handleCopyError}
                  aria-label="Copy error details"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className={styles.copyIcon}>
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className={styles.copyIcon}>
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                      Copy error details
                    </>
                  )}
                </button>
              </div>
            </details>
          )}

          {/* GitHub issue link for unknown errors */}
          {error.category === 'UNKNOWN_ERROR' && (
            <p className={styles.reportLink}>
              <a
                href="https://github.com/smartcontractkit/ccip/issues/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report issue on GitHub
              </a>
            </p>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className={styles.closeIcon}>
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * Simple inline error text (for form field validation)
 */
export function InlineError({ message, className = '' }: { message: string; className?: string }) {
  return (
    <p className={`${styles.inlineError} ${className}`} role="alert">
      {message}
    </p>
  )
}
