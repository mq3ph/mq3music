# MQ3 PayPal fix — September 9, 2026

## Upload to your existing GitHub repository
Extract MQ3-PayPal-Fix.zip. Upload its contents into the repository root. Keep the src, public and tests folders intact. Replace matching files; do not delete the repository or flatten folders. Vercel should redeploy the commit.

Included application files:
- public/mq3-account.js — confirms PayPal return at startup and after sign-in; keeps the return URL until success for refresh/reconnect recovery; prevents overlapping confirmation calls.
- src/account.js — validates APP_URL, includes PayPal create request ID, accepts PAYPAL_SECRET or PAYPAL_CLIENT_SECRET, verifies capture identity/amount/currency/status.
- src/paypal.js — new required helper; reads existing captures before retry, uses stable capture request ID and recovers lost responses.
- pnpm-lock.yaml — brings the existing nodemailer dependency into the lockfile.
- pnpm-workspace.yaml — fixes the invalid esbuild approval placeholder.

## Vercel → Project → Settings → Environment Variables
Keep existing database, session and email settings. Set these in the same environment as the deployment:

APP_URL=https://mq3music-sable.vercel.app
PAYPAL_ENV=live
PAYPAL_CLIENT_ID=<your PayPal live REST app client ID>
PAYPAL_SECRET=<the secret from that same live REST app>

PAYPAL_CLIENT_SECRET is also supported as an alternative secret variable. Never upload secrets to GitHub or paste them into chat. If using a custom domain, APP_URL must match the address listeners actually use to sign in and pay, so their sign-in cookie remains available on return. Redeploy after changing environment variables.

For test payments use PAYPAL_ENV=sandbox and matching sandbox app credentials plus sandbox buyer account. Do not mix sandbox and live credentials.

## Verify after deployment
1. Sign in to MQ3, select a credit package, choose PayPal and complete checkout using sandbox first.
2. On returning to MQ3, confirm the wallet gains the selected credits once.
3. Refresh: no duplicate credits. If confirmation fails, keep the returned page and refresh to retry; do not create a second payment.
4. If asked to sign in, use the same MQ3 account that started checkout.

## Scope and validation
Fixes automatic one-time PayPal wallet credit loads. GCash manual review and existing song/membership purchase flows are unchanged. This does not add recurring PayPal subscriptions or background webhook processing: the buyer must return to MQ3 to finish confirmation. Pending or held PayPal captures are not credited until completed; refresh the return page later.

No database migration was added. This patch assumes the existing deployed account/wallet tables and one_credit_purchase_per_load_order uniqueness index already exist. The uploaded schema.sql does not include that account schema; this patch is for the existing installation, not a fresh database.

11 mocked PayPal/server checks passed; 5 Chrome mobile-size scenarios passed (success, retry, sign-in, cancel, already credited); production build passed. No real PayPal charge, live Vercel update, or live database credit was performed. Existing legacy upload/access tests fail in both the original ZIP and patched copy, beginning with missing BLOB_STORE_ID in the old fixture; those unrelated failures remain.

Run: node --test tests/paypal.test.js
Browser checks require Playwright and Chrome. Set MQ3_PLAYWRIGHT_MODULE to your installed Playwright module path if it is not locally installed, then run node tests/paypal-browser.cjs.

Reference: https://developer.paypal.com/api/rest/reference/idempotency/
