# MQ3 admin storage monitor

Install after the Suno Conversion update. Extract this ZIP and upload its src, public and tests folders and this document to the GitHub repository root, keeping the folder paths. Commit changes and wait for Vercel Ready. No SQL or environment variable changes.

Admin > Storage > Check storage.

The report reads Blob file metadata under songs/. It does not download audio, delete files, change credits or send emails. Storage list operations may count toward Vercel usage; there is no automatic background scan. A successful snapshot may be reused for five minutes per running server instance.

Displays current stored bytes/files by category, a unique total, converted Name Songs with retained files, order-history/shared-file flags, unlinked objects, and missing referenced files. MiB means 1,048,576 bytes. Objects shared across categories have their own category so totals do not double count them. Search filters the converted-song list, not global totals.

Converted audio is an amount to REVIEW, not guaranteed safe to delete. Check Suno playback and paid access before any future cleanup. No cleanup is performed by this update. No active-membership eligibility is inferred by this report.

Only songs/ objects in the configured Blob store are measured. Other folders, database storage, monthly transfer, requests, plan allowances and billing are outside this report. Check Vercel Usage for those. This is a point-in-time snapshot; concurrent uploads can change storage afterward.

Tests: actual isolated SQL admin authentication and snapshot reuse; unique-file accounting, shared/unlinked/missing files; browser manual scan, totals, order flags, search and mobile rendering. Tests use mock storage metadata, not your production Blob store.
