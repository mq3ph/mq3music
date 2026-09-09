# MQ3 automatic PayPal recovery

## Install in this order

1. In the EXISTING MQ3 Neon database SQL Editor, run paypal-webhook-migration.sql. It creates paypal_checkouts and does not change old balances. Do this BEFORE uploading code: account history and admin queries now use this table.
2. Extract MQ3-PayPal-Webhook.zip. Upload public, src, tests and the two document/SQL files to the existing GitHub repository root, preserving folders. Replace matching files and add new files. Keep all other repository files. Wait for the deployment to become Ready.
3. In PayPal Developer, select the correct mode (Live for your current production website), then Apps & Credentials, then your MQ3 REST app. Find Webhooks and choose Add Webhook. Use this exact URL:

   https://www.mq3music.com/api/paypal/webhook

4. Subscribe to these two events:
   - CHECKOUT.ORDER.APPROVED
   - PAYMENT.CAPTURE.COMPLETED
5. Save and copy the registered Webhook ID (not Client ID or Secret).
6. In Vercel project environment variables, add PAYPAL_WEBHOOK_ID for Production, using that ID. Keep PAYPAL_ENV=live and your matching Live Client ID and Secret. Redeploy and wait for Ready. The webhook ID, credentials and mode must all belong to the same PayPal app/environment.

No live settings were changed by this local patch. Without registration and PAYPAL_WEBHOOK_ID, browser-return confirmation still works but webhook delivery cannot be verified.

## What this does

After buyer approval, PayPal can notify MQ3 even if the browser closes. MQ3 verifies the webhook with PayPal, fetches the stored order from PayPal, checks the order's environment, custom ID, currency and amount, then captures an approved order. Only a completed capture grants live credits. Browser returns and webhooks use the same atomic SQL wallet update. Repeated notifications do not add credits twice. Database/PayPal errors return a non-success response so PayPal can retry; there is no unawaited background task after the response.

The completed-capture webhook recovers captures that were held/pending or interrupted. The provider order ID and capture ID are recorded in paypal_checkouts. Events for unrelated orders are ignored. Newly tracked automatic orders cannot be manually approved/rejected from Credit Loads.

## Sandbox separation

New Sandbox orders are labelled SANDBOX TEST in the wallet and admin Credit Loads. Successful tests mark their order complete but add ZERO spendable credits. Live payments remain normal credit purchases. The popup states that a sandbox test completed, rather than claiming real credits were added.

Existing records have no trustworthy environment marker; they remain Legacy / manual. The prior 100 test credits already in your wallet are NOT removed. Existing legacy pending PayPal checkouts do not get automatic recovery: reconcile them against the correct PayPal environment before manually reviewing them. Do not relabel old payments as Live by guessing. Already completed payments remain in the existing wallet/history.

Do not switch production to Sandbox while customers are paying. Use a separate Vercel test project with a separate Neon database and Sandbox credentials/webhook ID. Update its APP_URL and webhook URL to that test project's domain. This patch does not provision that separate project.

## Verify

On the separate Sandbox installation, create a NEW checkout after this update. Approve it with a Personal Sandbox buyer and close the checkout browser before MQ3 returns. In PayPal webhook delivery history, check for successful delivery. On reopening MQ3, the transaction should show Test completed, and the spendable wallet balance must remain unchanged. Resend the real event from PayPal's delivery history to check duplicate handling. Use a real Sandbox checkout: PayPal's generic Webhook Simulator payloads are not linked to your stored orders and are not accepted as payments.

For Live, a different real buyer must complete a real payment. Check the corresponding amount in PayPal Activity and that MQ3 credits exactly once. No live transaction was performed during development.

If delivery fails, inspect Vercel runtime logs for /api/paypal/webhook and PayPal's delivery history. Recheck that PAYPAL_WEBHOOK_ID is the registered ID from the same mode/app. After fixing settings and redeploying, resend the event from PayPal if necessary.

## Validation and limits

19 individual server checks (20 including the parent test) passed using mocked PayPal responses and local PGlite PostgreSQL for the actual wallet SQL; this includes replay, concurrent handlers, database interruption, failed signatures, pending captures and environment mismatch. Six mobile Chrome scenarios passed. Admin build passed. These are local tests, not PayPal signature verification against a real registered app; end-to-end registered webhook delivery must still be tested after setup.

Older upload/access tests have known pre-existing fixture failures in the supplied project; this patch does not address them.

This update covers one-time wallet credit purchases. It does not implement recurring subscriptions, refunds, chargeback reversals or automatic recovery after PayPal exhausts its delivery retries. Refunds/disputes still need manual review. No existing schema or balance is erased.

Developer checks: node --test tests/paypal.test.js tests/paypal-webhook.test.js. PostgreSQL test requires @electric-sql/pglite or MQ3_PGLITE_MODULE pointing to its installed module; otherwise that test explicitly skips. Browser checks require Playwright (or MQ3_PLAYWRIGHT_MODULE) and Chrome: node tests/paypal-browser.cjs.

Official references:
- https://developer.paypal.com/api/rest/webhooks/rest/
- https://developer.paypal.com/api/rest/webhooks/event-names/
- https://developer.paypal.com/api/rest/reference/idempotency/
