;; Token Batch Transfer Contract
;; This contract provides batch transfer functionality for SIP-10 tokens
;; Allows sending tokens to multiple recipients in a single transaction

;; --- Batch Transfer

(define-public (send-many (recipients (list 200 { to: principal, amount: uint, memo: (optional (buff 34)) })))
  (fold check-err (map send-token recipients) (ok true)))

(define-private (check-err (result (response bool uint)) (prior (response bool uint)))
  (match prior ok-value result err-value (err err-value)))

(define-private (send-token (recipient { to: principal, amount: uint, memo: (optional (buff 34)) }))
  (send-token-with-memo (get amount recipient) (get to recipient) (get memo recipient)))

(define-private (send-token-with-memo (amount uint) (to principal) (memo (optional (buff 34))))
  (let ((transferOk (try! (contract-call? .token transfer amount tx-sender to memo))))
    (ok transferOk)))