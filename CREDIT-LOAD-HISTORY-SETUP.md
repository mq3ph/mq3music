# MQ3 Credit Loads cleanup and payment history

1. In the MQ3 Neon database SQL editor run this ONE statement:

ALTER TABLE credit_load_orders ADD COLUMN IF NOT EXISTS admin_deleted_at timestamptz;

2. Extract this ZIP. Upload src/, public/, tests/ and the root documents to the GitHub repository root. Keep folder paths. Commit changes and wait for Vercel Ready. No environment variable changes.

3. Admin > Credit Loads now has All, Pending, Approved, Rejected and Deleted filters. All means active (not deleted) records. The pending count excludes deleted entries. Known automatic PayPal checkouts have no manual approval/rejection buttons; their environment is displayed.

4. Click Delete on a row, then Delete from list in the confirmation. The row moves to Deleted. Restore brings it back. This is a reversible administrative hide, not a permanent database deletion. Payment status, references, wallet credits, credit ledger, listener purchase history and PayPal checkout metadata are retained. Deleting does not refund or cancel a PayPal order. An automatic payment may still settle afterward.

5. GCash and PayPal tabs now combine Credit Loads with the original song/membership orders. Approved loads already in the database appear without approving them again. Credit Loads are labelled as Credits; the original order-only actions are not attached to them.

Approved non-sandbox loads remain visible in payment history even if deleted from the Credit Loads list. Deleted pending/rejected loads and known sandbox tests are hidden from the provider tabs but remain accessible in Deleted. Unknown legacy PayPal environments are labelled explicitly; they are not assumed to be sandbox.

No payment or wallet is altered by deleting/restoring a row. The report uses existing approved records; this update does not import missing bank transactions or independently verify a reference. The top-level existing revenue summary is unchanged and is not a combined revenue report.

The list still loads if the new column has not been added yet. Delete/Restore then asks you to run the SQL rather than breaking the public catalog.

Validation: isolated database tests cover authentication, wrong-origin rejection, migration handling, approval, repeated delete, restore and unchanged wallet/ledger records. Browser tests cover filters, provider history, delete/restore, preservation of archived approved GCash history and sandbox labels. No production records were deleted, approved or changed during testing.
