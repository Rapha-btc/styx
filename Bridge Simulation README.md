# Bridge Simulation - Complete Test Suite

This simulation demonstrates the complete functionality of the BTC→AI BTC bridge system, testing all three routing mechanisms in sequence.

## Overview

The bridge contract provides three different routing mechanisms depending on market conditions:

1. **Prelaunch routing** - Direct seat purchases during prelaunch phase
2. **DEX routing** - Large purchases during DEX bonding phase
3. **Bitflow AMM routing** - Post-bonding swaps through XYK pool

## Simulation Flow

### Phase 1: Setup and Funding (Steps 1-6)

- **Steps 1-3**: Transfer sBTC to agent owners and operator
- **Step 4**: Add 10M sBTC liquidity to bridge pool
- **Steps 5-6**: Set up DEX allowlisting (proposal + approval)

### Phase 2: Prelaunch Phase (Steps 7-16)

- **Steps 7-8**: 2 registered agent owners buy via bridge (2 seats each via `swap-btc-to-aibtc`)
- **Steps 9-15**: 7 individual buyers purchase directly from prelaunch (2 seats each via `buy-up-to`)
- **Step 16**: 10th buyer completes prelaunch at 20 total seats
  - Prelaunch distributes accumulated funds
  - Market opens and becomes available for DEX trading

### Phase 3: DEX Trading Phase (Step 17-18)

- **Step 17**: Verify market is open
- **Step 18**: Large 5.2M sat purchase routes through DEX
  - Complex DEX bonding process
  - XYK pool creation with liquidity provision
  - AI agent receives 12.8 trillion FAKE2 tokens

### Phase 4: Bitflow AMM Phase (Step 19)

- **Step 19**: 300k sat purchase uses XYK pool via `swap-x-for-y`
  - Bridge successfully calls Bitflow AMM
  - AI agent receives 128 billion FAKE2 tokens from swap
  - Pool balances update correctly

### Phase 5: Final Verification (Steps 20-25)

- **Step 20**: Confirm market still open
- **Steps 21-25**: Check final balances across all contracts

## Key Technical Details

### Contract Addresses

- **Bridge**: `SP29D6YMDNAKN1P045T6Z817RTE1AC0JAA99WAX2B.btc2sbtc-simul`
- **Agent Registry**: `SP29D6YMDNAKN1P045T6Z817RTE1AC0JAA99WAX2B.agent-account-registry`
- **sBTC Token**: `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`
- **Test Token**: `SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.fake2-faktory`
- **XYK Pool**: `SP2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5E4R0JRM.xyk-pool-sbtc-fake2-v-1-1`

### Agent System

- Only registered agent owners can call `swap-btc-to-aibtc`
- Bridge looks up AI agent accounts via the registry
- Tokens/change are transferred to the AI agent account, not the caller

### Critical Parameters

- **min-amount-out**: Must be > 0 for Bitflow AMM swaps (use `uintCV(1)` minimum)
- **Seat price**: 20k sats per seat in prelaunch
- **Bridge fees**: 6% total (3% service + 3% LP fee)

## Expected Results

After successful execution:

- **20 seats purchased** (2 via bridge + 18 via prelaunch)
- **Market opens** after prelaunch completion
- **DEX bonding** creates XYK pool with liquidity
- **AMM swaps** route through Bitflow successfully
- **All three routing mechanisms** demonstrated working

## Final State

- Bridge: 4.4M sBTC remaining (from 10M initial)
- XYK Pool: 5.5M sBTC liquidity
- Agent accounts: Hold appropriate tokens/change
- Market: Open for continued trading

This simulation validates the complete bridge functionality from prelaunch through DEX graduation to AMM trading.
