;; Simplified AI Account Registry Contract
;; Self-registration with attestation levels

(use-trait ai-account 'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.aibtc-agent-account-traits.aibtc-account-config)

;; Constants
(define-constant ATTESTOR_DEPLOYER 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM) ;; 'STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2)  ;; Our backend deployer
(define-constant ATTESTOR 'ST1G655MB1JVQ5FBE2JJ3E01HEA6KBM4H394VWAD6)      ;; Primary attestor

;; Errors
(define-constant ERR_NOT_CONTRACT_CALL (err u801))
(define-constant ERR_NOT_AUTHORIZED_DEPLOYER (err u802))
(define-constant ERR_ALREADY_REGISTERED (err u803))
(define-constant ERR_NOT_ATTESTOR (err u804))
(define-constant ERR_GET_CONFIG_FAILED (err u805))
(define-constant ERR_ACCOUNT_NOT_FOUND (err u806))

;; Maps
;; Core registry: ai-account -> {owner, agent, attestation-level}
(define-map ai-account-registry
  principal 
  {
    owner: principal,
    agent: principal,
    attestation-level: uint 
  }
)

;; Reverse lookup: owner -> ai-account
(define-map owner-to-account principal principal)

;; Track attestations 
(define-map account-attestations
  { account: principal, attestor: principal }
  bool
)

;; Auto-register (called from AI account with as-contract)
(define-public (auto-register-ai-account (owner principal) (agent principal))
  (begin  
    (asserts! (is-eq tx-sender ATTESTOR_DEPLOYER) ERR_NOT_AUTHORIZED_DEPLOYER)
    (asserts! (is-none (map-get? ai-account-registry contract-caller)) ERR_ALREADY_REGISTERED) ;; Prevent double registration
    (asserts! (is-none (map-get? owner-to-account owner)) ERR_ALREADY_REGISTERED)
    (do-register-account contract-caller owner agent)
  )
)

(define-public (register-ai-account (account <ai-account>))
  (let (
    (ai-account-address (contract-of account))
    (ai-config (unwrap! (contract-call? account get-config) ERR_GET_CONFIG_FAILED))
    (owner (get owner ai-config))
    (agent (get agent ai-config))
  )
    (asserts! (is-eq tx-sender ATTESTOR_DEPLOYER) ERR_NOT_AUTHORIZED_DEPLOYER)
    (asserts! (is-none (map-get? ai-account-registry ai-account-address)) ERR_ALREADY_REGISTERED) ;; Prevent double registration
    (asserts! (is-none (map-get? owner-to-account owner)) ERR_ALREADY_REGISTERED)
    (do-register-account ai-account-address owner agent)
  )
)

(define-private (do-register-account (account principal) (owner principal) (agent principal))
  (begin
    (map-insert ai-account-registry account {
      owner: owner,
      agent: agent,
      attestation-level: u1
    })
    (map-insert owner-to-account owner account)
    (print {
      type: "ai-account-registered",
      account: account,
      owner: owner,
      agent: agent,
      attestation-level: u1
    })
    (ok account)
  )
)

;; ---- Attestation Functions ----
(define-public (attest-account (account principal))
  (let ((registry-entry (unwrap! (map-get? ai-account-registry account) ERR_ACCOUNT_NOT_FOUND))
    (current-level (get attestation-level registry-entry))
    (new-level (+ current-level u1)))
    (asserts! (is-attestor tx-sender) ERR_NOT_ATTESTOR)
    (asserts! (is-none (map-get? account-attestations { account: account, attestor: tx-sender })) ERR_ALREADY_REGISTERED)
    
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

;; ---- Read ----
(define-read-only (get-ai-account-by-owner (owner principal))
  (map-get? owner-to-account owner)
)

(define-read-only (get-account-info (account principal))
  (map-get? ai-account-registry account)
)

(define-read-only (get-attestation-level (account principal))
  (match (map-get? ai-account-registry account)
    registry-entry (some (get attestation-level registry-entry))
    none
  )
)

(define-read-only (is-account-attested (account principal) (min-level uint))
  (match (get-attestation-level account)
    level (>= level min-level)
    false
  )
)

;; ---- Helper Functions ----
(define-read-only (is-attestor (who principal))
  (is-eq who ATTESTOR)
)

(define-read-only (has-attestor-signed (account principal) (attestor principal))
  (default-to false (map-get? account-attestations { account: account, attestor: attestor }))
)

;; Get all attestors who have signed for an account
(define-read-only (get-account-attestors (account principal))
  {
    attestor-signed: (has-attestor-signed account ATTESTOR)
  }
)