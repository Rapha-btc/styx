;; SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.prelaunch-faktory-trait
;; Pre-launch Contract Trait v1.1
;; Updated to support cross-chain seat purchasing

;; (use-trait faktory-token 'SP3XXMS38VTAWTVPE5682XSBFXPTH7XCPEBTX8AN2.faktory-trait-v1.sip-010-trait)
(use-trait faktory-token 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.faktory-trait-v1.sip-010-trait) 


(define-trait prelaunch-trait
  (
    (buy-up-to (uint (optional principal)) (response uint uint))
    (refund ((optional principal)) (response uint uint))
    (claim (<faktory-token>) (response uint uint))
    (claim-on-behalf (<faktory-token> principal) (response uint uint))
    
    (trigger-fee-airdrop () (response uint uint))
    (is-market-open () (response bool uint))
  )
)