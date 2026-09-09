# MQ3 Share and Listener monitoring

Upload the public and src folders to the repository root, replace matching files, commit and wait for Vercel Ready. This patch includes the previous name-request and PayPal webhook changes. No new environment variables or migration are required for the existing MQ3 account database.

Share is available on each library song and in the player once a song is selected. It uses the device sharing menu when available. If unsupported/blocked, it copies the direct song link; if clipboard access is also blocked, it presents a selectable link. Cancelled sharing does not copy automatically. Links contain only the public song ID, never payment/access tokens. Opening the link selects the song in the library; it does not force autoplay.

Admin → Listeners shows total unique account records, unique accounts with a recorded 25-credit welcome-bonus transaction, and accounts whose last successful sign-in was within seven days. The list contains the latest 500 accounts, with email, display name, joined date, welcome-bonus date and last sign-in. Search applies to those displayed accounts. Overview totals cover all accounts. These are account counts, not a count of distinct human beings or total login attempts. Current balance is not used to infer whether a bonus was received.

The listener endpoint is under the existing admin authentication middleware. No bonus, balance, or account is modified by this update. Data comes from existing users and credit_transactions records. No real sharing/messages or emails were sent during development.

Local PostgreSQL tests verified admin-only access and unique bonus-recipient counts. Browser checks verified the Listeners tab, native share with mocks, blocked clipboard fallback, clean URLs and mobile layout. Actual TikTok share-sheet availability remains browser-dependent; the copy fallbacks remain available.
