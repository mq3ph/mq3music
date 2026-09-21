-- Run once in your existing Neon database before uploading the admin update.
-- Safe to run again. Existing requests, credits and song links are preserved.
-- Requires the existing song_creator_requests table used by your current app.
BEGIN;
ALTER TABLE song_creator_requests
  ADD COLUMN IF NOT EXISTS admin_email_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS admin_email_attempt_id uuid,
  ADD COLUMN IF NOT EXISTS admin_email_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_email_error text;
-- Older records retain 'unknown': the old app did not record delivery success.
ALTER TABLE song_creator_requests ALTER COLUMN admin_email_status SET DEFAULT 'pending';
COMMIT;
