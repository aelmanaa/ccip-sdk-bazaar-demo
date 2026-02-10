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

### 4. Balance Queries

```typescript
// Get native token balance (ETH, AVAX, SOL)
const nativeBalance = await chain.getBalance({ holder: walletAddress })

// Get ERC20/SPL token balance
const tokenBalance = await chain.getBalance({
  holder: walletAddress,
  token: tokenAddress,
})

console.log(`Native: ${formatEther(nativeBalance)} ETH`)
console.log(`Token: ${formatUnits(tokenBalance, tokenDecimals)}`)
```

> See `src/hooks/useTokenBalance.ts` for the complete implementation with periodic refresh.

### 5. Generate Unsigned Transaction (Browser Wallet Compatible)

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

### 6. Token Pool Introspection

Query token pool configuration and rate limits for a specific lane:

```typescript
import { EVMChain, SolanaChain } from '@chainlink/ccip-sdk'

// Step 1: Get Token Admin Registry for the router
const registryAddress = await chain.getTokenAdminRegistryFor(routerAddress)

// Step 2: Get token configuration (pool address) from registry
const tokenConfig = await chain.getRegistryTokenConfig(registryAddress, tokenAddress)
const poolAddress = tokenConfig.tokenPool

// Step 3: Get pool configuration (type and version)
// Use instanceof narrowing for full type safety
if (chain instanceof EVMChain) {
  const poolConfig = await chain.getTokenPoolConfig(poolAddress)
  console.log(`Pool type: ${poolConfig.typeAndVersion}`) // e.g., "BurnMintTokenPool 1.5.0"
} else if (chain instanceof SolanaChain) {
  const poolConfig = await chain.getTokenPoolConfig(poolAddress)
  console.log(`Pool type: ${poolConfig.typeAndVersion ?? 'Unknown'}`)
  // Solana-specific: poolConfig.tokenPoolProgram
}

// Step 4: Get remote chain configuration and rate limits
const remotes = await chain.getTokenPoolRemotes(poolAddress, destChainSelector)

// Extract rate limit information
const remote = Object.values(remotes)[0]
if (remote) {
  console.log(`Remote token: ${remote.remoteToken}`)
  console.log(`Remote pools: ${remote.remotePools.join(', ')}`)

  // Rate limits (null if disabled)
  if (remote.outboundRateLimiterState) {
    const { tokens, capacity, rate } = remote.outboundRateLimiterState
    console.log(`Outbound: ${tokens}/${capacity} tokens, refill ${rate}/sec`)
  }
  if (remote.inboundRateLimiterState) {
    const { tokens, capacity, rate } = remote.inboundRateLimiterState
    console.log(`Inbound: ${tokens}/${capacity} tokens, refill ${rate}/sec`)
  }
}
```

> See `src/hooks/useTokenPoolInfo.ts` for the complete implementation with rate limit display.

### 7. Message Status Tracking

```typescript
// After sending, get the message ID from the transaction
const messages = await chain.getMessagesInTx(txHash)
const messageId = messages[0].message.messageId

// Poll status until final
const status = await chain.getMessageById(messageId)
// status.metadata.status: MessageStatus enum value
```

### 8. Message Lifecycle

The SDK provides a `MessageStatus` enum for tracking message state:

```typescript
import { MessageStatus } from '@chainlink/ccip-sdk'

// Full lifecycle stages
MessageStatus.Unknown // Initial/unknown state
MessageStatus.Sent // Transaction submitted on source chain
MessageStatus.SourceFinalized // Source chain reached finality
MessageStatus.Committed // DON committed merkle root to destination
MessageStatus.Blessed // Risk Management Network approved the message
MessageStatus.Verifying // Verifying message on destination chain
MessageStatus.Verified // Message verified, ready for execution
MessageStatus.Success // Transfer completed successfully
MessageStatus.Failed // Execution failed (can be retried)

// Compare status
const message = await chain.getMessageById(messageId)
const status = message.metadata?.status

if (status === MessageStatus.Success) {
  console.log('Transfer complete!')
} else if (status === MessageStatus.Failed) {
  console.log('Transfer failed, may need manual retry')
}
```

> See `src/hooks/useMessageStatus.ts` for the complete polling implementation with React Query.

### 9. CCIP Explorer Links

```typescript
import { getCCIPExplorerUrl } from '@chainlink/ccip-sdk'

// Generate links for tracking
const messageUrl = getCCIPExplorerUrl('msg', messageId)
// => 'https://ccip.chain.link/msg/0x...'

const txUrl = getCCIPExplorerUrl('tx', txHash)
// => 'https://ccip.chain.link/tx/0x...'
```

### 10. Error Handling

The SDK provides comprehensive error handling with the `CCIPError` class and chain-specific error parsing.

#### CCIPError Class

```typescript
import { CCIPError, CCIPMessageIdNotFoundError, getRetryDelay } from '@chainlink/ccip-sdk'

// Type guard to check if an error is a CCIP SDK error
if (CCIPError.isCCIPError(error)) {
  // Access error properties
  console.log(error.message) // Error message
  console.log(error.isTransient) // true if error is temporary (retry may help)
  console.log(error.retryAfterMs) // Suggested retry delay in milliseconds
  console.log(error.recovery) // Recovery suggestion text

  // Use SDK utility for retry delay
  const delay = getRetryDelay(error)
  if (delay !== null) {
    await new Promise((resolve) => setTimeout(resolve, delay))
    // Retry the operation...
  }
}

// CCIPMessageIdNotFoundError - expected during early polling
// The message may not be indexed immediately after transaction
try {
  const message = await chain.getMessageById(messageId)
} catch (error) {
  if (error instanceof CCIPMessageIdNotFoundError) {
    // Expected - message not indexed yet, keep polling
    console.log('Message not found yet, will retry...')
  }
}
```

> See `src/utils/errors.ts` for the complete error categorization implementation.

#### Error Parsing (EVM and Solana)

The SDK also provides chain-specific error parsing utilities to decode CCIP-specific errors:

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

### 11. SDK Types

Key TypeScript types provided by the SDK (TypeScript infers these from SDK method return types):

```typescript
// RateLimiterState - Token bucket rate limiter state
// null if rate limiting is disabled for the lane
type RateLimiterState = {
  tokens: bigint // Current tokens available in bucket
  capacity: bigint // Maximum bucket capacity
  rate: bigint // Refill rate (tokens per second)
} | null

// TokenPoolRemote - Remote chain pool configuration
// Returned by chain.getTokenPoolRemotes()
interface TokenPoolRemote {
  remoteToken: string // Token address on remote chain
  remotePools: string[] // Pool addresses on remote chain
  inboundRateLimiterState: RateLimiterState // Inbound rate limit (null if disabled)
  outboundRateLimiterState: RateLimiterState // Outbound rate limit (null if disabled)
}
```

> See `src/hooks/useTokenPoolInfo.ts` for usage examples with rate limit display.

### 12. Solana-Specific: Transaction Fetching

For Solana, use `chain.getTransaction()` to fetch transaction details before extracting messages:

```typescript
// Solana: Get transaction details from signature
const tx = await chain.getTransaction(signature)

// Then extract messages from the transaction
const messages = await chain.getMessagesInTx(tx)
const messageId = messages[0]?.message.messageId
```

> See `src/hooks/useTransactionExecution.ts:308` for the complete Solana flow.

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

> **SDK Version:** This demo uses `@chainlink/ccip-sdk@0.96.0`. Issues marked with ✅ FIXED have been resolved in this version.

### Issue #1: `getMessageById()` Return Type Mismatch ✅ FIXED in v0.96.0

**Problem:** In v0.95.0, `chain.getMessageById(messageId)` returned `CCIPRequest` type, but the actual API response included additional fields (`status`, `receiptTransactionHash`).

**Solution in v0.96.0:** Status fields are now properly typed in the `metadata` property:

```typescript
// src/hooks/useMessageStatus.ts
const message = await chain.getMessageById(messageId)

// Access via metadata field (SDK v0.96.0+)
const status = message.metadata?.status ?? MessageStatus.Unknown
const destTxHash = message.metadata?.receiptTransactionHash ?? null
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

### Issue #3a: `getTokenPoolConfig()` Return Type ✅ FIXED in v0.96.0

**Problem:** In v0.95.0, the method was named `getTokenPoolConfigs()` (plural) and return type was unclear.

**Solution in v0.96.0:** Method renamed to `getTokenPoolConfig()` (singular) with clear types. Use `instanceof` narrowing (SDK-recommended best practice) for full type safety:

```typescript
// src/hooks/useTokenPoolInfo.ts
// Best practice: instanceof narrowing gives full type safety
if (sourceChain instanceof SolanaChain) {
  const result = await withTimeout(
    sourceChain.getTokenPoolConfig(poolAddress),
    timeout,
    'Solana pool config'
  )
  // TypeScript knows: result.data.tokenPoolProgram exists (Solana-specific)
  typeAndVersion = result.data.typeAndVersion ?? 'Unknown'
} else if (sourceChain instanceof EVMChain) {
  const result = await withTimeout(
    sourceChain.getTokenPoolConfig(poolAddress),
    timeout,
    'EVM pool config'
  )
  // TypeScript knows: result.data.typeAndVersion is guaranteed string
  typeAndVersion = result.data.typeAndVersion
}
```

### Issue #3b: `getTokenPoolRemotes()` Return Structure ✅ FIXED in v0.96.0

**Problem:** In v0.95.0, the `Record<string, TokenPoolRemote>` return structure wasn't clear from IDE hints.

**Solution in v0.96.0:** Types are now clear. Code uses safe object value extraction:

```typescript
// src/hooks/useTokenPoolInfo.ts
const remotes = remotesResult.data
const remoteEntries = Object.values(remotes)
if (remoteEntries.length > 0) {
  const remote = remoteEntries[0]
  // ... use remote safely
}
```

### Issue #3c: `RateLimiterState` Nullability ✅ FIXED in v0.96.0

**Problem:** In v0.95.0, `RateLimiterState` nullability wasn't always clear from the types.

**Solution in v0.96.0:** SDK now types `RateLimiterState` as `{ ... } | null`. Our helper adds domain value with `isEnabled` flag:

```typescript
// src/hooks/useTokenPoolInfo.ts
export interface RateLimitBucket {
  tokens: bigint
  capacity: bigint
  rate: bigint
  isEnabled: boolean // Derived from RateLimiterState !== null
}

function toRateLimitBucket(state: RateLimiterState): RateLimitBucket | null {
  if (!state) return null
  return { tokens: state.tokens, capacity: state.capacity, rate: state.rate, isEnabled: true }
}
```

### Issue #4: Browser Compatibility - `setTimeout().unref()` ✅ FIXED in v0.96.0

**Problem:** In v0.95.0, the SDK's retry logic used `setTimeout(...).unref()`, which is a Node.js-specific API that doesn't exist in browsers.

**Solution in v0.96.0:** SDK now uses optional chaining (`unref?.()`), making browser polyfill unnecessary.

```typescript
// No polyfill needed in v0.96.0!
// SDK internally uses: timer.unref?.()
```

### Issue #5: Bundle Bloat When Using `manualChunks`

**Problem:** When using Vite/Rollup's `manualChunks` to put `@chainlink/ccip-sdk` in a separate vendor chunk, tree-shaking breaks and ALL chain implementations get bundled.

**Good news in v0.96.0:** Bundle size significantly improved! The `vendor-ccip` chunk reduced from **3.2 MB** (v0.95.0) to **1.0 MB** (v0.96.0) - a **68% reduction**.

**Root cause:** The `manualChunks` configuration

```javascript
// vite.config.ts - THIS BREAKS TREE-SHAKING
manualChunks: {
  'vendor-ccip': ['@chainlink/ccip-sdk'],  // ← Forces entire SDK into one chunk
}
```

**How to verify:**

```bash
# Build and check the vendor-ccip chunk
npm run build && ls -lh dist/assets/vendor-ccip-*.js
# v0.96.0 Output: ~1.0M dist/assets/vendor-ccip-xxx.js (reduced from 3.2M in v0.95.0)
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

**Bundle size comparison (with `manualChunks`):**

| SDK Version | vendor-ccip Size | Improvement |
| ----------- | ---------------- | ----------- |
| v0.95.0     | 3.2 MB           | -           |
| v0.96.0     | 1.0 MB           | **68%** ↓   |

**Why this demo keeps manualChunks:** For educational purposes, we intentionally keep the configuration to demonstrate this issue. Production apps should remove the SDK from `manualChunks`.

**Related:** [GitHub Issue #131](https://github.com/smartcontractkit/ccip-javascript-sdk/issues/131)

### Summary Table

| Issue                               | Severity | Status in v0.96.0      | Action                     |
| ----------------------------------- | -------- | ---------------------- | -------------------------- |
| #1 `getMessageById` return type     | High     | ✅ Fixed               | Use `metadata` field       |
| #2 Viem adapter + wagmi types       | Medium   | ❌ Still needed        | Keep type cast             |
| #3a `getTokenPoolConfig` types      | Medium   | ✅ Fixed               | Method renamed to singular |
| #3b `getTokenPoolRemotes` types     | Low      | ✅ Fixed               | Types now clear            |
| #3c `RateLimiterState` nullability  | Low      | ✅ Fixed               | Explicit `\| null` type    |
| #4 `setTimeout().unref()` error     | Medium   | ✅ Fixed               | Polyfill removed           |
| #5 Bundle bloat with `manualChunks` | Medium   | Improved (68% smaller) | Remove SDK from chunks     |

## Resources

- [CCIP Documentation](https://docs.chain.link/ccip)
- [CCIP SDK npm](https://www.npmjs.com/package/@chainlink/ccip-sdk)
- [CCIP Test Tokens](https://docs.chain.link/ccip/test-tokens) - Get CCIP-BnM tokens
- [CCIP Explorer](https://ccip.chain.link/)
- [Chainlink Faucets](https://faucets.chain.link/) - Get native testnet tokens

## License

MIT
