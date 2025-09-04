;; ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory
;; 44e400d1859fa99276ac21d862ab9633adea713896042b4f52ffd7cd0dcff65b
;; lemar1 Powered By Faktory.fun v1.0 

(impl-trait 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.faktory-trait-v1.sip-010-trait)
(impl-trait 'ST1Q9YZ2NY4KVBB08E005HAK3FSM8S3RX2WARP9Q1.aibtc-dao-traits.token)

(define-constant ERR-NOT-AUTHORIZED u401)
(define-constant ERR-NOT-OWNER u402)

(define-fungible-token LEMAR1 MAX)
(define-constant MAX u100000000000000000)
(define-data-var contract-owner principal 'ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-token-owner)
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json"))

;; SIP-10 Functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
       (asserts! (is-eq tx-sender sender) (err ERR-NOT-AUTHORIZED))
       (match (ft-transfer? LEMAR1 amount sender recipient)
          response (begin
            (print memo)
            (ok response))
          error (err error)
        )
    )
)

(define-public (set-token-uri (value (string-utf8 256)))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
        (var-set token-uri (some value))
        (ok (print {
              notification: "token-metadata-update",
              payload: {
                contract-id: (as-contract tx-sender),
                token-class: "ft"
              }
            })
        )
    )
)

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance LEMAR1 account))
)

(define-read-only (get-name)
  (ok "ai sbtc")
)

(define-read-only (get-symbol)
  (ok "LEMAR1")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply LEMAR1))
)

(define-read-only (get-token-uri)
    (ok (var-get token-uri))
)

(define-public (set-contract-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (print {new-owner: new-owner})
    (ok (var-set contract-owner new-owner))
  )
)

;; ---------------------------------------------------------

(define-public (send-many (recipients (list 200 { to: principal, amount: uint, memo: (optional (buff 34)) })))
  (fold check-err (map send-token recipients) (ok true))
)

(define-private (check-err (result (response bool uint)) (prior (response bool uint)))
  (match prior ok-value result err-value (err err-value))
)

(define-private (send-token (recipient { to: principal, amount: uint, memo: (optional (buff 34)) }))
  (send-token-with-memo (get amount recipient) (get to recipient) (get memo recipient))
)

(define-private (send-token-with-memo (amount uint) (to principal) (memo (optional (buff 34))))
  (let ((transferOk (try! (transfer amount tx-sender to memo))))
    (ok transferOk)
  )
)

;; ---------------------------------------------------------

(begin 
    ;; ft distribution
    (try! (ft-mint? LEMAR1 (/ (* MAX u80) u100) 'ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-treasury)) ;; 80% treasury
    (try! (ft-mint? LEMAR1 (/ (* MAX u16) u100) 'ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-faktory-dex)) 
    (try! (ft-mint? LEMAR1 (/ (* MAX u4) u100) 'ST2HH7PR5SENEXCGDHSHGS5RFPMACEDRN5EWQWKRW.lemar1-pre-faktory))

    (print { 
        type: "faktory-trait-v1", 
        name: "ai sbtc",
        symbol: "LEMAR1",
        token-uri: u"https://bncytzyfafclmdxrwpgq.supabase.co/storage/v1/object/public/tokens/60360b67-5f2e-4dfb-adc4-f8bf7c9aab85.json", 
        tokenContract: (as-contract tx-sender),
        supply: MAX, 
        decimals: u8, 
        targetStx: u5000000,
        tokenToDex: (/ (* MAX u16) u100),
        tokenToDeployer: (/ (* MAX u4) u100),
        stxToDex: u250000,
        stxBuyFirstFee: u150000,
    })
)