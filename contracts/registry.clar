;; Simplified AI Account Registry Contract
;; Self-registration with attestation levels

(use-trait ai-account 'SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.aibtc-agent-account-traits-mock.aibtc-account)

;; Constants
(define-constant AIBTC_DEPLOYER 'SP6SA6BTPNN5WDAWQ7GWJF1T5E2KWY01K9SZDBJQ)  ;; Our backend deployer
(define-constant ATTESTOR_1 'SP3VES970E3ZGHQEZ69R8PY62VP3R0C8CTQ8DAMQW)      ;; Primary attestor
(define-constant ATTESTOR_2 'SP3PEBWZ8PQK1M82MS4DVD3V9DE9ZS6F25S6PEF0R)      ;; Secondary attestor

;; Errors
(define-constant ERR_NOT_CONTRACT_CALL (err u801))
(define-constant ERR_NOT_AUTHORIZED_DEPLOYER (err u802))
(define-constant ERR_ALREADY_REGISTERED (err u803))
(define-constant ERR_NOT_ATTESTOR (err u804))
(define-constant ERR_GET_CONFIG_FAILED (err u805))
(define-constant ERR_ACCOUNT_NOT_FOUND (err u806))

;; Maps
;; Core registry: ai-account -> {owner, agent, config, attestation-level}
(define-map ai-account-registry
  principal  ;; ai-account contract address
  {
    owner: principal,
    agent: principal,
    attestation-level: uint  ;; u0 = self-registered, u1+ = attested
  }
)

;; Reverse lookup: owner -> ai-account
(define-map owner-to-account principal principal)

;; Track attestations per account per attestor (prevent double attestation)
(define-map account-attestations
  { account: principal, attestor: principal }
  bool
)

;; ---- Self-Registration Function ----
;; Called from AI agent account deployment with (as-contract (contract-call? registry register-ai-account))
(define-public (register-ai-account (account <ai-account>))
  (let (
    (ai-account-address (contract-of account))
    (ai-config (unwrap! (contract-call? account get-configuration) ERR_GET_CONFIG_FAILED))
    (owner (get owner ai-config))
    (agent (get agent ai-config))
  )
    ;; Verify this is called as-contract from the AI account itself
    ;; (asserts! (is-eq contract-caller ai-account-address) ERR_NOT_CONTRACT_CALL)
    
    ;; Verify the deployer is our authorized backend
    (asserts! (is-eq tx-sender AIBTC_DEPLOYER) ERR_NOT_AUTHORIZED_DEPLOYER)
    
    ;; Prevent double registration (both maps must be empty)
    (asserts! (is-none (map-get? ai-account-registry ai-account-address)) ERR_ALREADY_REGISTERED)
    (asserts! (is-none (map-get? owner-to-account owner)) ERR_ALREADY_REGISTERED)
    
    ;; Register the account with attestation level 0 (self-registered only)
    (map-insert ai-account-registry ai-account-address {
      owner: owner,
      agent: agent,
      attestation-level: u1
    })
    
    ;; Set reverse lookup
    (map-insert owner-to-account owner ai-account-address)
    
    (print {
      type: "ai-account-self-registered",
      account: ai-account-address,
      owner: owner,
      agent: agent,
      attestation-level: u1
    })
    
    (ok ai-account-address)
  )
)

;; ---- Attestation Functions ----
(define-public (attest-account (account principal))
  (let ((registry-entry (unwrap! (map-get? ai-account-registry account) ERR_ACCOUNT_NOT_FOUND))
    (current-level (get attestation-level registry-entry))
    (new-level (+ current-level u1)))

    ;; Verify sender is an authorized attestor
    (asserts! (is-attestor tx-sender) ERR_NOT_ATTESTOR)
    
    ;; Prevent double attestation from same attestor
    (asserts! (is-none (map-get? account-attestations { account: account, attestor: tx-sender })) ERR_ALREADY_REGISTERED)
    
    ;; Record the attestation
    (map-insert account-attestations { account: account, attestor: tx-sender } true)
    (map-set ai-account-registry account (merge registry-entry { attestation-level: new-level }))
      
      (print {
        type: "account-attested",
        account: account,
        attestor: tx-sender,
        new-attestation-level: new-level
      })
      
      (ok new-level)
    
  )
)

;; ---- Pool Integration Functions ----
;; For btc2aibtc pool to get ai-account from owner
(define-read-only (get-ai-account-by-owner (owner principal))
  (map-get? owner-to-account owner)
)

;; For off-chain services to get full account info
(define-read-only (get-account-info (account principal))
  (map-get? ai-account-registry account)
)

;; Get attestation level for an account
(define-read-only (get-attestation-level (account principal))
  (match (map-get? ai-account-registry account)
    registry-entry (some (get attestation-level registry-entry))
    none
  )
)

;; Check if account meets minimum attestation level
(define-read-only (is-account-attested (account principal) (min-level uint))
  (match (get-attestation-level account)
    level (>= level min-level)
    false
  )
)

;; ---- Helper Functions ----
(define-read-only (is-attestor (who principal))
  (or 
    (is-eq who ATTESTOR_1)
    (is-eq who ATTESTOR_2)
  )
)

(define-read-only (has-attestor-signed (account principal) (attestor principal))
  (default-to false (map-get? account-attestations { account: account, attestor: attestor }))
)

;; Get all attestors who have signed for an account
(define-read-only (get-account-attestors (account principal))
  {
    attestor-1-signed: (has-attestor-signed account ATTESTOR_1),
    attestor-2-signed: (has-attestor-signed account ATTESTOR_2)
  }
)