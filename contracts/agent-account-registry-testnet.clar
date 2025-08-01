;; Agent Account Registry
;; Auto-registration with attestation levels

(use-trait agent-account 'SPW8QZNWKZGVHX012HCBJVJVPS94PXFG578P53TM.aibtc-agent-account-traits.aibtc-account-config)

;; Constants
(define-constant ATTESTOR_DEPLOYER tx-sender) ;; 'SPW8QZNWKZGVHX012HCBJVJVPS94PXFG578P53TM
(define-constant ATTESTOR_1 'SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22) ;; faktory attestator
(define-constant ATTESTOR_2 'SP2GHGQRWSTM89SQMZXTQJ0GRHV93MSX9J84J7BEA) ;; aibtc attestator 

(define-constant ATTESTORS (list  ATTESTOR_1 ATTESTOR_2))

;; Errors
(define-constant ERR_NOT_CONTRACT_CALL (err u801))
(define-constant ERR_NOT_AUTHORIZED_DEPLOYER (err u802))
(define-constant ERR_ALREADY_REGISTERED (err u803))
(define-constant ERR_NOT_ATTESTOR (err u804))
(define-constant ERR_GET_CONFIG_FAILED (err u805))
(define-constant ERR_ACCOUNT_NOT_FOUND (err u806))

;; Maps
;; Core registry: agent-account -> {owner, agent, attestation-level}
(define-map agent-account-registry
  principal 
  {
    owner: principal,
    agent: principal,
    attestation-level: uint 
    ;;  anyone who reads the contract can understand what max attestation is -> no need for explicit max-attestation-level -> redundant?
  }
)

;; Reverse lookup: owner -> agent-account, agent -> agent-account
(define-map owner-to-agent-account principal principal)
(define-map agent-to-agent-account principal principal)

;; Track attestations 
(define-map agent-account-attestations
  { account: principal, attestor: principal }
  bool
)

;; Auto-register called from agent account on deployment [no need for as-contract when doing so]
(define-public (auto-register-agent-account (owner principal) (agent principal))
  (begin  
    ;; only ATTESTOR_DEPLOYER can auto-register an agent account it deploys
    (asserts! (is-eq tx-sender ATTESTOR_DEPLOYER) ERR_NOT_AUTHORIZED_DEPLOYER)
    (do-register-account contract-caller owner agent)
  )
)

(define-public (register-agent-account (account <agent-account>))
  (let (
    (agent-account-address (contract-of account))
    (ai-config (unwrap! (contract-call? account get-config) ERR_GET_CONFIG_FAILED))
    (owner (get owner ai-config))
    (agent (get agent ai-config))
  )
    (asserts! (is-eq tx-sender ATTESTOR_DEPLOYER) ERR_NOT_AUTHORIZED_DEPLOYER)
    (do-register-account agent-account-address owner agent)
  )
)

(define-private (do-register-account (account principal) (owner principal) (agent principal))
  (begin
    (asserts! (map-insert agent-account-registry account {
      owner: owner,
      agent: agent,
      attestation-level: u1}) ERR_ALREADY_REGISTERED)
    (asserts! (map-insert owner-to-agent-account owner account) ERR_ALREADY_REGISTERED)
    (asserts! (map-insert agent-to-agent-account agent account) ERR_ALREADY_REGISTERED)
    (print {
      type: "agent-account-registered",
      account: account,
      owner: owner,
      agent: agent,
      attestation-level: u1
    })
    (ok account)
  )
)

;; ---- Attestation Functions ----
(define-public (attest-agent-account (account principal))
  (let ((registry-entry (unwrap! (map-get? agent-account-registry account) ERR_ACCOUNT_NOT_FOUND))
    (current-level (get attestation-level registry-entry))
    (new-level (+ current-level u1)))
    (asserts! (is-attestor tx-sender) ERR_NOT_ATTESTOR)    
    (asserts! (map-insert agent-account-attestations { account: account, attestor: tx-sender } true) ERR_ALREADY_REGISTERED)
    (map-set agent-account-registry account (merge registry-entry { attestation-level: new-level }))   
      (print {
        type: "account-attested",
        account: account,
        attestor: tx-sender,
        new-attestation-level: new-level,
        max-attestation-level: u3 ;; (+ (len ATTESTORS) u1)
      })
      (ok new-level) 
  )
)

;; ---- Read ----
(define-read-only (get-registry-config)
  {
    attestor-deployer: ATTESTOR_DEPLOYER,
    attestors: ATTESTORS,
    max-attestation-level: u3 ;; (+ (len ATTESTORS) u1)
  }
)

(define-read-only (get-agent-account-by-owner (owner principal))
  (map-get? owner-to-agent-account owner)
)

(define-read-only (get-agent-account-by-agent (agent principal))
  (map-get? agent-to-agent-account owner)
)

(define-read-only (get-agent-account-info (account principal))
  (map-get? agent-account-registry account)
)

(define-read-only (get-attestation-level (account principal))
  (match (map-get? agent-account-registry account)
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
  (is-some (index-of ATTESTORS who))
)

(define-read-only (is-attestor-from-list (who principal))
  (ok (asserts! (is-some (index-of? ATTESTORS who)) ERR_NOT_ATTESTOR))
)

(define-read-only (has-attestor-signed (account principal) (attestor principal))
  (default-to false (map-get? agent-account-attestations { account: account, attestor: attestor }))
)

;; Get all attestors who have signed for an account
(define-read-only (get-account-attestors (account principal))
  {
    attestor-deployer: ATTESTOR_DEPLOYER,
    attestor-signed: (has-attestor-signed account ATTESTOR)
  }
)