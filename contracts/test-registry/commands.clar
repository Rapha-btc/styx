# Start clarinet console
clarinet console

# Deploy the registry contract
::deploy_contract registry contracts/registry.clar

# Create a mock AI account contract for testing
::deploy_contract mock-ai-account contracts/mock-ai-account.clar


::set_tx_sender STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2
::set_tx_sender ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
::set_tx_sender ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6
::set_tx_sender ST28MP1HQDJWQAFSQJN2HBAXBVP7H7THD1Y83JDEY

# Test 1: Register an AI account (as deployer)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet register-ai-account 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

# Test 2: Try to register the same account again (should fail)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet register-ai-account 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

# Test 3: Check if account is registered
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet get-account-info 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

# Test 4: Get account by owner
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet get-ai-account-by-owner 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet get-ai-account-by-owner 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H)

# Test 5: Check attestation level
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet get-attestation-level 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

# Test 6: Attest the account (as attestor)
::set_tx_sender ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet attest-account 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

# Test 7: Check new attestation level
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet get-attestation-level 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

# Test 8: Try to attest again (should fail - double attestation)
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet attest-account 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

# Test 9: Check if account meets minimum attestation level
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet is-account-attested 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed u2)

# Test 10: Try to register as non-deployer (should fail)
::set_tx_sender ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet register-ai-account 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)

(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry-testnet get-account-attestors 'ST16PP6EYRCB7NCTGWAC73DH5X0KXWAPEQ8T45M1H.aibtc-acct-manually-deployed)