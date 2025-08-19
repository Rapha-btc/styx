# BTC2AIBTC Bridge

A trustless Bitcoin-to-Stacks bridge for seamless participation in AI token economies. Send Bitcoin, receive AI tokens or pre-launch seats automatically.

## Overview

The BTC2AIBTC bridge enables one-way Bitcoin transactions that are automatically converted to AI tokens on the Stacks blockchain. The system intelligently routes transactions based on the current market state of the target AI project.

## Major Update: Pre-Launch Integration

We've successfully integrated pre-launch seat purchasing functionality that allows users to send Bitcoin transactions and automatically receive seats in AI token pre-launches on the Stacks blockchain, with proper fallback handling for different market states. The cross-chain bridge now seamlessly handles three scenarios: swapping through liquidity pools when tokens are bonded, purchasing directly from the bonding curve when markets are open, and buying pre-launch seats when projects are still in their initial phase, all while maintaining consistent error handling and fund safety.

## How It Works

### Transaction Flow

1. **Send Bitcoin** to the pool's Bitcoin address with encoded payload
2. **Automatic Processing** - Anyone can process your transaction on Stacks
3. **Smart Routing** - Funds are automatically directed based on project status:
   - **Bonded Tokens**: Swap through DEX liquidity pools
   - **Active Markets**: Purchase directly from bonding curves
   - **Pre-launch**: Buy seats for upcoming token launches

## Before vs After: Enhanced Functionality

### Before (Limited to 2 States)

The bridge previously only handled two scenarios:

- **Bonded projects**: Direct swaps through liquidity pools
- **Active bonding curves**: Token purchases from live markets

Users had no way to participate in projects during their pre-launch phase, missing early investment opportunities.

### After (Complete 3-State Coverage)

The enhanced bridge now supports the full project lifecycle:

#### New Pre-Launch Functionality

When projects are in pre-launch phase, the bridge executes sophisticated seat purchasing logic:

```clarity
(let ((ai-pre-allowed (get pre-contract dex-info))
      (max-seat (/ sbtc-amount-to-user PRICE-PER-SEAT)))
    (asserts! (is-eq (contract-of ai-pre) ai-pre-allowed) ERR-WRONG-PRE)
    (match (as-contract (contract-call? ai-pre buy-up-to max-seat (some ai-account)))
        actual-seat (let ((user-change (- sbtc-amount-to-user (* actual-seat PRICE-PER-SEAT))))
                      (if (> user-change u0)
                          (try! (as-contract (contract-call? 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.sbtc-token transfer
                                    user-change tx-sender ai-account none)))
                          true)
                      (ok true))
        error (begin
                (try! (as-contract (contract-call? 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.sbtc-token transfer
                        sbtc-amount-to-user tx-sender ai-account none)))
              (ok true))))
```

**This code accomplishes:**

1. **Validates Pre-Launch Contract**: Ensures the correct pre-launch contract is being used
2. **Calculates Maximum Seats**: Divides the user's sBTC amount by the fixed seat price (20,000 sats)
3. **Attempts Seat Purchase**: Calls the pre-launch contract to buy up to the maximum affordable seats
4. **Handles Partial Purchases**: If fewer seats are available than requested, calculates change
5. **Returns Excess Funds**: Automatically refunds any unused sBTC to the user's AI agent account
6. **Error Recovery**: If seat purchase fails entirely, transfers the full amount as sBTC

### Enhanced User Experience

- **Seamless Early Access**: Bitcoin holders can now participate in pre-launches without manual intervention
- **Automatic Optimization**: The system buys the maximum affordable seats and returns change
- **Risk Mitigation**: Failed purchases result in sBTC transfers rather than lost funds
- **Full Lifecycle Coverage**: One bridge handles all project phases from pre-launch to maturity

### Payload Encoding

Bitcoin transactions must include a payload with:

- `p`: Your Stacks principal (receiver address)
- `a`: Minimum amount out (slippage protection)
- `d`: DEX ID (identifies which AI project to target)

## Key Features

- **Trustless Operation** - No centralized operators needed for processing
- **Multi-State Support** - Handles pre-launch, active, and bonded token phases
- **AI Agent Integration** - Automatically deposits to your AI agent account
- **Slippage Protection** - Minimum output amounts prevent bad trades
- **Emergency Controls** - Pause mechanisms and refund capabilities
- **Fee Management** - Dynamic fees based on transaction size

## Pool Management

### Operator Functions

- Initialize pools with sBTC liquidity
- Add/remove liquidity with time delays
- Set fees and deposit limits
- Signal withdrawals with cooldown periods

### Governance

- Multi-signature approval system for new DEX allowlisting
- Emergency stop capabilities
- Transparent fee structure

## Safety Features

- **Cooldown Periods** - Prevent rapid parameter changes
- **Transaction Verification** - Bitcoin SPV proofs required
- **Refund System** - Failed transactions can be refunded
- **Emergency Pause** - Stop swaps if issues detected

## Error Handling

The system gracefully handles various failure scenarios:

- Insufficient liquidity fallback to direct token transfers
- Slippage protection with automatic refunds
- Invalid payload handling with fund recovery options

## Technical Details

Built on Clarity smart contracts with direct Bitcoin state reading capabilities. Supports both legacy and SegWit Bitcoin transactions with comprehensive proof verification.

---

_For developers: See contract source for detailed implementation and integration examples._
