# BTC2sBTC AI BTC Bridge Contract

## Overview

The BTC2sBTC contract provides a trustless bridge from Bitcoin to AI BTC tokens on the Stacks ecosystem. This enhanced version includes specialized functionality for AI BTC DAO use cases, with both direct sBTC deposits and automatic swapping to AI BTC tokens.

## Key Features

- **Direct BTC to sBTC deposits** with AI account verification
- **BTC to AI BTC token swaps** via allowlisted DEX pairs
- **Governance-controlled allowlist** for FT/DEX pairs (3-of-5 multisig)
- **Emergency controls** for security
- **Pool management** with operator controls
- **Refund mechanisms** for failed transactions

## Main Changes from Original BTC2sBTC Contract

### 1. AI Account Integration

- All deposit/swap functions now require AI account verification
- Payloads must contain the AI account owner's principal
- Added `ai-account` trait parameter to processing functions
- Frontend enforces AI account ownership before allowing deposits

### 2. Enhanced Swap Functionality

- New `swap-btc-to-aibtc` and `swap-btc-to-aibtc-legacy` functions
- Automatic DEX integration for BTC → AI BTC token conversion
- Slippage protection with `min-amount-out` parameter
- Fallback to direct sBTC transfer if swap fails or insufficient output

### 3. Governance & Security Controls

#### Allowlist Management

- **3-of-5 multisig approval** for adding FT/DEX pairs
- **Single approver removal** for emergency cleanup
- **7-day approval window** with auto-execution at 3 signals

#### Emergency Controls

- **One-way emergency stop** - any approver can permanently pause swaps
- **Immediate removal** of malicious FT/DEX pairs
- **No unpause capability** - requires contract redeployment for recovery

### 4. Payload Structure

Both deposit and swap functions use the same payload format:

```clarity
{ p: principal, amount: uint }
```

- `p`: AI account owner principal (verified against AI account)
- `amount`: For swaps = minimum tokens out, for deposits = unused

This ensures users can always fall back to deposits if swap parameters are invalid (ft/dex not allowed).

## Function Categories

### Core Processing Functions

#### Direct Deposits

- `process-btc-deposit` (SegWit)
- `process-btc-deposit-legacy` (Legacy)

Converts BTC directly to sBTC with AI account verification.

#### Swap Functions

- `swap-btc-to-aibtc` (SegWit)
- `swap-btc-to-aibtc-legacy` (Legacy)

Converts BTC to AI BTC tokens via allowlisted DEX, with fallback to sBTC.

### Governance Functions

#### Allowlist Management

- `propose-allowlist-pair(ft-contract, dex-contract)` - Propose new FT/DEX pair
- `signal-allowlist-approval(proposal-id)` - Signal approval (3-of-5 required)
- `remove-allowlist-pair(ft-contract)` - Remove pair (any approver)

#### Emergency Controls

- `emergency-stop-swaps()` - Permanently pause all swaps (any approver)

- **Pool Management (Operator Only)**: Pool setup, liquidity management, parameter updates
- `initialize-pool(sbtc-amount, btc-receiver)` - Initial setup
- `add-liquidity-to-pool(sbtc-amount, btc-receiver?)` - Add sBTC liquidity
- `signal-withdrawal()` / `withdraw-from-pool()` - Remove liquidity
- `set-params(max-deposit, fee, fee-threshold)` - Update parameters

- **Refund System**: Request and process BTC refunds for failed transactions
- `request-refund(btc-refund-receiver, ...)` - Request BTC refund
- `process-refund(refund-id, ...)` - Process refund with proof

## Security Model

### Governance Structure

- **5 Approvers**: Hardcoded in `is-approver` function
- **3-of-5 Threshold**: Required for allowlist additions
- **7-Day Window**: Proposals expire after 1008 blocks
- **Single Approver**: Can remove pairs or trigger emergency stop

### AI Account Verification

- All transactions verify `stx-receiver` matches AI account owner
- Frontend prevents deposits without valid AI accounts
- Contract enforces verification on-chain during processing

### Emergency Response

1. **Malicious DEX detected** → Any approver calls `emergency-stop-swaps()`
2. **Clean up** → Any approver calls `remove-allowlist-pair(ft-contract)`
3. **Recovery** → Deploy new contract if needed (no unpause mechanism)

## Fee Structure

- **Variable fees** based on deposit size
- **Fee threshold**: Deposits ≤ threshold pay 50% fee
- **Maximum fee**: Capped at `FIXED_FEE` (21,000 sats)

## Integration Notes

### Frontend Requirements

- Must verify user has AI BTC account before allowing deposits
- Should check allowlist status for swap functionality
- Must handle both swap and deposit payload formats

### Payload Construction

```javascript
// For swaps (with slippage protection)
const payload = { p: aiAccountOwner, amount: minTokensOut };

// For deposits (amount ignored)
const payload = { p: aiAccountOwner, amount: 0 };
```

### Error Handling

- Swap failures automatically fall back to sBTC transfer
- Insufficient slippage falls back to sBTC transfer
- Users always receive value (either tokens or sBTC)

## Constants

- `MIN_SATS`: 10,000 (minimum deposit)
- `COOLDOWN`: 6 blocks (processing cooldown)
- `APPROVAL_WINDOW`: 1,008 blocks (7 days)
- `SIGNALS_REQUIRED`: 3 (out of 5 approvers)
- `WITHDRAWAL_COOLOFF`: 144 blocks (1 day)

## Read-Only Functions

- `get-pool()` - Pool status and parameters
- `get-dex-allowed(ft-contract)` - Check if FT/DEX pair is allowlisted
- `are-swaps-paused()` - Check emergency stop status
- `is-approver(who)` - Check if address is an approver
- `get-allowlist-proposal(proposal-id)` - Get proposal details
- `is-tx-processed(tx-id)` - Check if BTC transaction was processed
