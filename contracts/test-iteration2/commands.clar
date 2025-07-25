;; Check if someone is an approver
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet is-approver tx-sender)

;; Propose a new allowlist pair (only approvers can do this)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet propose-allowlist-dexes 
    'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.fast12-faktory 
    'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.fast12-faktory-dex 
    'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.xyk-pool-sbtc-fast12-v-1-1)

;; Check if someone has signaled for a proposal
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet has-signaled u1 tx-sender)

;; Signal approval for a proposal (need proposal ID from propose step)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet signal-allowlist-approval u1)

;; Check if a DEX is allowed for a token
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet get-dex-allowed u1)

;; Get proposal details
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet get-allowlist-proposal u1)

;; Check if swaps are paused
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet are-swaps-paused)

;; Emergency stop (only approvers)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet emergency-stop-swaps)

;; Check pool status
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet get-pool)

;; Check if pool is initialized
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet is-pool-initialized)

::set_tx_sender STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2
::set_tx_sender ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6
::set_tx_sender ST28MP1HQDJWQAFSQJN2HBAXBVP7H7THD1Y83JDEY

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

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet initialize-pool u6900000000 0x00145f1dcae5b87013aca2248ad907b5e700bc5c766d)
6900000000
script pub key
0x00145f1dcae5b87013aca2248ad907b5e700bc5c766d


(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet 
          swap-btc-to-aibtc 
          u269000 
          'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed 
          u0 
          u1
          'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.fast12-faktory
          'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.fast12-faktory-dex
          'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.xyk-pool-sbtc-fast12-v-1-1
          'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.sbtc-token
           )

::advance_burn_chain_tip 8

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet
            process-btc-deposit
            u100000
            none)

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.btc2sbtc-testnet
            process-btc-deposit
            u100000
            (some 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)
            )