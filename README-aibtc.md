# BTC2sBTC AI Bridge Pool Contract

## Overview

The BTC2sBTC Pool Contract provides a trustless bridge from Bitcoin to AI economies on the Stacks ecosystem. It supports direct sBTC deposits and automatic swapping to AI BTC tokens via governance-approved DEX/Pool pairs.

## Key Features

- **🔗 Bitcoin to sBTC Bridge** - Direct BTC deposits with AI account verification
- **🔄 Smart Token Swaps** - Automatic routing to AI tokens via approved trading pairs
- **🏛️ Governance Controls** - 3-of-5 multisig approval for new trading pairs
- **🚨 Emergency Security** - Immediate swap halt capability
- **💧 Pool Management** - Operator-controlled liquidity and parameters
- **↩️ Refund System** - Bitcoin-verified refund mechanisms
- **⚡ Adaptive Routing** - Supports both DEX and AMM pool integrations

## Core Functions

### Token Swaps

**Primary Functions**:

- `swap-btc-to-aibtc(...)` - SegWit BTC → AI tokens
- `swap-btc-to-aibtc-legacy(...)` - Legacy BTC → AI tokens

**Smart Routing**:

- Automatically detects if tokens are bonded (use AMM) or unbonded (use DEX)
- Falls back to sBTC transfer if swap fails
- Slippage protection via minimum amount out

### Direct Deposits

- `process-btc-deposit(...)` - SegWit BTC → sBTC
- `process-btc-deposit-legacy(...)` - Legacy BTC → sBTC

All deposits require AI account verification.

### Governance

**Allowlist Management**:

```clarity
propose-allowlist-dexes(ft-contract, dex-contract, pool-contract)
signal-allowlist-approval(proposal-id)
```

- Propose new trading pairs
- 3-of-5 approver threshold for activation
- 7-day review period
- **Immutable mappings** - approved proposal IDs cannot be removed or amended with different tokens (prevents operator rug mechanisms)

**Emergency Controls**:

```clarity
emergency-stop-swaps()
```

- Any approver can permanently halt swaps (deposits remain functional)
- Users always receive value via `process-btc-deposit` functions - not a rug vector for operators
- Protects pool from depletion if malicious tokens/DEXs bypass allowlist approval
- No unpause mechanism (requires redeployment)

### Pool Operations

**Operator Functions**:

- `initialize-pool()` - One-time setup by operator (can only be called once)
- `add-liquidity-to-pool()` - Add sBTC liquidity
- `set-params()` - Update fees and limits
- `withdraw-from-pool()` - Remove liquidity

All operations include cooldown periods for security.

## Integration

### Payload Format

```javascript
{
  p: aiAccountContractPrincipal,  // AI account to receive tokens/sBTC
  a: minimumAmountOut,           // Slippage protection for swaps
  d: proposalId                  // Approved trading pair identifier
}
```

### Frontend Requirements

1. Verify user has valid AI account
2. Check dex-id is approved via `get-dex-allowed(dex-id)`
3. Handle emergency stop status via `are-swaps-paused()`
4. Implement fallback for swap failures

### Error Handling

- Invalid proposal ID → Transaction fails
- Swap failure → Automatic sBTC transfer
- Slippage protection triggered → Automatic sBTC transfer
- Emergency stop → Swaps disabled, deposits still functional

## Security Model

### Governance Structure

**5 Approvers** (hardcoded):

- `SP6SA6BTPNN5WDAWQ7GWJF1T5E2KWY01K9SZDBJQ`
- `SP3VES970E3ZGHQEZ69R8PY62VP3R0C8CTQ8DAMQW`
- `SP3PEBWZ8PQK1M82MS4DVD3V9DE9ZS6F25S6PEF0R`
- `SPP3HM2E4JXGT26G1QRWQ2YTR5WT040S5NKXZYFC`
- `SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22`

**Requirements**:

- 3 signatures to approve new trading pairs
- 1 signature to emergency stop ALL swaps (anti-rug protection)
- 7-day window for proposal review

### Protection Mechanisms

- **Immutable Mappings**: Proposal → contract mappings never change
- **AI Account Verification**: Bitcoin OP_RETURN specifies AI account contract; verified on-chain that user controls that account
- **Emergency Halt**: Immediate swap disable capability (deposit fallback prevents operator rug)
- **Cooldown Periods**: Prevent rapid parameter changes

## Fee Structure

- **Dynamic Fees**: Configurable by operator via `set-params()`
- **Current Default**: 6,000 sats standard fee, 3,000 sats for deposits ≤ 203,000 sats
- **Fee Validation**: Must be ≤ 21,000 sats when setting parameters
- **Fee Split**: Between platform and liquidity providers (implementation pending)

## Configuration

**Key Parameters**:

- Minimum deposit: 10,000 sats
- Processing cooldown: 6 blocks
- Approval window: 1,008 blocks (7 days)
- Withdrawal cooldown: 144 blocks (1 day)
- Signals required: 3 of 5 approvers

## Read-Only Functions

**Pool Status**:

- `get-pool()` - Pool parameters and balances
- `is-pool-initialized()` - Setup status
- `are-swaps-paused()` - Emergency stop status

**Governance**:

- `get-dex-allowed(dex-id)` - Check if AI token/DEX/pool combination is approved
- `get-allowlist-proposal(proposal-id)` - Proposal details
- `is-approver(address)` - Check approver status

**Transactions**:

- `is-tx-processed(tx-id)` - Check Bitcoin transaction status
- `get-processed-tx(tx-id)` - Transaction details

**Refunds**:

- `get-refund-request(refund-id)` - Refund request details
- `get-refund-count()` - Total refund requests
