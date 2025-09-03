# BTC to AI BTC Bridge - Test Suite Documentation

This test suite validates the core functionality of the BTC to AI BTC bridge smart contract, ensuring secure and reliable bridging from Bitcoin to AI token economies.

## Test Overview

The test suite covers 11 comprehensive test cases organized into 4 main categories:

### 1. Pool Setup and Allowlist (3 tests)

### 2. Swap Function Validation (4 tests)

### 3. Error Handling and Security (4 tests)

---

## Pool Setup and Allowlist Tests

### ✅ Pool Initialization Test

**Validates**: Basic pool setup and configuration

- Pool successfully initializes with 690M satoshis (6.9 sBTC)
- Pool state is retrievable and well-formed
- Contract deployment and basic functionality

### ✅ Environment Differences Test

**Validates**: Test environment consistency

- Simnet blockchain is running (block height > 0)
- Contract addresses are properly set
- Pool state remains consistent across test runs

### ✅ DEX Allowlist Setup Test

**Validates**: Multi-signature allowlist mechanism

- Proposal creation by authorized approvers
- Multi-signature approval process (requires 2 out of 5 approvers)
- DEX contracts are properly allowlisted for trading

---

## Swap Function Validation Tests

### ✅ Single Agent Swap Test (Prelaunch Phase)

**Validates**: Basic swap functionality during prelaunch
**Input**: 50,000 sats BTC deposit for 1 agent
**Expected Flow**:

1. **Fee Calculation**: max(3,000 sats, 1% of 50,000) = max(3,000, 500) = **3,000 sats total fee**
   - 1,500 sats → Service provider (50% of total fee)
   - 1,500 sats → LP operator (50% of total fee)
2. **After Fees**: 47,000 sats available for user
3. **Seat Purchase**: 2 seats × 20,000 sats = 40,000 sats
4. **Change Return**: 7,000 sats sent to AI agent account

### ✅ Multi-Agent Prelaunch Completion Test

**Validates**: Complete prelaunch phase with all 10 agents
**Input**: 10 swaps × 50,000 sats = 500,000 sats total
**Expected Outcome**:

- All 10 AI agents (an-agent through an-agent-10) each get 2 seats
- Total seats sold: 20 seats × 20,000 = 400,000 sats
- Prelaunch phase completes after all agents participate
- Market transitions from prelaunch to DEX phase

### ✅ DEX Phase Trading Test

**Validates**: Trading on DEX after prelaunch completion
**Input**: 5.1M sats (5M + 2% fees) to complete DEX target
**Expected Flow**:

- Market is open for DEX trading
- DEX bonding curve handles large purchase
- Tokens purchased and transferred to AI agent
- DEX target reached, market transitions to AMM pool

### ✅ AMM Pool Trading Test

**Validates**: Final phase - AMM pool trading
**Input**: Standard swap amount after pool activation
**Expected Flow**:

- AMM pool is active and bonded
- Liquidity pool handles token swaps
- Price discovery through automated market maker
- Slippage protection and minimum output respected

---

## Error Handling and Security Tests

### ✅ Emergency Stop Test

**Validates**: Critical security pause mechanism

- Authorized operator can trigger emergency stop
- `swaps-paused` flag is correctly set to `true`
- All subsequent swaps fail with `ERR_FORBIDDEN (u114)`
- Emergency stop is irreversible (one-way security)

### ✅ Invalid DEX Validation Test

**Validates**: DEX allowlist enforcement

- Swaps with unallowed DEX ID (999) are rejected
- Returns correct error: `ERR-DEX-NOT-ALLOWED (u149)`
- Prevents unauthorized DEX usage

### ✅ Pool Balance Protection Test

**Validates**: Insufficient liquidity handling

- Attempts to swap 700M sats when pool has 690M available
- Correctly rejects with `ERR_INSUFFICIENT_POOL_BALANCE (u132)`
- Prevents pool drainage attacks

### ✅ Pool State Verification Test

**Validates**: Pool configuration integrity

- Pool initialization returns `ResponseOk`
- Correct values: 690M satoshis total/available sBTC
- Proper limits: 1B sats max deposit, 3,000 sats min fee
- Optional fields properly initialized to `null`

---

## Key Financial Validations

### Fee Structure (6% Total)

- **3% Service Fee** → ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6
- **3% LP Fee** → STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2

### Trading Phases

1. **Prelaunch**: 20,000 sats per seat, up to 20 total seats
2. **DEX Bonding**: Variable pricing via bonding curve
3. **AMM Pool**: Constant product market maker

### Pool Configuration

- **Total Capacity**: 690,000,000 satoshis (6.9 sBTC)
- **Max Single Deposit**: 1,000,000,000 sats (10 sBTC)
- **Minimum Fee**: 3,000 sats

---

## Running the Tests

```bash
npm run test

```

**Expected Output**: All 11 tests pass with complete lifecycle coverage from prelaunch through AMM pool trading.
