;; Check if someone is an approver
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc is-approver tx-sender)

;; Propose a new allowlist pair (only approvers can do this)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc propose-allowlist-dexes 'SP331D6T77PNS2YZXR03CDC4G3XN0SYBPV69D8JW5.beast1-faktory 'SP331D6T77PNS2YZXR03CDC4G3XN0SYBPV69D8JW5.beast1-faktory-dex 'SP331D6T77PNS2YZXR03CDC4G3XN0SYBPV69D8JW5.xyk-pool-sbtc-beast1-v-1-1)

;; Check if someone has signaled for a proposal
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc has-signaled u1 tx-sender)

;; Signal approval for a proposal (need proposal ID from propose step)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc signal-allowlist-approval u1)

;; Check if a DEX is allowed for a token
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc get-dex-allowed 'SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.fakfun-faktory)

;; Get proposal details
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc get-allowlist-proposal u1)

;; Check if swaps are paused
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc are-swaps-paused)

;; Emergency stop (only approvers)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc emergency-stop-swaps)

;; Remove allowlist pair (only approvers)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc remove-allowlist-pair 'SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.fakfun-faktory)

;; Check pool status
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc get-pool)

;; Check if pool is initialized
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc is-pool-initialized)

::set_tx_sender SP6SA6BTPNN5WDAWQ7GWJF1T5E2KWY01K9SZDBJQ
::set_tx_sender SP3VES970E3ZGHQEZ69R8PY62VP3R0C8CTQ8DAMQW
::set_tx_sender SPP3HM2E4JXGT26G1QRWQ2YTR5WT040S5NKXZYFC

not an approver:
::set_tx_sender ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP


Here's the complete flow to add an FT/DEX pair to the allowlist:

## Step-by-Step Flow

### 1. **Propose the pair** (any approver)
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  propose-allowlist-pair 
  'SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.fakfun-faktory 
  'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.sbtc-fakfun-amm-lp-v1)
```
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  propose-allowlist-pair 
  'SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.fakfun-faktory 
  'SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.fakfun-faktory-dex)
```
*This returns a proposal ID (e.g., `u1`) and automatically counts as 1 signal*

### 2. **Signal approval** (2 more approvers needed)
```clarity
;; Second approver
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  signal-allowlist-approval u1)

;; Third approver  
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  signal-allowlist-approval u1)
```
*After the 3rd signal, the pair is automatically approved and added to the allowlist*

## Check Commands

```clarity
;; Check if you're an approver
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  is-approver tx-sender)

;; Check proposal status
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  get-allowlist-proposal u1)

;; Check if someone already signaled
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  has-signaled u1 tx-sender)

;; Check if pair is approved (after 3 signals)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc 
  get-dex-allowed 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-token)
```

## Key Points:
- **3/5 approvers** need to signal approval (`SIGNALS_REQUIRED u3`)
- **7 days max** to get signals (`APPROVAL_WINDOW u1008`)
- **Auto-execution** when 3rd signal is received
- **One signal per approver** per proposal