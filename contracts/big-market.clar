;; Title: BME023 Market bitcoin predictions
;; Synopsis:
;; Implements prediciton markets for bitcoin users (see also bme023-0-market-predicting).
;; Description:
;; Provide binary and categorical prediction markets with 
;; bitcoin only transactions - no stx needed for gas. Works with 
;; clarity-bitcoin-lib-v5 for bitcoin catamaran swaps into markets.

(impl-trait  .prediction-market-trait.prediction-market-trait)

(define-constant min-stake u100000) ;; Example: 100,000 satoshis (0.001 BTC)

;; ---------------- CONSTANTS & TYPES ----------------
(define-constant MARKET_TYPE u3) ;; bitcoin tx market
(define-constant token 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

(define-constant RESOLUTION_OPEN u0)
(define-constant RESOLUTION_RESOLVING u1)
(define-constant RESOLUTION_DISPUTED u2)
(define-constant RESOLUTION_RESOLVED u3)

(define-constant err-unauthorised (err u10000))
(define-constant err-invalid-market-type (err u10001))
(define-constant err-amount-too-low (err u10002))
(define-constant err-wrong-market-type (err u10003))
(define-constant err-already-concluded (err u10004))
(define-constant err-market-not-found (err u10005))
(define-constant err-user-not-winner-or-claimed (err u10006))
(define-constant err-user-not-staked (err u10008))
(define-constant err-market-not-concluded (err u10009))
(define-constant err-insufficient-balance (err u10011))
(define-constant err-insufficient-contract-balance (err u10012))
(define-constant err-user-share-is-zero (err u10013))
(define-constant err-dao-fee-bips-is-zero (err u10014))
(define-constant err-disputer-must-have-stake (err u10015))
(define-constant err-dispute-window-elapsed (err u10016))
(define-constant err-market-not-resolving (err u10017))
(define-constant err-market-not-open (err u10018))
(define-constant err-dispute-window-not-elapsed (err u10019))
(define-constant err-market-wrong-state (err u10020))
(define-constant err-invalid-token (err u10021))
(define-constant err-max-market-fee-bips-exceeded (err u10022))
(define-constant err-category-not-found (err u10023))
(define-constant err-too-few-categories (err u10024))
(define-constant err-element-expected (err u10025))
(define-constant err-winning-stake-not-zero (err u10026))
(define-constant err-losing-stake-is-zero (err u10027))
(define-constant err-transaction-segwit (err u10028))
(define-constant err-transaction-legacy (err u10029))
(define-constant err-transaction (err u1030))
(define-constant err-market-wallet (err u1031))
(define-constant err-transfer-forbidden (err u1032))

(define-data-var market-counter uint u0)
(define-data-var dispute-window-length uint u144)
(define-data-var dev-fee-bips uint u200)
(define-data-var dao-fee-bips uint u200)
(define-data-var market-fee-bips-max uint u1000)
(define-data-var market-create-fee uint u100000000)
(define-data-var dev-fund principal tx-sender)
(define-data-var resolution-agent principal tx-sender)
(define-data-var dao-treasury principal tx-sender)
(define-data-var creation-gated bool true)
(define-data-var market-wallet { version: (buff 1), hashbytes: (buff 32) } { version: 0x00, hashbytes: 0x8ae4a48cb0c3b7874460a6f5287d9dd512a18246 })
(define-data-var resolution-timeout uint u1000) ;; 1000 blocks (~9 days)

;; Data structure for each Market
;; outcome: winning category
(define-map markets
  uint
  {
		market-data-hash: (buff 32),
    treasury: principal,
    creator: principal,
    market-fee-bips: uint,
    resolution-state: uint, ;; "open", "resolving", "disputed", "concluded"
    resolution-burn-height: uint,
    categories: (list 10 (string-ascii 64)), ;; List of available categories
    stakes: (list 10 uint), ;; Total staked per category
    outcome: (optional uint),
    concluded: bool
  }
)

(define-map stake-balances
  { market-id: uint, user: principal }
  (list 10 uint)
)

;; ---------------- access control ----------------
(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .bigmarket-dao) (contract-call? .bigmarket-dao is-extension contract-caller)) err-unauthorised))
)

;; ---------------- getters / setters ----------------

(define-public (set-dispute-window-length (length uint))
  (begin
    (try! (is-dao-or-extension))
    (var-set dispute-window-length length)
    (ok true)
  )
)

(define-public (set-creation-gated (gated bool))
  (begin
    (try! (is-dao-or-extension))
    (var-set creation-gated gated)
    (ok true)
  )
)

(define-public (set-resolution-agent (new-agent principal))
  (begin
    (try! (is-dao-or-extension))
    (var-set resolution-agent new-agent)
    (ok true)
  )
)

(define-public (set-dev-fee-bips (new-fee uint))
  (begin
		(asserts! (<= new-fee u1000) err-max-market-fee-bips-exceeded)
    (try! (is-dao-or-extension))
    (var-set dev-fee-bips new-fee)
    (ok true)
  )
)

(define-public (set-dao-fee-bips (new-fee uint))
  (begin
		(asserts! (<= new-fee u1000) err-max-market-fee-bips-exceeded)
    (try! (is-dao-or-extension))
    (var-set dao-fee-bips new-fee)
    (ok true)
  )
)

(define-public (set-market-fee-bips-max (new-fee uint))
  (begin
		(asserts! (<= new-fee u1000) err-max-market-fee-bips-exceeded)
    (try! (is-dao-or-extension))
    (var-set market-fee-bips-max new-fee)
    (ok true)
  )
)

(define-public (set-market-create-fee (new-fee uint))
  (begin
    (try! (is-dao-or-extension))
    (var-set market-create-fee new-fee)
    (ok true)
  )
)

(define-public (set-dev-fund (new-dev-fund principal))
  (begin
    (try! (is-dao-or-extension))
    (var-set dev-fund new-dev-fund)
    (ok true)
  )
)

(define-public (set-dao-treasury (new-dao-treasury principal))
  (begin
    (try! (is-dao-or-extension))
    (var-set dao-treasury new-dao-treasury)
    (ok true)
  )
)

(define-public (set-market-wallet (version (buff 1)) (hashbytes (buff 32)))
  (begin
    (try! (is-dao-or-extension))
    (var-set market-wallet { version: version, hashbytes: hashbytes })
    (ok {hashbytes: hashbytes, version: version})
  )
)
(define-read-only (get-market-wallet)
  (ok (var-get market-wallet))
)
(define-read-only (is-market-wallet-output (scriptPubKey (buff 128)))
  (let 
    (
      (wallet (var-get market-wallet))
      (script-len (len scriptPubKey))
    )
    (if (>= script-len u22)
        (let ((script-hash (slice? scriptPubKey (- script-len u20) script-len))) 
          (ok (is-eq (unwrap! script-hash err-element-expected) (get hashbytes wallet))))
        (err u10025) ;; Error: Script too short
    )
  )
)

(define-read-only (get-market-data (market-id uint))
	(map-get? markets market-id)
)

(define-read-only (get-stake-balances (market-id uint) (user principal))
	(map-get? stake-balances { market-id: market-id, user: user })
)


;; ---------------- public functions ----------------

(define-public (create-market (categories (list 10 (string-ascii 64))) (fee-bips (optional uint)) (market-data-hash (buff 32)) (proof (list 10 (tuple (position bool) (hash (buff 32))))) (treasury principal))
    (let (
        (sender tx-sender)
        (new-id (var-get market-counter))
        (market-fee-bips (default-to u0 fee-bips))
      )
		  (asserts! (> (len categories) u1) err-too-few-categories)
		  (asserts! (<= market-fee-bips (var-get market-fee-bips-max)) err-max-market-fee-bips-exceeded)
      ;; ensure user pays creation fee if required
      (if (and (not (is-eq tx-sender (var-get resolution-agent))) (> (var-get market-create-fee) u0))
        (try! (stx-transfer? (var-get market-create-fee) tx-sender (var-get dao-treasury)))
        true
      )
      ;; ensure the user is allowed to create if gating by merkle proof is required
      (if (var-get creation-gated) (try! (as-contract (contract-call? .bme022-0-market-gating can-access-by-account sender proof))) true)

      ;; all checks pass - insert market data
      (map-set markets
        new-id
        {
          market-data-hash: market-data-hash,
          treasury: treasury,
          creator: tx-sender,
          market-fee-bips: market-fee-bips,
          resolution-state: RESOLUTION_OPEN,
          resolution-burn-height: u0,
          categories: categories,
          stakes: (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0),
          outcome: none,
          concluded: false
        }
      )
      ;; Increment the counter
      (var-set market-counter (+ new-id u1))
      (try! (contract-call? .bme030-0-reputation-token mint tx-sender u7 u4))
      (print {event: "create-market", market-id: new-id, categories: categories, market-fee-bips: market-fee-bips, market-data-hash: market-data-hash, creator: tx-sender})
      (ok new-id)
  )
)

;; -------------------------------------------------------------------------------------------------
;; bitcoin predictions
;; requires parsing of bitcoin transaction
(define-public (predict-category 
    (height uint)
    (wtx (buff 4096))
    (header (buff 80))
    (tx-index uint)
    (tree-depth uint)
    (wproof (list 14 (buff 32)))
    (witness-merkle-root (buff 32))
    (witness-reserved-value (optional  (buff 32)))
    (ctx (optional (buff 1024)))
    (cproof (optional (list 14 (buff 32))))
  )
  (let (
      (verified 
        (if (is-some witness-reserved-value)
          (try! (verify-segwit height wtx header tx-index tree-depth wproof witness-merkle-root (unwrap! witness-reserved-value err-element-expected) (unwrap! ctx err-element-expected) (unwrap! cproof err-element-expected)))
          (try! (verify-legacy height wtx header { tx-index: tx-index, hashes: wproof, tree-depth: tree-depth}))
        )
      )
      (payload (if (is-some witness-reserved-value)
        (unwrap! (parse-payload-segwit wtx) err-element-expected)
        (unwrap! (parse-payload-legacy wtx) err-element-expected)
      ))
      (output1 (if (is-some witness-reserved-value)
        (unwrap! (get-output-segwit wtx u1) err-element-expected)
        (unwrap! (get-output-legacy wtx u1) err-element-expected)
      ))
      ;;(amount (unwrap! (get amt payload) err-element-expected))
      (market-id (unwrap! (get i payload) err-element-expected))
      (index (unwrap! (get o payload) err-element-expected))
      (sender (unwrap! (get p payload) err-element-expected))

      (amount (get value output1))
      (amount-less-fee amount) ;;(try! (process-stake-transfer amount)))
      (md (unwrap! (map-get? markets market-id) err-market-not-found))
      (current-stakes (get stakes md))
      (current-stake (unwrap! (element-at? current-stakes index) err-category-not-found))
      (current-stake-balances (default-to (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0) (map-get? stake-balances {market-id: market-id, user: sender})))
      (current-user-stake (unwrap! (element-at? current-stake-balances index) err-category-not-found))
    )
    ;; Ensure transaction verifies
    (asserts! (unwrap! (is-market-wallet-output (get scriptPubKey output1)) err-market-wallet) err-market-wallet)

    ;; Ensure transaction verifies
    (asserts! verified err-transaction)
    
    (asserts! (not (get concluded md)) err-already-concluded)
    ;; Ensure resolution process has not started 
    (asserts! (is-eq (get resolution-state md) RESOLUTION_OPEN) err-market-not-open)

    (map-set markets market-id
      (merge md {stakes: (unwrap! (replace-at? current-stakes index (+ current-stake amount-less-fee)) err-category-not-found)})
    )

    (map-set stake-balances {market-id: market-id, user: sender}
        (unwrap! (replace-at? current-stake-balances index (+ current-user-stake amount-less-fee)) err-category-not-found)
    )

    (try! (contract-call? .bme030-0-reputation-token mint tx-sender u4 u3))
    (print {event: "market-stake", market-id: market-id, index: index, amount: amount, amount-less-fee: amount-less-fee, voter: sender})
    (ok index)
  )
)

(define-read-only (verify-segwit 
    (height uint)
    (wtx (buff 4096))
    (header (buff 80))
    (tx-index uint)
    (tree-depth uint)
    (wproof (list 14 (buff 32)))
    (witness-merkle-root (buff 32))
    (witness-reserved-value (buff 32))
    (ctx (buff 1024))
    (cproof (list 14 (buff 32)))
  )
  ;; commented out for testing on stacks testnet which is running on bitcoin regtest!
  (match (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.clarity-bitcoin-lib-v5 was-segwit-tx-mined-compact height wtx header tx-index tree-depth wproof witness-merkle-root witness-reserved-value ctx cproof)
    result (ok true)
    err err-transaction-segwit)
)

(define-read-only (verify-legacy 
    (height uint)
    (wtx (buff 4096))
    (header (buff 80))
    (proof { tx-index: uint, hashes: (list 14 (buff 32)), tree-depth: uint})
  )
  (match (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.clarity-bitcoin-lib-v5 was-tx-mined-compact height wtx header proof)
    result (ok true)
    err err-transaction-legacy)
)

(define-read-only (get-output-legacy (tx (buff 4096)) (index uint))
  (let
    (
      (parsed-tx (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.clarity-bitcoin-lib-v5 parse-tx tx))
    )
    (match parsed-tx
      result
      (let
        (
          (tx-data (unwrap-panic parsed-tx))
          (outs (get outs tx-data))
          (out (unwrap! (element-at? outs index) err-element-expected))
          (scriptPubKey (get scriptPubKey out))
          (value (get value out)) 
        )
          (ok { scriptPubKey: scriptPubKey, value: value })
      )
      missing err-element-expected
    )
  )
)

(define-read-only (get-output-segwit (tx (buff 4096)) (index uint))
  (let
    (
      (parsed-tx (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.clarity-bitcoin-lib-v5 parse-wtx tx false))
    )
    (match parsed-tx
      result
      (let
        (
          (tx-data (unwrap-panic parsed-tx)) 
          (outs (get outs tx-data)) 
          (out (unwrap! (element-at? outs index) err-transaction-segwit))
          (scriptPubKey (get scriptPubKey out))
          (value (get value out)) 
        )
        (ok { scriptPubKey: scriptPubKey, value: value })
      )
      missing err-transaction
    )
  )
)

(define-read-only (parse-payload-legacy (tx (buff 4096)))
  (match (get-output-legacy tx u0)
    parsed-result
    (let
      (
        (script (get scriptPubKey parsed-result))
        (script-len (len script))
        ;; lenght is dynamic one or two bytes!
        (offset (if (is-eq (unwrap! (element-at? script u1) err-element-expected) 0x4C) u3 u2)) 
        (payload (unwrap! (slice? script offset script-len) err-element-expected))
      )
      (asserts! (> (len payload) u2) err-element-expected)
      (ok (from-consensus-buff? { i: uint, o: uint, p: principal } payload))
    )
    not-found err-element-expected
  )
)

(define-read-only (parse-payload-segwit (tx (buff 4096)))
  (match (get-output-segwit tx u0)
    result
    (let
      (
        (script (get scriptPubKey result))
        (script-len (len script))
        ;; lenght is dynamic one or two bytes!
        (offset (if (is-eq (unwrap! (element-at? script u1) err-element-expected) 0x4C) u3 u2)) 
        (payload (unwrap! (slice? script offset script-len) err-element-expected))
      )
      (ok (from-consensus-buff? { i: uint, o: uint, p: principal } payload))
    )
    not-found err-element-expected
  )
)
;; -------------------------------------------------------------------------------------------------


;; Resolve a market invoked by ai-agent.
(define-public (resolve-market (market-id uint) (category (string-ascii 64)))
  (let (
        (md (unwrap! (map-get? markets market-id) err-market-not-found))
        (index (unwrap! (index-of? (get categories md) category) err-category-not-found))
    )
    (asserts! (is-eq tx-sender (var-get resolution-agent)) err-unauthorised)
    (asserts! (is-eq (get resolution-state md) RESOLUTION_OPEN) err-market-wrong-state)

    (map-set markets market-id
      (merge md
        { outcome: (some index), resolution-state: RESOLUTION_RESOLVING, resolution-burn-height: burn-block-height }
      )
    )
    (print {event: "resolve-market", market-id: market-id, outcome: index, category: category, resolver: tx-sender, resolution-state: RESOLUTION_RESOLVING, resolution-burn-height: burn-block-height})
    (ok index)
  )
)

(define-public (resolve-market-undisputed (market-id uint))
  (let (
        (md (unwrap! (map-get? markets market-id) err-market-not-found))
    )
    (asserts! (> burn-block-height (+ (get resolution-burn-height md) (var-get dispute-window-length))) err-dispute-window-not-elapsed)
    (asserts! (is-eq (get resolution-state md) RESOLUTION_RESOLVING) err-market-not-open)

    (map-set markets market-id
      (merge md
        { concluded: true, resolution-state: RESOLUTION_RESOLVED, resolution-burn-height: burn-block-height }
      )
    )
    (print {event: "resolve-market-undisputed", market-id: market-id, resolution-burn-height: burn-block-height, resolution-state: RESOLUTION_RESOLVED})
    (ok true)
  )
)

;; concludes a market that has been disputed. This method has to be called at least
;; dispute-window-length blocks after the dispute was raised - the voting window.
;; a proposal with 0 votes will close the market with the outcome false
(define-public (resolve-market-vote (market-id uint) (outcome uint))
  (let (
        (md (unwrap! (map-get? markets market-id) err-market-not-found))
    )
    (try! (is-dao-or-extension))
    (asserts! (< outcome (len (get categories md))) err-market-not-found)
    (asserts! (or (is-eq (get resolution-state md) RESOLUTION_DISPUTED) (is-eq (get resolution-state md) RESOLUTION_RESOLVING)) err-market-wrong-state)

    (map-set markets market-id
      (merge md
        { concluded: true, outcome: (some outcome), resolution-state: RESOLUTION_RESOLVED }
      )
    )
    (print {event: "resolve-market-vote", market-id: market-id, resolver: contract-caller, outcome: outcome, resolution-state: RESOLUTION_RESOLVED})
    (ok true)
  )
)

;; Allows a user with a stake in market to contest the resolution
;; the call is made via the voting contract 'create-market-vote' function
(define-public (dispute-resolution (market-id uint) (disputer principal))
  (let (
        (md (unwrap! (map-get? markets market-id) err-market-not-found)) 
        (stake-data (unwrap! (map-get? stake-balances { market-id: market-id, user: disputer }) err-disputer-must-have-stake)) 
    )
    ;; user call create-market-vote in the voting contract to start a dispute
    (try! (is-dao-or-extension))

    ;; prevent market getting locked in unresolved state
    (asserts! (<= burn-block-height (+ (get resolution-burn-height md) (var-get dispute-window-length))) err-dispute-window-elapsed)

    (asserts! (is-eq (get resolution-state md) RESOLUTION_RESOLVING) err-market-not-resolving) 
    (asserts! (<= burn-block-height (+ (get resolution-burn-height md) (var-get dispute-window-length))) err-dispute-window-elapsed)

    (map-set markets market-id
      (merge md { resolution-state: RESOLUTION_DISPUTED }))
    (print {event: "dispute-resolution", market-id: market-id, disputer: disputer, resolution-state: RESOLUTION_DISPUTED})
    (ok true)
  )
)
(define-public (force-resolve-market (market-id uint))
  (let (
    (md (unwrap! (map-get? markets market-id) err-market-not-found))
    (elapsed (- burn-block-height (get resolution-burn-height md)))
  )
  (begin
    (asserts! (> elapsed (var-get resolution-timeout)) err-market-wrong-state)
    (asserts! (is-eq (get resolution-state md) RESOLUTION_DISPUTED) err-market-wrong-state)

    (map-set markets market-id
      (merge md { resolution-state: RESOLUTION_RESOLVED, concluded: true })
    )
    (print {event: "force-resolve", market-id: market-id, resolution-state: RESOLUTION_RESOLVED})
    (ok true)
  ))
)

;; Claim winnings (for users who staked on the correct category)
(define-public (claim-winnings (market-id uint))
  (let 
    (
      (market-data (unwrap! (map-get? markets market-id) err-market-not-found))
      (user-stake-list (unwrap! (map-get? stake-balances { market-id: market-id, user: tx-sender }) err-user-not-staked))
      (index-won (unwrap! (get outcome market-data) err-market-wrong-state))
      (user-stake (unwrap! (element-at? user-stake-list index-won) err-user-not-staked))
      (stake-list (get stakes market-data))
      (winning-pool (unwrap! (element-at? stake-list index-won) err-market-wrong-state))
      (total-pool (fold + stake-list u0))
    )

    ;; Check if market is concluded
    (asserts! (is-eq (get resolution-state market-data) RESOLUTION_RESOLVED) err-market-not-concluded)
    (asserts! (get concluded market-data) err-market-not-concluded)
    ;; Determine user stake and winning pool
    (asserts! (> user-stake u0) err-user-not-winner-or-claimed)
    (asserts! (> winning-pool u0) err-amount-too-low)

      ;; Claim winnings
    (claim-winnings-internal market-id user-stake winning-pool total-pool index-won)
  )
)

;; needed for markets with no winner - in this case, tokens accrued are transferred to the dao treasury
(define-public (transfer-losing-stakes (market-id uint))
  (let (
        (md (unwrap! (map-get? markets market-id) err-market-not-found))
        (stakes (get stakes md))
        (winning-index (unwrap! (get outcome md) err-market-not-concluded))
        (balance (fold + stakes u0))
    )
    ;; Ensure market is concluded and winning category is empty
    (asserts! (is-eq (get resolution-state md) RESOLUTION_RESOLVED) err-market-not-concluded)
    (asserts! (is-eq u0 (unwrap! (element-at? stakes winning-index) err-element-expected)) err-winning-stake-not-zero)
    (asserts! (> balance u0) err-losing-stake-is-zero)
    (as-contract
      (begin
        (if (> balance u0)
          (try! (contract-call? token transfer balance tx-sender (var-get dao-treasury) none))
          true
        )
      )
    )
    (print {event: "transfer-losing-stakes", market-id: market-id, balance: balance})
    (ok true)
  )
)

(define-private (claim-winnings-internal 
  (market-id uint) 
  (user-stake uint) 
  (winning-pool uint) 
  (total-pool uint) 
  (index-won uint))
  (let (
        (md (unwrap! (map-get? markets market-id) err-market-not-found))
        (original-sender tx-sender)
        (treasury (get treasury md))
        (market-fee-bips (get market-fee-bips md))
        (user-share (if (> winning-pool u0) (/ (* user-stake total-pool) winning-pool) u0))
        (daofee (/ (* user-share (var-get dao-fee-bips)) u10000))
        (marketfee (/ (* user-share market-fee-bips) u10000))
        (user-share-net (- user-share (+ daofee marketfee)))
    )
    (begin
      ;; Ensure inputs are valid
      (asserts! (> winning-pool u0) err-amount-too-low)
      (asserts! (> user-share-net u0) err-user-share-is-zero)
      (asserts! (> daofee u0) err-dao-fee-bips-is-zero)

      ;; Perform transfers
      (as-contract
        (begin
          ;; Transfer user share, capped by initial contract balance

          ;;(try! (stx-transfer? user-share-net tx-sender original-sender))
          ;;(try! (stx-transfer? daofee tx-sender (var-get dao-treasury)))

          (if (> user-share-net u0) 
            (try! (contract-call? token transfer user-share-net tx-sender original-sender none))
            true
          )
          (if (> daofee u0)
            (try! (contract-call? token transfer daofee tx-sender (var-get dao-treasury) none))
            true
          )
          (if (> marketfee u0) 
            (try! (contract-call? token transfer marketfee tx-sender treasury none))
            true
          )
        )
      )

      ;; Zero out user stake
      (map-set stake-balances { market-id: market-id, user: tx-sender } (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0))

      ;; Log and return user share
      (try! (contract-call? .bme030-0-reputation-token mint tx-sender u6 u2))
      (print {event: "claim-winnings", market-id: market-id, index-won: index-won, claimer: tx-sender, user-stake: user-stake, user-share: user-share-net, marketfee: marketfee, daofee: daofee, winning-pool: winning-pool, total-pool: total-pool})
      (ok user-share-net)
    )
  )
)

;; the funds have arrived on bitcoin - so the sender here is the big market sbtc liquidity pool
(define-private (process-stake-transfer (amount uint))
  (let (
        ;;(sender-balance (stx-get-balance tx-sender))
        (sender-balance (unwrap! (contract-call? token get-balance .bme023-0-market-bitcoin) err-insufficient-balance))
        (fee (calculate-fee amount (var-get dev-fee-bips)))
        (transfer-amount (- amount fee))
       )
    (begin
      ;; Ensure amount is valid
      (asserts! (>= amount u100) err-amount-too-low)
      ;; Check tx-sender's balance
      (asserts! (>= sender-balance amount) err-insufficient-balance)
      
      ;; assume here the contract has the funds to cover payouts.
      ;; in fact the liquidity will come from direct sbtc into this contract from the bitcoin staking address
      ;; (try! (contract-call? token transfer transfer-amount tx-sender .bme023-0-market-predicting none))
      (try! (as-contract (contract-call? token transfer fee .bme023-0-market-bitcoin (var-get dev-fund) none)))

      (ok transfer-amount)
    )
  )
)
(define-private (calculate-fee (amount uint) (fee-bips uint))
  (let ((fee (/ (* amount fee-bips) u10000)))
    fee
  )
)
