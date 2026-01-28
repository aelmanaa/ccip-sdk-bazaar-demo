# CCIP SDK Token Bridge Demo

A hands-on educational demo showing how to build a cross-chain token bridge using the **[@chainlink/ccip-sdk](https://www.npmjs.com/package/@chainlink/ccip-sdk)**.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/aelmanaa/ccip-sdk-bazaar-demo)

## What You'll Learn

This demo teaches you how to:

1. **Initialize CCIP SDK chains** - Connect to EVM and Solana networks
2. **Estimate transfer fees** - Use `chain.getFee()` to show costs upfront
3. **Generate unsigned transactions** - Use `chain.generateUnsignedSendMessage()` for browser wallets
4. **Track message status** - Poll `chain.getMessageById()` until completion
5. **Handle multi-chain wallets** - Integrate RainbowKit (EVM) and Solana Wallet Adapter

## Quick Start

### Option 1: GitHub Codespaces (Recommended)

1. Click the "Open in GitHub Codespaces" button above
2. Wait for the environment to initialize (~1-2 minutes, `npm install` runs automatically)
3. Run `npm run dev` in the terminal
4. Click "Open in Browser" when the port popup appears

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/aelmanaa/ccip-sdk-bazaar-demo.git
cd ccip-sdk-bazaar-demo

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Configuration (Optional)

> **Note:** The demo works immediately without any configuration!
> Custom RPC endpoints are only needed if you experience rate limiting.

### Using Custom RPC Endpoints

1. Copy the example config:

   ```bash
   cp .env.example .env
   ```

2. Uncomment and add your RPC URLs:

   ```bash
   VITE_RPC_ETHEREUM_TESTNET_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   ```

3. Restart the dev server

### Environment Variables

Env var names match SDK network IDs from `@chainlink/ccip-sdk`:

| Network          | Environment Variable                       |
| ---------------- | ------------------------------------------ |
| Ethereum Sepolia | `VITE_RPC_ETHEREUM_TESTNET_SEPOLIA`        |
| Base Sepolia     | `VITE_RPC_ETHEREUM_TESTNET_SEPOLIA_BASE_1` |
| Avalanche Fuji   | `VITE_RPC_AVALANCHE_TESTNET_FUJI`          |
| Solana Devnet    | `VITE_RPC_SOLANA_DEVNET`                   |

### Getting Free RPC API Keys

| Provider                       | Networks    | Free Tier                |
| ------------------------------ | ----------- | ------------------------ |
| [Alchemy](https://alchemy.com) | All         | 300M compute units/month |
| [Infura](https://infura.io)    | EVM only    | 100K requests/day        |
| [Helius](https://helius.dev)   | Solana only | 100K requests/day        |

### Using Custom RPCs in Codespaces

1. Go to [github.com/settings/codespaces](https://github.com/settings/codespaces)
2. Add secrets (e.g., `VITE_RPC_ETHEREUM_TESTNET_SEPOLIA`)
3. Select this repository for access
4. Rebuild your Codespace

## Prerequisites

Before using the demo, you'll need:

### 1. Testnet Tokens

You need two types of tokens:

**Native tokens** (for gas fees) - Get from official faucets:

| Network          | Faucet Link                                                                | Token |
| ---------------- | -------------------------------------------------------------------------- | ----- |
| Ethereum Sepolia | [faucets.chain.link/sepolia](https://faucets.chain.link/sepolia)           | ETH   |
| Base Sepolia     | [faucets.chain.link/base-sepolia](https://faucets.chain.link/base-sepolia) | ETH   |
| Avalanche Fuji   | [faucets.chain.link/fuji](https://faucets.chain.link/fuji)                 | AVAX  |
| Solana Devnet    | [faucet.solana.com](https://faucet.solana.com/)                            | SOL   |

**CCIP-BnM tokens** (for bridging) - Get from [docs.chain.link/ccip/test-tokens](https://docs.chain.link/ccip/test-tokens)

### 2. Wallet Extensions

- **EVM**: MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet
- **Solana**: Phantom, Solflare, or any Solana wallet

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         React App                            │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │   RainbowKit  │  │ Solana Wallet │  │  Chain        │   │
│  │   (EVM)       │  │ Adapter       │  │  Provider     │   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │
│          │                  │                  │            │
│          └──────────────────┼──────────────────┘            │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │  @chainlink/    │                      │
│                    │  ccip-sdk       │                      │
│                    └────────┬────────┘                      │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
      ┌───────▼───────┐ ┌─────▼─────┐ ┌───────▼───────┐
      │ Ethereum      │ │ Avalanche │ │ Solana        │
      │ Sepolia       │ │ Fuji      │ │ Devnet        │
      └───────────────┘ └───────────┘ └───────────────┘
              │
      ┌───────▼───────┐
      │ Base Sepolia  │
      └───────────────┘
```

## Key SDK Functions Used

### 1. Chain Initialization

```typescript
import { SolanaChain } from '@chainlink/ccip-sdk'
import { fromViemClient } from '@chainlink/ccip-sdk/viem'
import { getPublicClient } from '@wagmi/core'

// Initialize EVM chain using viem adapter (recommended with wagmi)
const publicClient = getPublicClient(wagmiConfig, { chainId: 11155111 })
const evmChain = await fromViemClient(publicClient)

// Initialize Solana chain from RPC URL
const solanaChain = await SolanaChain.fromUrl('https://solana-devnet.g.alchemy.com/v2/...')
```

### 2. Fee Estimation

```typescript
// Estimate the CCIP fee for a transfer
// First get the token decimals
const tokenInfo = await chain.getTokenInfo(tokenAddress)

const fee = await chain.getFee({
  router: routerAddress,
  destChainSelector, // CCIP chain selector, not chain ID!
  message: {
    receiver: destAddress,
    data: '0x',
    tokenAmounts: [{ token: tokenAddress, amount: parseUnits('10', tokenInfo.decimals) }],
  },
})

console.log(`Fee: ${formatEther(fee)} ETH`)
```

### 3. Lane Latency (Transfer Time Estimate)

```typescript
// Get estimated transfer time
const latency = await chain.getLaneLatency(destChainSelector)
const minutes = Math.round(latency.totalMs / 60000)

console.log(`Estimated time: ~${minutes} minutes`)
```

### 4. Generate Unsigned Transaction (Browser Wallet Compatible)

```typescript
// Generate unsigned transaction for wallet signing
const unsignedTx = await chain.generateUnsignedSendMessage({
  sender: walletAddress,
  router: routerAddress,
  destChainSelector,
  message: {
    receiver: destAddress,
    data: '0x',
    tokenAmounts: [{ token, amount }],
    fee,
  },
})

// EVM: Sign with connected wallet (MetaMask, etc.)
for (const tx of unsignedTx.transactions) {
  const hash = await walletClient.sendTransaction(tx)
  await publicClient.waitForTransactionReceipt({ hash })
}
```

### 5. Message Status Tracking

```typescript
// After sending, get the message ID from the transaction
const messages = await chain.getMessagesInTx(txHash)
const messageId = messages[0].message.messageId

// Poll status until final
const status = await chain.getMessageById(messageId)
// status.state: 'SENT' | 'COMMITTED' | 'SUCCESS' | 'FAILED'
```

### 6. CCIP Explorer Links

```typescript
import { getCCIPExplorerUrl } from '@chainlink/ccip-sdk'

// Generate links for tracking
const messageUrl = getCCIPExplorerUrl('msg', messageId)
// => 'https://ccip.chain.link/msg/0x...'

const txUrl = getCCIPExplorerUrl('tx', txHash)
// => 'https://ccip.chain.link/tx/0x...'
```

### 7. Error Parsing (EVM and Solana)

The SDK provides chain-specific error parsing utilities to decode CCIP-specific errors:

```typescript
import { EVMChain, SolanaChain } from '@chainlink/ccip-sdk'

// EVM: Parse error from transaction revert
// The SDK uses CCIP contract ABIs to decode error selectors
try {
  await publicClient.call({ to, data, value })
} catch (error) {
  const parsed = EVMChain.parse(error)
  if (parsed) {
    // parsed contains keys like 'revert', 'revert.ChainNotAllowed', etc.
    console.log('Error:', parsed)
    // => { revert: 'ChainNotAllowed(uint64 destChainSelector)', ... }
  }
}

// Solana: Parse error from transaction logs
// The SDK extracts error info from program logs
try {
  await sendTransaction(transaction, connection)
} catch (error) {
  // Pass the error (which may contain logs) or transaction logs directly
  const parsed = SolanaChain.parse(error.logs || error)
  if (parsed) {
    console.log('Error:', parsed)
    // => { program: '...', error: 'Rate limit exceeded', ... }
  }
}
```

**Common CCIP Errors:**

| Error                        | Description                                  | Solution                                   |
| ---------------------------- | -------------------------------------------- | ------------------------------------------ |
| `ChainNotAllowed`            | Destination chain not enabled for this token | Use a supported route                      |
| `RateLimitReached`           | Token bucket rate limit exceeded             | Try smaller amount or wait                 |
| `UnsupportedToken`           | Token not supported on this lane             | Use a different token or route             |
| `InsufficientFeeTokenAmount` | Not enough fee provided                      | Ensure sufficient native tokens            |
| `InvalidReceiver`            | Receiver address format invalid              | Check address format for destination chain |

> See `src/utils/ccipErrors.ts` for the complete list of 18+ CCIP error mappings.

**Implementation Example (see `src/utils/ccipErrors.ts`):**

```typescript
// Helper to get user-friendly error message
export function parseEVMError(error: unknown): ParsedCCIPError | undefined {
  const parsed = EVMChain.parse(error)
  if (!parsed) return undefined

  // Extract error name from parsed result
  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith('revert') && typeof value === 'string') {
      const match = value.match(/^(\w+)\(/) // e.g., "ChainNotAllowed(uint64...)"
      if (match) {
        return {
          errorName: match[1],
          userMessage: CCIP_ERROR_MESSAGES[match[1]] || `Transaction failed: ${value}`,
          rawParsed: parsed,
          chainType: 'evm',
        }
      }
    }
  }
}
```

## Project Structure

```
src/
├── config/
│   ├── index.ts          # Re-exports all config modules
│   ├── env.ts            # RPC URL resolution with public fallbacks
│   ├── networks.ts       # Network configs with RPCs, explorers, faucets
│   ├── tokens.ts         # Token addresses and formatting utilities
│   ├── ccipMessage.ts    # CCIP message builder utilities
│   └── wagmi.ts          # EVM wallet configuration
│
├── hooks/
│   ├── index.ts                    # Re-exports all hooks
│   ├── ChainProvider.tsx           # CCIP SDK chain init (uses fromViemClient)
│   ├── ChainContext.ts             # Chain context definition
│   ├── chainUtils.ts               # Chain utility functions
│   ├── useChains.ts                # Hook to access chain context
│   ├── useFeeEstimate.ts           # Real-time fee estimation
│   ├── useLaneLatency.ts           # Transfer time estimation
│   ├── useTokenBalance.ts          # Balance fetching
│   ├── useTokenMetadata.ts         # Token metadata fetching
│   ├── useMessageStatus.ts         # Message status polling with timeout
│   ├── useTokenPoolInfo.ts         # Pool info & rate limits
│   ├── useDestinationBalance.ts    # Destination chain balance
│   ├── useTransactionExecution.ts  # EVM & Solana transfer execution
│   ├── TransactionHistoryContext.tsx # Transaction history provider
│   ├── useTransactionHistory.ts    # Transaction history hook
│   └── transactionHistoryTypes.ts  # History context types
│
├── components/
│   ├── layout/           # Header (with history button), Footer
│   ├── bridge/           # BridgeForm, NetworkSelect, AmountInput,
│   │   │                 # PoolInfo, RateLimitDisplay, DestinationBalance,
│   │   │                 # TokenMetadata
│   │   └── sections/     # BridgeForm sub-components (NetworkSelection,
│   │                     # WalletBalance, TransferInputs, LaneInfo, etc.)
│   ├── transaction/      # TransactionStatus, TransactionHistory drawer,
│   │                     # TransactionHistoryItem, TransferBalances,
│   │                     # TransferRateLimits
│   └── ui/               # ErrorMessage, Spinner, CopyableAddress
│       └── icons/        # SVG icon components (CheckIcon, XIcon, etc.)
│
├── assets/
│   ├── chains/           # Chain logos (ethereum, solana, avalanche, base)
│   └── ccip-logo.svg     # CCIP product logo
│
├── utils/
│   ├── errors.ts         # Error categorization & user messages
│   ├── ccipErrors.ts     # CCIP-specific error parsing (uses SDK's parse())
│   ├── validation.ts     # Address validation (viem, @solana/web3.js)
│   ├── timeout.ts        # Timeout utilities
│   └── localStorage.ts   # Transaction persistence
│
└── styles/
    └── globals.css       # CSS variables and reset
```

## Supported Networks

| Network          | Chain ID | Type   | CCIP Selector        |
| ---------------- | -------- | ------ | -------------------- |
| Ethereum Sepolia | 11155111 | EVM    | 16015286601757825753 |
| Base Sepolia     | 84532    | EVM    | 10344971235874465080 |
| Avalanche Fuji   | 43113    | EVM    | 14767482510784806043 |
| Solana Devnet    | -        | Solana | 16423721717087811551 |

## Important Concepts

### Chain Selectors vs Chain IDs

CCIP uses **chain selectors** (not chain IDs) to identify networks. Chain selectors are unique identifiers assigned by CCIP that remain consistent across the protocol.

```typescript
// Wrong: Using chain ID
const destChain = 84532 // Base Sepolia chain ID

// Correct: Using CCIP chain selector
const destChainSelector = 10344971235874465080n // Base Sepolia selector
```

### Why `generateUnsignedSendMessage`?

Browser wallets (MetaMask, Phantom) don't support `signTransaction()` - they only support `sendTransaction()`. The SDK's `sendMessage()` method uses `signTransaction()` internally, which won't work in browsers.

**Solution**: Use `generateUnsignedSendMessage()` to get unsigned transactions, then sign them with your wallet provider.

### EVM Multi-Transaction Flow

For token transfers on EVM, you typically need two transactions:

1. **Approve** - Allow the CCIP Router to spend your tokens
2. **ccipSend** - Execute the cross-chain transfer

The SDK returns both in `unsignedTx.transactions[]`. Process approvals first, then the final send.

### Solana Transaction Flow

Modern wallets like Phantom automatically add compute budget and priority fee instructions when not specified by the dApp. This simplifies the transaction flow:

```typescript
// Build versioned transaction from SDK instructions
const messageV0 = new TransactionMessage({
  payerKey: walletPublicKey,
  recentBlockhash: blockhash,
  instructions: unsignedTx.instructions, // No need to add compute budget
}).compileToV0Message(unsignedTx.lookupTables)

const transaction = new VersionedTransaction(messageV0)

// Wallet automatically adds compute budget and priority fees
const signature = await sendTransaction(transaction, connection)
```

See [Phantom's priority fees documentation](https://docs.phantom.com/developer-powertools/solana-priority-fees) for details.

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
npm run typecheck  # Run TypeScript type checking
```

## Troubleshooting

### "Insufficient funds for gas"

Get testnet tokens from the faucets linked above.

### "User rejected the request"

The user cancelled the wallet prompt. Try again.

### "Transaction reverted" or CCIP-specific errors

The demo uses the SDK's error parsing to show user-friendly messages. Common errors include:

| Error Message                 | Cause                                  | Solution                                |
| ----------------------------- | -------------------------------------- | --------------------------------------- |
| "This route is not supported" | `ChainNotAllowed` - lane not enabled   | Use a different source/destination pair |
| "Rate limit reached"          | `RateLimitReached` - bucket depleted   | Try smaller amount or wait for refill   |
| "Token not supported"         | `UnsupportedToken` - token not in pool | Check supported tokens for this route   |
| "Insufficient fee"            | `InsufficientFeeTokenAmount`           | Ensure you have enough native tokens    |

**How errors are parsed:**

1. EVM: `EVMChain.parse(error)` decodes the 4-byte error selector using CCIP ABIs
2. Solana: `SolanaChain.parse(logs)` extracts error info from transaction logs

See `src/utils/ccipErrors.ts` for the implementation.

### Wallet not connecting

Make sure you have the wallet extension installed and are on a supported network.

### Adding Support for New Errors

When new CCIP versions introduce new errors, update `src/utils/ccipErrors.ts`:

```typescript
// Add to CCIP_ERROR_MESSAGES map
const CCIP_ERROR_MESSAGES: Record<string, string> = {
  // ... existing errors
  NewErrorName: 'User-friendly message for the new error',
}
```

To find the error selector for a new error:

```bash
# Using Foundry's cast
cast sig "ErrorName(paramTypes)"
# Example: cast sig "ChainNotAllowed(uint64)" => 0xa9902c7e
```

## SDK Issues & Mitigations

During development of this demo, we discovered several SDK edge cases that required workarounds. This section documents them for educational purposes and to help other developers.

> **Note:** Issues marked with ✅ will be fixed in the next SDK version.

### Issue #1: `getMessageById()` Return Type Mismatch ✅

**Problem:** `chain.getMessageById(messageId)` returns `CCIPRequest` type, but the actual API response includes additional fields (`status`, `receiptTransactionHash`).

**Mitigation:** Type helper to extend the response with missing fields.

```typescript
// src/hooks/useMessageStatus.ts
type MessageStatusFields = {
  status: (typeof MessageStatus)[keyof typeof MessageStatus]
  receiptTransactionHash?: string
}

function withStatusFields<T>(response: T): T & MessageStatusFields {
  return response as T & MessageStatusFields
}

// Usage:
const message = await chain.getMessageById(messageId).then(withStatusFields)
```

### Issue #2: Viem Adapter Type Compatibility with Wagmi

**Problem:** `fromViemClient()` expects generic `PublicClient<Transport, Chain>`, but wagmi's `getPublicClient()` returns a chain-specific typed client.

**Mitigation:** Type bridge function to cast wagmi's client to the SDK's expected type.

```typescript
// src/hooks/ChainProvider.tsx
function toGenericPublicClient(
  client: ReturnType<typeof getPublicClient>
): PublicClient<Transport, Chain> {
  return client as PublicClient<Transport, Chain>
}
```

### Issue #3a: `getTokenPoolConfigs()` Return Type Unclear ✅

**Problem:** The return type of `chain.getTokenPoolConfigs(poolAddress)` is not clearly defined in the SDK types.

**Mitigation:** Explicit type annotation.

```typescript
// src/hooks/useTokenPoolInfo.ts
const poolConfigPromise: Promise<{ token: string; router: string; typeAndVersion?: string }> =
  sourceChain.getTokenPoolConfigs(poolAddress)
```

### Issue #3b: `getTokenPoolRemotes()` Return Structure Unclear ✅

**Problem:** Returns `Record<string, TokenPoolRemote>` but this structure isn't immediately clear from IDE hints.

**Mitigation:** Safe object value extraction with defensive checks.

```typescript
// src/hooks/useTokenPoolInfo.ts
const remotesRecord: Record<string, TokenPoolRemote> = remotesResult.data
const remoteEntries = Object.values(remotesRecord)
if (remoteEntries.length > 0) {
  const remote = remoteEntries[0]
  // ... use remote safely
}
```

### Issue #3c: `RateLimiterState` Nullability ✅

**Problem:** `RateLimiterState` from `TokenPoolRemote` can be null/undefined, but this isn't always clear from the types.

**Mitigation:** Conversion helper with explicit null handling.

```typescript
// src/hooks/useTokenPoolInfo.ts
export interface RateLimitBucket {
  tokens: bigint
  capacity: bigint
  rate: bigint
  isEnabled: boolean
}

function toRateLimitBucket(state: RateLimiterState): RateLimitBucket | null {
  if (!state) return null
  return { tokens: state.tokens, capacity: state.capacity, rate: state.rate, isEnabled: true }
}
```

### Issue #4: Browser Compatibility - `setTimeout().unref()` ✅

**Problem:** The SDK's retry logic uses `setTimeout(...).unref()`, which is a Node.js-specific API that doesn't exist in browsers.

**Mitigation:** Polyfill in the app entry point.

```typescript
// src/main.tsx
if (typeof window !== 'undefined') {
  const originalSetTimeout = window.setTimeout
  window.setTimeout = function (callback, delay, ...args) {
    const id = originalSetTimeout(callback, delay, ...args)
    return Object.assign(id, {
      unref: () => {
        /* no-op in browser */
      },
    })
  }
}
```

### Issue #5: Bundle Bloat When Using `manualChunks`

**Problem:** When using Vite/Rollup's `manualChunks` to put `@chainlink/ccip-sdk` in a separate vendor chunk, tree-shaking breaks and ALL chain implementations (EVM, Solana, Sui, Aptos, TON) get bundled—even when only some are used.

**Root cause:** The `manualChunks` configuration

```javascript
// vite.config.ts - THIS BREAKS TREE-SHAKING
manualChunks: {
  'vendor-ccip': ['@chainlink/ccip-sdk'],  // ← Forces entire SDK into one chunk
}
```

When you specify a package in `manualChunks`, Vite/Rollup interprets this as "include the entire package", which:

1. Evaluates the SDK's `index.js` entry point
2. Pulls in ALL static imports (all chain implementations)
3. Defeats tree-shaking completely

**How to verify (this demo uses manualChunks, so bloat exists):**

```bash
# Build and check the vendor-ccip chunk
npm run build && ls -lh dist/assets/vendor-ccip-*.js
# Output: 3.1M dist/assets/vendor-ccip-xxx.js  (too large for just EVM + Solana)

# Confirm unused chain code is bundled:
grep -oE '"@mysten/[^"]*"' dist/assets/vendor-ccip-*.js | sort -u
# Output: @mysten/SuiClient, @mysten/transaction, etc. (Sui - we don't use!)

grep -oE 'Aptos[A-Z][a-zA-Z]*Error' dist/assets/vendor-ccip-*.js | sort -u | head -3
# Output: AptosAddressInvalidError, AptosApiError, etc. (Aptos - we don't use!)
```

**Solution:** Remove `@chainlink/ccip-sdk` from `manualChunks`

```javascript
// vite.config.ts - TREE-SHAKING WORKS
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-solana': ['@solana/web3.js', ...],
  'vendor-evm': ['wagmi', 'viem', ...],
  // Don't include @chainlink/ccip-sdk - let tree-shaking work!
}
```

**Verified results:**

| Configuration                                 | Bundle Size | Unused Chains       |
| --------------------------------------------- | ----------- | ------------------- |
| With `'vendor-ccip': ['@chainlink/ccip-sdk']` | **8.6 MB**  | Sui ✓ Aptos ✓ TON ✓ |
| Without ccip-sdk in manualChunks              | **6.5 MB**  | None (tree-shaken)  |

When removed from `manualChunks`, the SDK code is distributed across other chunks and tree-shaking eliminates unused chain implementations (~2MB saved).

**Why this demo keeps manualChunks:** For educational purposes, we intentionally keep the bloated configuration to demonstrate this issue. Production apps should remove the SDK from `manualChunks`.

**Related:** [GitHub Issue #131](https://github.com/smartcontractkit/ccip-javascript-sdk/issues/131)

### Summary Table

| Issue                               | Severity | Mitigation                     | Fixed in Next SDK    |
| ----------------------------------- | -------- | ------------------------------ | -------------------- |
| #1 `getMessageById` return type     | High     | Type helper                    | ✅ Yes               |
| #2 Viem adapter + wagmi types       | Medium   | Type cast                      | -                    |
| #3a `getTokenPoolConfigs` unclear   | Medium   | Explicit annotation            | ✅ Yes               |
| #3b `getTokenPoolRemotes` unclear   | Low      | Safe extraction                | ✅ Yes               |
| #3c `RateLimiterState` nullability  | Low      | Null check helper              | ✅ Yes               |
| #4 `setTimeout().unref()` error     | Medium   | Browser polyfill               | ✅ Yes               |
| #5 Bundle bloat with `manualChunks` | Medium   | Remove SDK from `manualChunks` | N/A (bundler config) |

## Resources

- [CCIP Documentation](https://docs.chain.link/ccip)
- [CCIP SDK npm](https://www.npmjs.com/package/@chainlink/ccip-sdk)
- [CCIP Test Tokens](https://docs.chain.link/ccip/test-tokens) - Get CCIP-BnM tokens
- [CCIP Explorer](https://ccip.chain.link/)
- [Chainlink Faucets](https://faucets.chain.link/) - Get native testnet tokens

## License

MIT
