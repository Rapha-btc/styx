Here are Clarinet console commands to test your registry contract:

## 🧪 **Test Commands:**

### **1. Check Operator Status**
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet is-operator tx-sender)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet is-operator 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2)
```

### **2. Propose AI Account Registration**
```clarity
;; Test proposal (replace with real AI account contract)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet 
  propose-ai-account-registration 
  'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed
  'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H  ;; owner
  'ST3BVJM8WCP85RNFWXRRNRWRQREB5GK25TJWM016Z  ;; agent
)
```

::set_tx_sender STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2
::set_tx_sender ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6
::set_tx_sender ST28MP1HQDJWQAFSQJN2HBAXBVP7H7THD1Y83JDEY

not an approver:
::set_tx_sender ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP

### **3. Check Proposal**
```clarity
;; Get proposal details (assuming proposal ID 1)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet get-registration-proposal u1)

;; Check if user already registered
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet is-user-registered 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H)
```

### **4. Signal Approval (Second Operator)**
```clarity
;; Switch to second operator and signal
::set_tx_sender STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet signal-registration-approval u1)
```

### **5. Check Final Registration**
```clarity
;; Check if AI account is registered
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet 
  get-ai-account-by-owner 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H)

;; Check proposal ID lookup
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet 
  get-proposal-id-by-ai-account 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet 
  get-owners-by-ai-account 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet 
  get-registration-proposal u1)
```

### **6. Test Error Cases**
```clarity
;; Try to propose again (should fail - already registered)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet 
  propose-ai-account-registration 
  'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.another-ai-account
  'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE  ;; same owner
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
)

;; Try non-operator proposal (should fail)
::set_tx_sender ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.register-ai-account-testnet 
  propose-ai-account-registration 
  'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.test-ai-account-2
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
)
```

**Test the full operator flow: propose → signal → verify registration!** 🚀