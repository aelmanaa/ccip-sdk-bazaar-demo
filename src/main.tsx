/**
 * Application Entry Point
 *
 * This is where React mounts to the DOM.
 * We import global styles here so they're available throughout the app.
 */

/**
 * Fix fetch binding for SDK compatibility
 *
 * Some bundler polyfills can break the native fetch binding, causing
 * "Illegal invocation" errors. This ensures fetch is always called
 * with the correct context (window/globalThis).
 */
if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    originalFetch.call(globalThis, input, init)
}

/**
 * SDK WORKAROUND (Issue #4) - Will be fixed in next SDK version
 *
 * Polyfill for setTimeout().unref()
 *
 * The CCIP SDK's retry logic uses setTimeout(...).unref() which is a Node.js API.
 * In browsers, setTimeout returns a number (timer ID), not an object with .unref().
 * This polyfill wraps setTimeout to return an object with a no-op .unref() method.
 */
if (typeof window !== 'undefined') {
  const originalSetTimeout = window.setTimeout
  // @ts-expect-error - Overriding setTimeout signature for polyfill
  window.setTimeout = function (
    callback: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ): ReturnType<typeof originalSetTimeout> & { unref: () => void } {
    const id = originalSetTimeout(callback, delay, ...args)
    // Return an object that wraps the timer ID and adds a no-op unref
    return Object.assign(id as unknown as object, {
      unref: () => {
        /* no-op in browser */
      },
    }) as ReturnType<typeof originalSetTimeout> & { unref: () => void }
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

// Import RainbowKit styles for wallet modal
import '@rainbow-me/rainbowkit/styles.css'

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Check index.html for <div id="root"></div>')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
