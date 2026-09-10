ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_download_confirmed_at timestamptz;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_gifts_enabled boolean NOT NULL DEFAULT false;
