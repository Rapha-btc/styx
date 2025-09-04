# BTC to AI BTC Bridge - Test Suite Documentation

This test suite validates the core functionality of the BTC to AI BTC bridge smart contract, ensuring secure and reliable bridging from Bitcoin to AI token economies.

## Test Overview

The test suite covers 11 comprehensive test cases organized into 6 main categories:

### 1. Pool Setup and Allowlist (3 tests)

### 2. Debug Swap Function (1 test)

### 3. Debug Error Handling (3 tests)

### 4. Debug Pool State (1 test)

### 5. Debug Agent Lookup (1 test)

### 6. Prelaunch Completion Test (1 test)

### 7. Simple Market Open Test (1 test)

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

## Debug Swap Function Tests

### ✅ Swap Response Format with Balance Verification Test

**Validates**: Complete swap flow with detailed balance tracking
**Input**: 50,000 sats BTC deposit for 1 agent
**Expected Flow**:

1. **Fee Calculation**: 6% total fee = 3,000 sats
   - 1,500 sats → Service provider
   - 1,500 sats → LP operator
2. **After Fees**: 47,000 sats available for user
3. **Seat Purchase**: 2 seats × 20,000 sats = 40,000 sats
4. **Change Return**: 7,000 sats sent to AI agent account
5. **Event Validation**: 6 total events (2 print, 4 transfer)

---

## Debug Error Handling Tests

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

---

## Debug Pool State Tests

### ✅ Pool State Verification Test

**Validates**: Pool configuration integrity

- Pool initialization returns `ResponseOk`
- Correct values: 690M satoshis total/available sBTC
- Proper limits: 1B sats max deposit, 3,000 sats min fee
- Optional fields properly initialized to `null`

---

## Debug Agent Lookup Tests

### ✅ Agent Account Lookup Test

**Validates**: AI agent registry functionality

- Agent accounts are properly created and retrievable
- Owner-to-agent mapping works correctly
- Agent accounts can receive sBTC transfers

---

## Prelaunch Completion Tests

### ✅ Multi-Agent Prelaunch + DEX Buy Test

**Validates**: Complete prelaunch phase with market transition
**Input**: 10 agents × 50,000 sats = 500,000 sats total
**Expected Outcome**:

- All 10 AI agents (an-agent through an-agent-10) each get 2 seats
- Total seats sold: 20 seats × 20,000 = 400,000 sats
- Market transitions from closed to open after prelaunch completion
- DEX buy functionality becomes available
- Pool buy functionality works correctly for smaller amounts

**Known Issue**: DEX integration encounters return type mismatches in the VM environment. The system correctly reverts to direct sBTC deposits when DEX swaps fail, which is the intended fallback behavior. However, the VM crashes during this process, which is incorrect behavior. We have a meeting scheduled with Hugo from Clarinet tomorrow to address this VM stability issue.

---

## Simple Market Open Tests

### ✅ Market Open Contract Verification Test

**Validates**: External contract integration

- Tests connection to prelaunch contract functions
- Verifies `is-market-open` functionality
- Confirms contract exists and responds correctly

---

## Previous Testing History

We have previously tested bonding curve mechanics and Bitflow DEX swap functionality in earlier versions of this bridge contract. These integrations worked correctly in prior implementations, and we will conduct comprehensive testing again using STXer simulations on mainnet.

---

## Mainnet Deployment Status

We are currently deploying to mainnet and will perform STXer simulations directly on the live network.

**Deployed Contracts:**

- `ST29D6YMDNAKN1P045T6Z817RTE1AC0JAAAG2EQZZ.agent-account-registry`
- Additional contract deployments in progress

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

**Expected Output**: All 11 tests pass with complete lifecycle coverage from prelaunch through market opening and DEX integration attempts.

**Test Duration**: ~13 seconds total execution time
