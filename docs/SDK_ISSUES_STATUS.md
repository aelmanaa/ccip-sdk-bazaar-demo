# CCIP SDK Issues Status Report

SDK Version: `@chainlink/ccip-sdk@0.96.0`
Last Updated: 2026-02-10

## Issue Status Summary

| ID  | Issue                             | Status  | Workaround Required |
| --- | --------------------------------- | ------- | ------------------- |
| 1   | `getMessageById()` return type    | Fixed   | No                  |
| 2   | Viem/Wagmi type mismatch          | Open    | Yes                 |
| 3a  | `getTokenPoolConfig()` naming     | Fixed   | No                  |
| 3b  | `getTokenPoolRemotes()` types     | Fixed   | No                  |
| 3c  | `RateLimiterState` nullability    | Fixed   | No                  |
| 4   | `setTimeout().unref()` in browser | Fixed   | No                  |
| 5   | Bundle size with manualChunks     | Partial | Optional            |

---

## Fixed Issues

### Issue #1: `getMessageById()` Return Type

**Affected versions:** v0.95.0 and earlier
**Fixed in:** v0.96.0

In v0.95.0, `chain.getMessageById()` returned `CCIPRequest`, but the actual response contained `status` and `receiptTransactionHash` fields missing from the type definition.

v0.96.0 exposes these fields via the `metadata` property:

```typescript
const message = await chain.getMessageById(messageId)
const status = message.metadata?.status
const destTxHash = message.metadata?.receiptTransactionHash
```

**File:** `src/hooks/useMessageStatus.ts:269-280`

---

### Issue #3a: `getTokenPoolConfig()` Method Naming

**Affected versions:** v0.95.0 and earlier
**Fixed in:** v0.96.0

Method renamed from `getTokenPoolConfigs()` (plural) to `getTokenPoolConfig()` (singular). Return type varies by chain:

- `EVMChain`: Returns `{ token, router, typeAndVersion: string }`
- `SolanaChain`: Returns `{ token, router, tokenPoolProgram, typeAndVersion?: string }`

Use `instanceof` narrowing for type safety:

```typescript
if (sourceChain instanceof EVMChain) {
  const config = await sourceChain.getTokenPoolConfig(poolAddress)
  // config.typeAndVersion is guaranteed string
}
```

**File:** `src/hooks/useTokenPoolInfo.ts:203-228`

---

### Issue #3b: `getTokenPoolRemotes()` Return Structure

**Affected versions:** v0.95.0 and earlier
**Fixed in:** v0.96.0

Return type is `Record<string, TokenPoolRemote>` (keyed by chain selector). Extract values:

```typescript
const remotes = await chain.getTokenPoolRemotes(poolAddress, destSelector)
const entries = Object.values(remotes)
const remote = entries[0] // First entry for single-destination queries
```

**File:** `src/hooks/useTokenPoolInfo.ts:247-267`

---

### Issue #3c: `RateLimiterState` Nullability

**Affected versions:** v0.95.0 and earlier
**Fixed in:** v0.96.0

`RateLimiterState` now explicitly typed as `{ tokens, capacity, rate } | null`. Null indicates rate limiting disabled.

**File:** `src/hooks/useTokenPoolInfo.ts:45-53`

---

### Issue #4: `setTimeout().unref()` Browser Error

**Affected versions:** v0.95.0 and earlier
**Fixed in:** v0.96.0

SDK retry logic called `setTimeout(...).unref()` which throws in browsers (`unref` is Node.js-specific).

SDK now uses optional chaining: `timer.unref?.()`. No polyfill needed.

---

## Open Issues

### Issue #2: Viem/Wagmi Type Mismatch

**Status:** Open (requires workaround)
**Affects:** All versions including v0.96.0

`fromViemClient()` expects `PublicClient<Transport, Chain>`. Wagmi's `getPublicClient()` returns a chain-specific typed client that doesn't match.

**Workaround:** Cast via bridge function:

```typescript
function toGenericPublicClient(
  client: ReturnType<typeof getPublicClient>
): PublicClient<Transport, Chain> {
  return client as PublicClient<Transport, Chain>
}
```

**File:** `src/hooks/ChainProvider.tsx:33-42`

**Notes:** The cast is safe when both packages use the same viem version. A future SDK update may accept broader input types.

---

### Issue #5: Bundle Size with `manualChunks`

**Status:** Improved but not resolved
**Affects:** Vite/Rollup builds using manual chunk splitting

Placing `@chainlink/ccip-sdk` in `manualChunks` disables tree-shaking. The bundler includes all chain implementations (EVM, Solana, Aptos) even if you only import one.

**Bundle size comparison:**

| Version | Size with manualChunks |
| ------- | ---------------------- |
| v0.95.0 | 3.2 MB                 |
| v0.96.0 | 1.0 MB                 |

**Recommendation:** Remove SDK from `manualChunks` to enable tree-shaking:

```javascript
// vite.config.ts
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-solana': ['@solana/web3.js', ...],
  'vendor-evm': ['wagmi', 'viem', ...],
  // Omit @chainlink/ccip-sdk
}
```

**File:** `vite.config.ts:69-78`
**Related:** https://github.com/smartcontractkit/ccip-javascript-sdk/issues/131

---

## Environment Requirements

These are not SDK bugs but integration requirements.

### Node.js Polyfills (Browser)

SDK requires polyfills for browser environments:

```javascript
// vite.config.ts
nodePolyfills({
  include: ['buffer', 'crypto', 'stream', 'util', 'process'],
})
```

**File:** `vite.config.ts:27-34`

### Fetch Binding (Bundler-specific)

Some bundlers break native fetch context. Fix if you see "Illegal invocation":

```typescript
// main.tsx
if (typeof globalThis.fetch === 'function') {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) => originalFetch.call(globalThis, input, init)
}
```

**File:** `src/main.tsx:15-19`

---

## Verification Commands

```bash
# Check SDK version
npm ls @chainlink/ccip-sdk

# Verify bundle size
npm run build && ls -lh dist/assets/vendor-ccip-*.js

# Type check
npm run typecheck
```
