/**
 * CCIP Message Types
 *
 * Shared type definitions for CCIP messages used across the application.
 * This ensures consistency between fee estimation and message sending.
 */

/**
 * Token amount for CCIP transfers
 */
export interface CCIPTokenAmount {
  /** Token contract address */
  token: string
  /** Amount in smallest unit (wei for ERC20, lamports for SPL) */
  amount: bigint
}

/**
 * CCIP Message structure
 *
 * Used for both fee estimation (getFee) and sending (generateUnsignedSendMessage).
 * Building the message once ensures consistency and reduces duplication.
 */
export interface CCIPMessage {
  /** Receiver address on destination chain */
  receiver: string
  /** Arbitrary data payload (use '0x' for token-only transfers) */
  data: string
  /** Tokens to transfer */
  tokenAmounts: CCIPTokenAmount[]
  /** Extra arguments for execution */
  extraArgs: {
    /** Gas limit for destination execution (0n = auto-calculate) */
    gasLimit: bigint
  }
}

/**
 * Build a CCIP message for token transfers
 *
 * @example
 * const message = buildCCIPMessage({
 *   receiver: '0x123...',
 *   tokenAddress: '0xabc...',
 *   amount: parseUnits('10', tokenDecimals), // Use token's actual decimals
 * })
 *
 * // Use for fee estimation
 * const fee = await chain.getFee({ router, destChainSelector, message })
 *
 * // Use for sending (with fee added)
 * await chain.generateUnsignedSendMessage({
 *   sender, router, destChainSelector,
 *   message: { ...message, fee }
 * })
 */
export function buildCCIPMessage({
  receiver,
  tokenAddress,
  amount,
  data = '0x',
  gasLimit = 0n,
}: {
  receiver: string
  tokenAddress: string
  amount: bigint
  data?: string
  gasLimit?: bigint
}): CCIPMessage {
  return {
    receiver,
    data,
    tokenAmounts: [{ token: tokenAddress, amount }],
    extraArgs: { gasLimit },
  }
}
