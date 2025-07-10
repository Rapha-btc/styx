# Styx v1 Changes Summary: Mainnet → AI BTC Allowlist Version

## Overview

The core Bitcoin processing logic remains **unchanged** from the battle-tested mainnet code. All changes are **additive** and focused on:

1. **AI BTC Integration** - Support for AI-managed accounts
2. **Allowlist Governance** - Decentralized multi-sig approval for token pairs
3. **Enhanced Flexibility** - Support for multiple swap destinations

---

## 🔄 **Core Changes Summary**

The mainnet version used **hardcoded contract calls** to specific USDA/PEPE pools. The AI BTC version introduces a **flexible trait-based system** with governance for token/DEX pairs and AI account validation.

### 1. **NEW: Multi-sig Allowlist System** (Lines 84-217)

**Purpose**: Decentralized governance for approving token/DEX pairs instead of hardcoded contracts

```clarity
;; 5 immutable approvers with 3-of-5 consensus
(define-read-only (is-approver (who principal))
  (or
    (is-eq who 'SP6SA6BTPNN5WDAWQ7GWJF1T5E2KWY01K9SZDBJQ)  ;; Approver 1
    (is-eq who 'SP3VES970E3ZGHQEZ69R8PY62VP3R0C8CTQ8DAMQW)  ;; Approver 2
    ;; ... 3 more approvers
  )
)
```

**Security**:

- ✅ Immutable approver set (no single point of failure)
- ✅ Time-limited proposals (7 days)
- ✅ 3-of-5 consensus required
- ✅ Auto-execution when threshold reached

### 2. **MODIFIED: Swap Functions Architecture** (Lines 720-890)

**Purpose**: Replace hardcoded contract calls with dynamic trait-based system + AI validation

#### Before (Mainnet):

```clarity
;; Direct hardcoded contract calls - inflexible
(contract-call? 'SP3XXMS38VTAWTVPE5682XSBFXPTH7XCPEBTX8AN2.usda-faktory-pool
                swap-a-to-b sbtc-amount-to-user min-amount-out)

(contract-call? 'SP6SA6BTPNN5WDAWQ7GWJF1T5E2KWY01K9SZDBJQ.pepe-faktory-pool
                swap-a-to-b sbtc-amount-to-user fat-finger-out)
```

#### After (AI BTC Version):

```clarity
;; Dynamic trait-based calls with allowlist validation
(ai-dex-allowed (unwrap! (get-dex-allowed (contract-of ft)) ERR-DEX-NOT-ALLOWED))
(ai-config (contract-call? ai-account get-configuration))
(ai-owner (get owner ai-config))

(asserts! (is-eq stx-receiver ai-owner) ERR-WRONG-AI-ACCOUNT)
(asserts! (is-eq (contract-of ai-dex) ai-dex-allowed) ERR-WRONG-DEX)

(contract-call? ai-dex buy ft sbtc-amount-to-user)
```

**Architecture Changes**:

- ✅ **Hardcoded addresses** → **Allowlist governance**
- ✅ **Direct pool calls** → **Trait-based interfaces**
- ✅ **`swap-a-to-b` method** → **`buy` method**
- ✅ **No validation** → **AI account owner verification**

### 3. **NEW: Trait Imports** (Lines 4-6)

**Purpose**: Support for AI account interfaces

```clarity
(use-trait faktory-token 'SP3XXMS38VTAWTVPE5682XSBFXPTH7XCPEBTX8AN2.faktory-trait-v1.sip-010-trait)
(use-trait faktory-dex 'SP29CK9990DQGE9RGTT1VEQTTYH8KY4E3JE5XP4EC.faktory-dex-trait-v1-1.dex-trait)
(use-trait aibtc-account 'SP29CK9990DQGE9RGTT1VEQTTYH8KY4E3JE5XP4EC.aibtc-agent-account-traits.aibtc-account)
```

---

## 🛡️ **Security Comparison**

| Aspect                 | Mainnet Version          | AI BTC Version                          |
| ---------------------- | ------------------------ | --------------------------------------- |
| **Contract Calls**     | Hardcoded addresses      | Dynamic via traits                      |
| **Pool Methods**       | `swap-a-to-b`            | `buy` (trait method)                    |
| **Token/DEX Pairs**    | Fixed USDA/PEPE pools    | Governed token/DEX pairs                |
| **Account Validation** | Basic STX receiver       | AI account owner verification           |
| **Adding New Tokens**  | Redeploy required        | Governance proposal for token/DEX pairs |
| **Attack Vectors**     | Operator compromise only | Requires 3-of-5 + operator              |

**Result**: AI BTC version replaces **fixed hardcoded pools** with **flexible governed traits** + enhanced security

---

## 📍 **Key Line References**

### New Allowlist System:

- **Lines 84-217**: Complete allowlist mechanism
- **Lines 118-156**: Proposal creation
- **Lines 158-202**: Multi-sig approval process

### AI BTC Integration:

- **Lines 720-730**: AI account validation in `swap-btc-to-aibtc`
- **Lines 820-830**: AI account validation in `swap-btc-to-aibtc-legacy`
- **Lines 854-865**: Allowlist checking logic

### Enhanced Error Handling:

- **Lines 26-33**: New error constants for allowlist/AI features

---

## 🔄 **Unchanged (Battle-tested)**

✅ **All Bitcoin processing logic** (parse functions, merkle proofs, etc.)
✅ **Pool management** (liquidity, withdrawals, fees)
✅ **Core swap mechanics** (BTC → sBTC conversion)
✅ **Refund system** (edge case handling)
✅ **Cooldown mechanisms** (security delays)

---

## 🎯 **Benefits for AI BTC**

1. **Flexibility**: Add new token/DEX pairs without redeploying
2. **Security**: Decentralized governance prevents single points of failure
3. **AI Integration**: Native support for AI-managed accounts
4. **Future-proof**: Can adapt to new tokens/DEXes via governance for token/DEX pair approvals

---

## 🚀 **Deployment Strategy**

1. **Demo Mode**: Deploy with current operator for testing
2. **Production**: Upgrade operator to multi-sig for full decentralization
3. **Governance**: Community-driven token pair approvals

---

## 💡 **Review Focus Areas**

1. **Allowlist Logic**: Lines 84-217 (new governance system)
2. **AI Account Validation**: Lines 720-730, 820-830 (security checks)
3. **Error Handling**: Lines 26-33 (new error constants)
4. **Trait Integration**: Lines 4-6 (interface definitions)

The rest is **proven mainnet code** with extensive battle-testing! 🛡️
