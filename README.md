# Styx Documentation

## Overview

Styx is a fast, trustless bridge that enables Bitcoin to Stacks (BTC to sBTC) transfers without requiring intermediaries. It leverages Clarity's native Bitcoin state reading capabilities to provide quick and reliable transfers.

## How It Works

1. **Deposit Process**:
   - User sends BTC to the designated Bitcoin address
   - Include your Stacks address in the transaction using the proper format
   - The Styx contract verifies the Bitcoin transaction on the Bitcoin blockchain
   - Once verified, sBTC tokens are automatically released to your Stacks wallet

2. **Core Features**:
   - **Trustless**: No intermediaries or centralized services required
   - **Fast**: Quick verification and processing
   - **Transparent**: All operations are on-chain and verifiable
   - **Self-service**: Anyone can process a deposit once the Bitcoin transaction is confirmed

## Transaction Fees

- Minimum deposit: 10,000 satoshis
- Fee structure:
  - Standard fee: 6,000 satoshis
  - Discounted fee: 3,000 satoshis (for transactions below the threshold)
  - Maximum deposit: Configurable by the operator

## Technical Operations

### For Users
- Send BTC to the pool's Bitcoin address
- Include your Stacks address in the transaction's OP_RETURN data
- Wait for Bitcoin confirmation
- Anyone (including you) can call `process-btc-deposit` to release sBTC to your wallet
- Your sBTC appears in your Stacks wallet automatically after processing

### For Operators
- Manage liquidity through `add-liquidity-to-pool`
- Set parameters including fees and maximum deposit amounts
- Signal and execute withdrawals after the required cooldown period

### For Developers
- Support for both SegWit and Legacy Bitcoin transactions
- Bitcoin transaction verification through on-chain proofs
- Comprehensive error handling and state management

## Edge Cases

The contract includes refund functionality for cases where deposits cannot be processed:
- Users can request refunds by providing proof of their original BTC transaction
- The operator processes refunds by returning BTC to the designated address
- A cooldown period applies to all refund operations

## Security Features

- Withdrawal cooldown period: 144 blocks (approximately 24 hours)
- Operation cooldown: 6 blocks
- Proper post-conditions to secure token transfers
- Multi-step process for critical operations (signal → execute)

---

**Note**: This contract maintains a pool of sBTC liquidity that enables instant transfers. When you deposit BTC, you receive sBTC from this pool, making the process much faster than traditional cross-chain operations.
