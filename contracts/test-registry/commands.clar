# Start clarinet console
clarinet console

# Deploy the registry contract
::deploy_contract registry contracts/registry.clar

# Create a mock AI account contract for testing
::deploy_contract mock-ai-account contracts/mock-ai-account.clar

# Test 1: Register an AI account (as deployer)
(contract-call? .registry register-ai-account .mock-ai-account)

# Test 2: Try to register the same account again (should fail)
(contract-call? .registry register-ai-account .mock-ai-account)

# Test 3: Check if account is registered
(contract-call? .registry get-account-info .mock-ai-account)

# Test 4: Get account by owner
(contract-call? .registry get-ai-account-by-owner 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)

# Test 5: Check attestation level
(contract-call? .registry get-attestation-level .mock-ai-account)

# Test 6: Attest the account (as attestor)
::set_tx_sender SP3VES970E3ZGHQEZ69R8PY62VP3R0C8CTQ8DAMQW
(contract-call? .registry attest-account .mock-ai-account)

# Test 7: Check new attestation level
(contract-call? .registry get-attestation-level .mock-ai-account)

# Test 8: Try to attest again (should fail - double attestation)
(contract-call? .registry attest-account .mock-ai-account)

# Test 9: Check if account meets minimum attestation level
(contract-call? .registry is-account-attested .mock-ai-account u2)

# Test 10: Try to register as non-deployer (should fail)
::set_tx_sender ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
(contract-call? .registry register-ai-account .mock-ai-account)