# MQ3 Name Request tracking

Upload the public and src folders from this ZIP to the existing repository root. Replace matching files, commit, and wait for Vercel Ready. No new database migration or environment variables are needed. This patch assumes the previously installed PayPal webhook migration remains present.

Name Request now shows all four stored statuses, filter counts, the linked/suggested song, Update request, Preview email, and the email date. Link a published Name Song before marking Available. Preview email retains the existing editable composer; emails send only when an admin explicitly presses Send Message. Emailed requests are protected against accidental editing/repeated sends. Duplicate name/email submissions receive an already-recorded message without creating another record.

The email template now links to /?song=SONG_ID, supported by the public player, instead of the old name-results URL. Existing Gmail configuration is used. No real emails were sent in development.

Validated with local PostgreSQL request lifecycle tests and Chrome admin interaction checks. No live deploy was performed. SMTP does not guarantee exactly-once delivery if the mail is accepted but the subsequent database update fails; check sent mail before retrying an uncertain send. This update does not add public request-status lookup or automatic mass notification.
