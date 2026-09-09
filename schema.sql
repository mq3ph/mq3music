CREATE TABLE IF NOT EXISTS songs (
 id uuid PRIMARY KEY, title text NOT NULL, category text NOT NULL CHECK(category IN ('NAME SONGS','INSPIRATIONAL SONGS','OPM','ORIGINAL SONGS')),
 names text NOT NULL DEFAULT '', lyrics text NOT NULL DEFAULT '', price integer NOT NULL DEFAULT 0 CHECK(price>=0),
 published boolean NOT NULL DEFAULT false, audio_path text, preview_path text, duration_seconds integer, views integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS limits (key text PRIMARY KEY, hits integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS requests (
 id uuid PRIMARY KEY, name text NOT NULL, normalized_name text NOT NULL, email text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','working','available','notified')),
 song_id uuid REFERENCES songs(id), created_at timestamptz NOT NULL DEFAULT now(), notified_at timestamptz,
 UNIQUE(normalized_name,email)
);
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY, customer_hash text NOT NULL, access_hash text UNIQUE,
 email text NOT NULL, provider text NOT NULL CHECK(provider IN ('gcash','paypal')),
 kind text NOT NULL CHECK(kind IN ('song','membership')), song_id uuid REFERENCES songs(id),
 amount integer NOT NULL CHECK(amount>0), reference text, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','paid','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz, expires_at timestamptz,
 UNIQUE(provider,reference)
);
CREATE TABLE IF NOT EXISTS upload_tickets (
 id uuid PRIMARY KEY, song_id uuid NOT NULL REFERENCES songs(id), kind text NOT NULL CHECK(kind IN ('audio','preview')),
 pathname text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);

-- Run these two lines once on an existing MQ3 database:
ALTER TABLE songs ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_url text;
