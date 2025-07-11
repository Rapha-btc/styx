How initialize-pool Works
Yes, exactly! initialize-pool is a one-time bypass of the normal cooldown system. Here's how it works:
(define-public (initialize-pool
(sbtc-amount uint)
(btc-receiver (buff 40))
)

Key features:

One-time only: Uses (asserts! (not (var-get is-initialized)) ERR_ALREADY_DONE) to ensure it can only be called once
No cooldown: Unlike add-liquidity-to-pool which requires signaling + waiting 6 blocks, this adds liquidity immediately
Operator only: Only the current operator can call it
Bootstrap function: Sets up the initial pool state with sBTC and BTC receiver address

Normal liquidity flow:

signal-add-liquidity → wait 6 blocks → add-liquidity-to-pool

Initialize flow:

initialize-pool → done immediately

This is designed for initial pool setup where you want to bootstrap liquidity without the governance delays that apply to ongoing operations. Once initialized, all future liquidity additions must go through the normal signaling process.

An honest pool operator will call initialize-pool right after deployment and therefore cannot call it randomly afterward.
