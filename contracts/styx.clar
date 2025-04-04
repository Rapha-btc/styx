;; ---- Constants ----
(define-constant ERR-OUT-OF-BOUNDS u104)
(define-constant ERR_TX_VALUE_TOO_SMALL (err u105))
(define-constant ERR_TX_NOT_SENT_TO_POOL (err u106))
(define-constant ERR_NOT_PROCESSED (err u107))
(define-constant ERR_BTC_TX_ALREADY_USED (err u109)) 
(define-constant ERR_IN_COOLDOWN (err u110))
(define-constant ERR_FORBIDDEN (err u114))
(define-constant ERR_AMOUNT_NULL (err u115))
(define-constant ERR_INSUFFICIENT_POOL_BALANCE (err u132))
(define-constant ERR_NATIVE_FAILURE (err u99)) 
(define-constant ERR-TRANSACTION-SEGWIT (err u130))
(define-constant ERR-TRANSACTION (err u131))
(define-constant ERR-ELEMENT-EXPECTED (err u129))
(define-constant ERR_NOT_SIGNALED (err u133))
(define-constant ERR_IN_COOLOFF (err u134))
(define-constant ERR_INVALID_STX_RECEIVER (err u135))
(define-constant ERR_INVALID_ID (err u136))
(define-constant ERR_ALREADY_DONE (err u137))
(define-constant ERR_DEPOSIT_TOO_LARGE (err u138))

(define-constant FEE-RECEIVER 'SMHAVPYZ8BVD0BHBBQGY5AQVVGNQY4TNHAKGPYP)
(define-constant OPERATOR_STYX 'SMH8FRN30ERW1SX26NJTJCKTDR3H27NRJ6W75WQE) 
(define-constant COOLDOWN u24) ;; 4 hours extreme cautious 
(define-constant MIN_SATS u10000) ;; min 10k satoshis 0.0001
(define-constant FIXED_FEE u2000)
(define-constant WITHDRAWAL_COOLOFF u144) ;; 24 hours

;; ---- Data structures ----

;; Counter for processed transactions
(define-data-var processed-tx-count uint u1)

;; Pool structure to track sBTC liquidity (single pool per contract)
(define-data-var pool 
  {
    total-sbtc: uint, ;; Total sBTC amount originally deposited
    available-sbtc: uint,
    btc-receiver: (buff 40), ;; BTC address of the operator
    last-updated: uint,
    withdrawal-signaled-at: (optional uint),
    max-deposit: uint,
    add-liq-signaled-at: (optional uint),
    set-max-deposit-signaled-at: (optional uint)
  }
  {
    total-sbtc: u0,
    available-sbtc: u0,
    btc-receiver: 0x0000000000000000000000000000000000000000,
    last-updated: u0,
    withdrawal-signaled-at: none,
    max-deposit: u1000000,
    add-liq-signaled-at: none,
    set-max-deposit-signaled-at: none
  }
)

;; Track processed BTC transactions
(define-map processed-btc-txs 
  (buff 128)  ;; BTC transaction ID
  {
    btc-amount: uint,
    sbtc-amount: uint,
    stx-receiver: principal,
    processed-at: uint,
    tx-number: uint
  }
)

;; ---- Helper functions ----

;; Read 32-bit unsigned integer in little-endian format
(define-read-only (read-uint32 (ctx { txbuff: (buff 4096), index: uint}))
		(let ((data (get txbuff ctx))
					(base (get index ctx)))
				(ok {uint32: (buff-to-uint-le (unwrap-panic (as-max-len? (unwrap! (slice? data base (+ base u4)) (err ERR-OUT-OF-BOUNDS)) u4))),
						 ctx: { txbuff: data, index: (+ u4 base)}})))

;; Find output in BTC transaction for a given address
(define-private (find-out (entry {scriptPubKey: (buff 128), value: (buff 8)}) (result {pubscriptkey: (buff 40), out: (optional {scriptPubKey: (buff 128), value: uint})}))
  (if (is-eq (get scriptPubKey entry) (get pubscriptkey result))
    (merge result {out: (some {scriptPubKey: (get scriptPubKey entry), value: (get uint32 (unwrap-panic (read-uint32 {txbuff: (get value entry), index: u0})))})})
    result))

;; Get BTC output value for a given address
(define-public (get-out-value (tx {
    version: (buff 4),
    ins: (list 8
      {outpoint: {hash: (buff 32), index: (buff 4)}, scriptSig: (buff 256), sequence: (buff 4)}),
    outs: (list 8
      {value: (buff 8), scriptPubKey: (buff 128)}),
    locktime: (buff 4)}) (pubscriptkey (buff 40)))
    (ok (fold find-out (get outs tx) {pubscriptkey: pubscriptkey, out: none})))

;; ---- Pool initialization ----

(define-public (signal-add-liquidity)
  (let (
        (current-pool (var-get pool))
      )
    ;; Verify caller is the operator
    (asserts! (is-eq tx-sender OPERATOR_STYX) ERR_FORBIDDEN)
    
    ;; Set signal timestamp
    (var-set pool (merge current-pool { 
      add-liq-signaled-at: (some burn-block-height)
    }))
    
    (print {
      type: "signal-add-liquidity",
      signaled-at: burn-block-height
    })
    
    (ok true)
  )
)

(define-public (signal-set-max-deposit)
  (let (
        (current-pool (var-get pool))
      )
    ;; Verify caller is the operator
    (asserts! (is-eq tx-sender OPERATOR_STYX) ERR_FORBIDDEN)
    
    ;; Set signal timestamp
    (var-set pool (merge current-pool { 
      set-max-deposit-signaled-at: (some burn-block-height)
    }))
    
    (print {
      type: "signal-set-max-deposit",
      signaled-at: burn-block-height
    })
    
    (ok true)
  )
)

;; Initialize or add liquidity to pool
(define-public (add-liquidity-to-pool (sbtc-amount uint) (btc-receiver (optional (buff 40))))
  (let (
        (current-pool (var-get pool))
        (this-bitcoin-receiver (default-to (get btc-receiver current-pool) btc-receiver))
        (new-total (+ (get total-sbtc current-pool) sbtc-amount))
        (new-available (+ (get available-sbtc current-pool) sbtc-amount))
        (signaled-at (default-to u0 (get add-liq-signaled-at current-pool)))
      )
    (asserts! (not (is-eq signaled-at u0)) ERR_NOT_SIGNALED)
    (asserts! (> burn-block-height (+ signaled-at COOLDOWN)) ERR_IN_COOLDOWN)
    ;; Verify caller is the operator
    (asserts! (is-eq tx-sender OPERATOR_STYX) ERR_FORBIDDEN)
    
    ;; Verify parameters
    (asserts! (> sbtc-amount u0) ERR_AMOUNT_NULL)
    
    ;; Transfer sBTC to contract
    (match (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token 
                transfer sbtc-amount tx-sender (as-contract tx-sender) none)
      success 
      (begin
        ;; Update pool - set or update BTC receiver if provided
        (var-set pool (merge current-pool 
                  {
                    total-sbtc: new-total,
                    available-sbtc: new-available,
                    btc-receiver: this-bitcoin-receiver,
                    last-updated: burn-block-height,
                    add-liq-signaled-at: none 
                  }))
        
        (print {
          type: "add-liquidity",
          operator: tx-sender,
          sbtc: sbtc-amount,
          btc-receiver: this-bitcoin-receiver,
          total-sbtc: new-total,
          available-sbtc: new-available,
          last-updated: burn-block-height
        })
        (ok true)
      )
      error (err (* error u1000))
    )
  )
)

;; to update the maximum deposit limit
(define-public (set-max-deposit (new-max-deposit uint))
  (let (
        (current-pool (var-get pool))
        (signaled-at (default-to u0 (get set-max-deposit-signaled-at current-pool)))
      )
    (asserts! (not (is-eq signaled-at u0)) ERR_NOT_SIGNALED)
    (asserts! (> burn-block-height (+ signaled-at COOLDOWN)) ERR_IN_COOLDOWN)

    ;; Verify caller is the operator
    (asserts! (is-eq tx-sender OPERATOR_STYX) ERR_FORBIDDEN)
    
    ;; Verify amount is more than min 
    (asserts! (> new-max-deposit MIN_SATS) ERR_AMOUNT_NULL)
    
    ;; Update max-deposit
    (var-set pool (merge current-pool { last-updated: burn-block-height, max-deposit: new-max-deposit, set-max-deposit-signaled-at: none }))
    
    (print {
      type: "set-max-deposit",
      max-deposit: new-max-deposit,
      set-max-deposit-signaled-at: none,
      last-updated: burn-block-height})
    
    (ok true)
  )
)

;; Signal intent to withdraw on chain
(define-public (signal-withdrawal)
  (let (
        (current-pool (var-get pool))
      )
    ;; Verify caller is the operator
    (asserts! (is-eq tx-sender OPERATOR_STYX) ERR_FORBIDDEN)
    
    ;; Verify there is available balance to withdraw
    (asserts! (> (get available-sbtc current-pool) u0) ERR_INSUFFICIENT_POOL_BALANCE)
    
    ;; Set withdrawal signal
    (var-set pool (merge current-pool 
      { withdrawal-signaled-at: (some burn-block-height) }))
    
    (print {
      type: "signal-withdrawal",
      withdrawal-signaled-at: burn-block-height
    })
    
    (ok true)
  )
)

;; Withdraw remaining sBTC from pool (operator only)
(define-public (withdraw-from-pool)
  (let (
        (current-pool (var-get pool))
        (available-sbtc (get available-sbtc current-pool))
      )
    ;; Verify caller is the operator
    (asserts! (is-eq tx-sender OPERATOR_STYX) ERR_FORBIDDEN)
    
    ;; Verify there is available balance
    (asserts! (> available-sbtc u0) ERR_INSUFFICIENT_POOL_BALANCE)
    
        ;; Verify withdrawal was signaled
    (match (get withdrawal-signaled-at current-pool)
      some-height 
        (begin
          ;; Verify cool-off period has passed
          (asserts! (> burn-block-height (+ some-height WITHDRAWAL_COOLOFF)) ERR_IN_COOLOFF)
          ;; Update pool - set available to 0
          (var-set pool (merge current-pool { available-sbtc: u0, withdrawal-signaled-at: none }))
    
          ;; Transfer sBTC to operator
          (try! (as-contract (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token 
                    transfer available-sbtc tx-sender OPERATOR_STYX none)))
                
          (print {
             type: "withdraw-from-pool",
             sbtc-amount: available-sbtc
           })
        
          (ok available-sbtc))
        ERR_NOT_SIGNALED)
  )
)

;; ---- BTC processing functions ----

;; Parse the payload from a segwit transaction
(define-read-only (parse-payload-segwit (tx (buff 4096)))
  (match (get-output-segwit tx u0)
    result
    (let
      (
        (script (get scriptPubKey result))
        (script-len (len script))
        ;; lenght is dynamic one or two bytes!
        (offset (if (is-eq (unwrap! (element-at? script u1) ERR-ELEMENT-EXPECTED) 0x4C) u3 u2)) 
        (payload (unwrap! (slice? script offset script-len) ERR-ELEMENT-EXPECTED))
      )
      (ok (from-consensus-buff? { p: principal } payload))
    )
    not-found ERR-ELEMENT-EXPECTED
  )
)

(define-read-only (parse-payload-segwit-refund (tx (buff 4096)))
  (match (get-output-segwit tx u0)
    result
    (let
      (
        (script (get scriptPubKey result))
        (script-len (len script))
        ;; lenght is dynamic one or two bytes!
        (offset (if (is-eq (unwrap! (element-at? script u1) ERR-ELEMENT-EXPECTED) 0x4C) u3 u2)) 
        (payload (unwrap! (slice? script offset script-len) ERR-ELEMENT-EXPECTED))
      )
      (ok (from-consensus-buff? { i: uint } payload))
    )
    not-found ERR-ELEMENT-EXPECTED
  )
)

;; Get output from a segwit transaction
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
          (out (unwrap! (element-at? outs index) ERR-TRANSACTION-SEGWIT))
          (scriptPubKey (get scriptPubKey out))
          (value (get value out)) 
        )
        (ok { scriptPubKey: scriptPubKey, value: value })
      )
      missing ERR-TRANSACTION
    )
  )
)

;; Process a BTC deposit and release sBTC - can be called by anyone
(define-public (process-btc-deposit
    (height uint) 
    (wtx {version: (buff 4),
      ins: (list 8
        {outpoint: {hash: (buff 32), index: (buff 4)}, scriptSig: (buff 256), sequence: (buff 4)}),
      outs: (list 8
        {value: (buff 8), scriptPubKey: (buff 128)}),
      locktime: (buff 4)})
    (witness-data (buff 1650))
    (header (buff 80)) 
    (tx-index uint) 
    (tree-depth uint) 
    (wproof (list 14 (buff 32))) 
    (witness-merkle-root (buff 32)) 
    (witness-reserved-value (buff 32)) 
    (ctx (buff 1024)) 
    (cproof (list 14 (buff 32)))) 
  (let (
        (current-pool (var-get pool))
        (btc-receiver (get btc-receiver current-pool))
        (tx-buff (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.bitcoin-helper-wtx-v1 concat-wtx wtx witness-data))
      )
    
    (asserts! (> burn-block-height (+ (get last-updated current-pool) COOLDOWN)) ERR_IN_COOLDOWN)

    ;; Verify Bitcoin transaction proof
    (match (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.clarity-bitcoin-lib-v5 was-segwit-tx-mined-compact
                    height 
                    tx-buff 
                    header 
                    tx-index 
                    tree-depth 
                    wproof 
                    witness-merkle-root 
                    witness-reserved-value 
                    ctx 
                    cproof)
      result
        (begin
          ;; Verify transaction is not already used
          (asserts! (is-none (map-get? processed-btc-txs result)) ERR_BTC_TX_ALREADY_USED)
          
          ;; Verify BTC was sent to correct address
          (match (get out (unwrap! (get-out-value wtx btc-receiver) ERR_NATIVE_FAILURE))
            out (if (>= (get value out) MIN_SATS)
              (let (
                    (btc-amount (get value out))
                    (payload (unwrap! (parse-payload-segwit tx-buff) ERR-ELEMENT-EXPECTED))
                    (stx-receiver (unwrap! (get p payload) ERR-ELEMENT-EXPECTED))
                    (sbtc-amount-out (- btc-amount FIXED_FEE))
                    (available-sbtc (get available-sbtc current-pool))
                    (current-count (var-get processed-tx-count))
                    (max-deposit (get max-deposit current-pool))
                   ) 
                   
                   ;; Verify sufficient balance in pool
                   (asserts! (<= btc-amount available-sbtc) ERR_INSUFFICIENT_POOL_BALANCE)
                   (asserts! (<= btc-amount max-deposit) ERR_DEPOSIT_TOO_LARGE)
                   
                   ;; Record processed transaction
                   (map-set processed-btc-txs result 
                     {
                       btc-amount: btc-amount,
                       sbtc-amount: sbtc-amount-out,
                       stx-receiver: stx-receiver,
                       processed-at: burn-block-height,
                       tx-number: current-count
                     })
                    
                    (var-set processed-tx-count (+ current-count u1))

                   ;; Update pool's available balance
                   (var-set pool 
                     (merge current-pool 
                       { available-sbtc: (- available-sbtc btc-amount) }
                     ))
                   
                   ;; Transfer fee to fee receiver
                   (try! (as-contract (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token 
                             transfer FIXED_FEE tx-sender FEE-RECEIVER none)))
                   
                   ;; Transfer sBTC to user
                   (try! (as-contract (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token 
                             transfer sbtc-amount-out tx-sender stx-receiver none)))
                   
                   (print {
                     type: "process-btc-deposit",
                     btc-tx-id: result,
                     btc-amount: btc-amount,
                     sbtc-amount-out: sbtc-amount-out,
                     stx-receiver: stx-receiver,
                     btc-receiver: btc-receiver,
                     when: burn-block-height,
                     processor: tx-sender
                   })
                   
                   (ok true))
            ERR_TX_VALUE_TOO_SMALL)
            ERR_TX_NOT_SENT_TO_POOL))
      error (err (* error u1000))))
)

;; ---- Read-only functions ----

;; Get pool information
(define-read-only (get-pool)
  (ok (var-get pool)))

;; Check if a transaction has been processed
(define-read-only (is-tx-processed (tx-id (buff 128)))
  (is-some (map-get? processed-btc-txs tx-id)))

;; Get transaction details
(define-read-only (get-processed-tx (tx-id (buff 128)))
  (match (map-get? processed-btc-txs tx-id)
    tx-info (ok tx-info)
    (err ERR_NOT_PROCESSED)))

;; ---- Edge case functions ----

;; Add a map to track refund requests
(define-map refund-requests
  uint  ;; refund-id
  {
    btc-tx-id: (buff 128),        ;; Original BTC transaction ID
    btc-tx-refund-id: (optional (buff 128)),
    btc-amount: uint,             ;; Original BTC amount
    btc-receiver: (buff 40),      ;; Where to send the BTC refund
    stx-receiver: principal,      ;; can only be requested by stx receiver
    requested-at: uint,           ;; When refund was requested
    done: bool                    ;; If refund has been processed
  }
)

(define-map processed-refunds (buff 128)  uint) ;; BTC transaction ID

;; Counter for refund requests
(define-data-var next-refund-id uint u1)

;; Request a refund for a BTC transaction
(define-public (request-refund
    (btc-refund-receiver (buff 40))
    (height uint) 
    (wtx {version: (buff 4),
      ins: (list 8
        {outpoint: {hash: (buff 32), index: (buff 4)}, scriptSig: (buff 256), sequence: (buff 4)}),
      outs: (list 8
        {value: (buff 8), scriptPubKey: (buff 128)}),
      locktime: (buff 4)})
    (witness-data (buff 1650))
    (header (buff 80)) 
    (tx-index uint) 
    (tree-depth uint) 
    (wproof (list 14 (buff 32))) 
    (witness-merkle-root (buff 32)) 
    (witness-reserved-value (buff 32)) 
    (ctx (buff 1024)) 
    (cproof (list 14 (buff 32))))
  (let (
        (tx-buff (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.bitcoin-helper-wtx-v1 concat-wtx wtx witness-data))
        (refund-id (var-get next-refund-id))
      )
    
    ;; Verify Bitcoin transaction included in Block and returns tsxId hash
    (match (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.clarity-bitcoin-lib-v5 was-segwit-tx-mined-compact
                    height 
                    tx-buff 
                    header 
                    tx-index 
                    tree-depth 
                    wproof 
                    witness-merkle-root 
                    witness-reserved-value 
                    ctx 
                    cproof)
      result
        (begin
          ;; Verify transaction is not already processed
          (asserts! (is-none (map-get? processed-btc-txs result)) ERR_BTC_TX_ALREADY_USED)
          
          ;; Extract STX receiver from transaction
          (match (get out (unwrap! (get-out-value wtx (get btc-receiver (var-get pool))) ERR_NATIVE_FAILURE))
            out (if (>= (get value out) MIN_SATS) 
              (let (
                    (btc-amount (get value out))
                    (payload (unwrap! (parse-payload-segwit tx-buff) ERR-ELEMENT-EXPECTED))
                    (stx-receiver (unwrap! (get p payload) ERR-ELEMENT-EXPECTED))
                  )
                  
                  ;; Verify caller is the STX receiver from transaction
                  (asserts! (is-eq tx-sender stx-receiver) ERR_INVALID_STX_RECEIVER)
                  
                  ;; Mark original transaction as used
                  (map-set processed-btc-txs result 
                    {
                      btc-amount: btc-amount,
                      sbtc-amount: (- btc-amount FIXED_FEE),
                      stx-receiver: stx-receiver,
                      processed-at: burn-block-height,
                      tx-number: u0
                    })

                  ;; Create refund request
                  (map-set refund-requests refund-id
                    {
                      btc-tx-id: result,
                      btc-tx-refund-id: none,
                      btc-amount: btc-amount,
                      btc-receiver: btc-refund-receiver,
                      stx-receiver: stx-receiver,
                      requested-at: burn-block-height,
                      done: false
                    })
                  
                  ;; Increment counters
                  (var-set next-refund-id (+ refund-id u1))
                  
                  (print {
                    type: "request-refund",
                    refund-id: refund-id,
                    btc-tx-id: result,
                    btc-amount: btc-amount,
                    btc-receiver: btc-refund-receiver,
                    stx-receiver: stx-receiver,
                    requested-at: burn-block-height,
                    done: false
                  })
                  
                  (ok refund-id))
            ERR_TX_VALUE_TOO_SMALL)
            ERR_TX_NOT_SENT_TO_POOL))
      error (err (* error u1000))))
)

;; Process a refund by providing proof of BTC return transaction
(define-public (process-refund
    (refund-id uint)
    (height uint) 
    (wtx {version: (buff 4),
      ins: (list 8
        {outpoint: {hash: (buff 32), index: (buff 4)}, scriptSig: (buff 256), sequence: (buff 4)}),
      outs: (list 8
        {value: (buff 8), scriptPubKey: (buff 128)}),
      locktime: (buff 4)})
    (witness-data (buff 1650))
    (header (buff 80)) 
    (tx-index uint) 
    (tree-depth uint) 
    (wproof (list 14 (buff 32))) 
    (witness-merkle-root (buff 32)) 
    (witness-reserved-value (buff 32)) 
    (ctx (buff 1024)) 
    (cproof (list 14 (buff 32)))) 
  (let (
        (refund (unwrap! (map-get? refund-requests refund-id) ERR_INVALID_ID))
        (tx-buff (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.bitcoin-helper-wtx-v1 concat-wtx wtx witness-data))
        (payload (unwrap! (parse-payload-segwit-refund tx-buff) ERR-ELEMENT-EXPECTED))
        (refund-id-extracted (unwrap! (get i payload) ERR-ELEMENT-EXPECTED))
        (btc-amount (get btc-amount refund))
      )

    (asserts! (>= burn-block-height (+ (get requested-at refund) COOLDOWN)) ERR_IN_COOLDOWN)
    (asserts! (not (get done refund)) ERR_ALREADY_DONE)
    (asserts! (is-eq refund-id-extracted refund-id) ERR_INVALID_ID)
    
    ;; Verify Bitcoin transaction prrefund anchored
    (match (contract-call? 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.clarity-bitcoin-lib-v5 was-segwit-tx-mined-compact
                    height 
                    tx-buff 
                    header 
                    tx-index 
                    tree-depth 
                    wproof 
                    witness-merkle-root 
                    witness-reserved-value 
                    ctx 
                    cproof)
      result
        (begin
          ;; Verify transaction is not already used
          (asserts! (is-none (map-get? processed-refunds result)) ERR_BTC_TX_ALREADY_USED)
            
          ;; Verify BTC amount sent to btc-receiver
          (match (get out (unwrap! (get-out-value wtx (get btc-receiver refund)) ERR_NATIVE_FAILURE))
              out (if (>= (get value out) btc-amount)
                (begin
                  ;; Mark refund as processed
                  (map-set refund-requests refund-id (merge refund { btc-tx-refund-id: (some result), done: true }))
                  (map-set processed-refunds result refund-id)

                  (print {
                    type: "process-refund",
                    refund-id: refund-id,
                    btc-tx-refund-id: result,
                    done: true
                  })
                  
                  (ok true))
                ERR_TX_VALUE_TOO_SMALL)
              ERR_TX_NOT_SENT_TO_POOL)
          )
      error (err (* error u1000))))
)

;; Get refund request information
(define-read-only (get-refund-request (refund-id uint))
  (match (map-get? refund-requests refund-id)
    refund (ok refund)
    (err ERR_INVALID_ID)))

;; Check if a refund transaction has been processed
(define-read-only (is-refund-processed (tx-id (buff 128)))
  (match (map-get? processed-refunds tx-id)
    refund-id (ok refund-id)
    (err ERR_NOT_PROCESSED)
  )
)

;; Get total refund requests count
(define-read-only (get-refund-count)
  (ok (var-get next-refund-id)))