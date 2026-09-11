# Priority Name Requests

Run `priority-name-requests-migration.sql` once in the production Neon database before deploying this version.

Public flow:
- Free Request keeps the existing free name-request behavior.
- Priority · 50 Credits requires an MQ3 listener account and at least 50 Credits.
- The request is marked Priority only inside the same database transaction that deducts the 50 Credits and writes the credit ledger row.
- Repeated clicks on the same already-paid name/account return the existing paid Priority request and do not charge again.

Admin flow:
- Paid Priority requests are shown first and labelled `⭐ PRIORITY · PAID 50 Credits`.
- After linking/publishing the matching Name Song, use `Prepare MP3 + Lyrics` to open the manual email-delivery helper.
- Attach the MP3, send the email, then check the confirmation and mark the MP3 + Lyrics as sent.
