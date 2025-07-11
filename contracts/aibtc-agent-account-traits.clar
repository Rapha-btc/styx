;; title: aibtc-agent-account-traits
;; version: 2.0.0
;; summary: A collection of traits for smart contracts that manage agent accounts.

;; IMPORTS
;; (use-trait sip010-trait 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.sip-010-trait-ft-standard.sip-010-trait)
;; (use-trait dao-action-trait 'ST2RGXKTT1ME8DPKHZAVDWKYWRM0CWZ6EGC8GDNGC.aibtc-dao-traits.action)
;; (use-trait dao-proposal-trait 'ST2RGXKTT1ME8DPKHZAVDWKYWRM0CWZ6EGC8GDNGC.aibtc-dao-traits.proposal)
;; (use-trait dao-action-proposal-trait 'ST2RGXKTT1ME8DPKHZAVDWKYWRM0CWZ6EGC8GDNGC.aibtc-dao-traits.action-proposal-voting)
;; (use-trait dao-faktory-dex 'ST2RGXKTT1ME8DPKHZAVDWKYWRM0CWZ6EGC8GDNGC.aibtc-dao-traits.faktory-dex)
;; (use-trait faktory-token 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.faktory-trait-v1.sip-010-trait)

;; ACCOUNT TRAITS

(define-trait aibtc-account (
  (deposit-stx
    (uint)
    (response bool uint)
  )
  (deposit-ft
    (<sip010-trait> uint)
    (response bool uint)
  )
  (withdraw-stx
    (uint)
    (response bool uint)
  )
  (withdraw-ft
    (<sip010-trait> uint)
    (response bool uint)
  )
))

;; (define-trait aibtc-proposals (
;;   (create-action-proposal
;;     (<dao-action-proposal-trait> <dao-action-trait> (buff 2048) (optional (string-ascii 1024)))
;;     (response bool uint)
;;   )
;;   (vote-on-action-proposal
;;     (<dao-action-proposal-trait> uint bool)
;;     (response bool uint)
;;   )
;;   (veto-action-proposal
;;     (<dao-action-proposal-trait> uint)
;;     (response bool uint)
;;   )
;;   (conclude-action-proposal
;;     (<dao-action-proposal-trait> uint <dao-action-trait>)
;;     (response bool uint)
;;   )
;; ))

;; (define-trait faktory-buy-sell (
;;   (faktory-buy-asset
;;     (<dao-faktory-dex> <faktory-token> uint)
;;     (response bool uint)
;;   )
;;   (faktory-sell-asset
;;     (<dao-faktory-dex> <faktory-token> uint)
;;     (response bool uint)
;;   )
;; ))

;; (define-trait aibtc-account-config (
;;   (set-agent-can-use-proposals
;;     (bool)
;;     (response bool uint)
;;   )
;;   (set-agent-can-approve-revoke-contracts
;;     (bool)
;;     (response bool uint)
;;   )
;;   (set-agent-can-buy-sell-assets
;;     (bool)
;;     (response bool uint)
;;   )
;;   (approve-contract
;;     (principal)
;;     (response bool uint)
;;   )
;;   (revoke-contract
;;     (principal)
;;     (response bool uint)
;;   )
;; ))