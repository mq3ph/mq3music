MQ3 MP3 + Lyrics — manual email delivery

SETUP
1. Open mp3-requests-migration.sql and run its single CREATE TABLE statement in the Neon SQL editor for this MQ3 production database. It does not delete existing records.
2. Upload these files to their matching GitHub folders:
   public/app.js
   public/admin.bundle.js
   src/index.js
   src/admin-client.js
   src/mp3-requests.js
3. Commit and wait for Vercel Ready. Reload the listener page and admin.
No new environment variables or audio storage are needed.

BUYER
All published playable songs show Get MP3 + Lyrics · 50 Credits on their card and embedded player, independently of whether gifting is enabled. The server verifies that the song is published and has an audio source before charging. Existing paid requests remain available in admin even if gifts are later disabled. Confirmation shows the account email and manual delivery notice. The server charges exactly 50 Credits (bonus credits first, then purchased credits) and saves a paid request atomically. It does not count as a Crown gift. Reopening the button shows the existing order and status without a second charge. Refunded orders remain visible and cannot be purchased again automatically in this first version.

ADMIN
Open MP3 Requests. Search or filter Awaiting email / Sent / Refunded. Each row contains buyer, email, song, date, and the 50-credit payment.
Prepare email opens an editable message containing the order number and lyrics. Open email draft launches your configured email app; Copy message is available if you prefer Gmail manually. Attach the MP3 from your computer. Save lyrics .txt lets you attach lyrics too. Check the recipient and attachments, then send in your email app.
Return to the admin dialog, check I sent the email with the MP3 and lyrics, and choose Mark as sent. This is a manual confirmation, not verified inbox delivery.
Opening a draft never sends an email or marks an order sent. This update does not upload attachments to Vercel or extract embedded audio.
If you cannot fulfil an awaiting order, Refund 50 Credits restores the same credit buckets once. Sent orders cannot be refunded through this button. No records are deleted.

VALIDATION
Isolated database tests: login/origin protection, server-controlled price and recipient, repeated purchases charged once, insufficient funds, saved history, correct refund buckets and repeated refund protection, explicit sent status.
Mocked mobile browser: confirmation, saved order, repeat without charge, prepared email and lyrics, explicit sent checkbox. No real wallets or emails were used in testing.
