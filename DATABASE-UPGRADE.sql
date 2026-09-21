-- MQ3 additive upgrade. Run the entire file.
BEGIN;
CREATE TABLE IF NOT EXISTS mq3_schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());

-- 001-catalog.sql
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

ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_download_confirmed_at timestamptz;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_gifts_enabled boolean NOT NULL DEFAULT false;


CREATE TABLE IF NOT EXISTS song_creator_requests (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL,
 email text NOT NULL,
 display_name text,
 song_type text NOT NULL,
 subject_name text,
 relationship text,
 occasion text,
 story text NOT NULL,
 language text NOT NULL DEFAULT 'English',
 credits integer NOT NULL DEFAULT 50 CHECK(credits=50),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','creating','ready')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS song_creator_requests_user_created_idx ON song_creator_requests(user_id,created_at DESC);
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS version_1_url text;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS version_2_url text;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS revision_notes text;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS revision_used boolean NOT NULL DEFAULT false;
ALTER TABLE song_creator_requests DROP CONSTRAINT IF EXISTS song_creator_requests_status_check;
ALTER TABLE song_creator_requests ADD CONSTRAINT song_creator_requests_status_check CHECK(status IN ('queued','creating','ready','revision'));


INSERT INTO mq3_schema_migrations(version) VALUES('001-catalog.sql') ON CONFLICT DO NOTHING;

-- 002-accounts.sql
-- Base listener tables missing from the original install. Existing data is retained.
CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY,email text NOT NULL UNIQUE,display_name text,display_name_changed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),last_login_at timestamptz);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name_changed_at timestamptz;
CREATE TABLE IF NOT EXISTS user_sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL,expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx ON user_sessions(expires_at);
CREATE TABLE IF NOT EXISTS user_login_codes(id uuid PRIMARY KEY,email text NOT NULL,code_hash text NOT NULL,expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS user_login_email_idx ON user_login_codes(email,created_at DESC);
CREATE TABLE IF NOT EXISTS wallets(user_id uuid PRIMARY KEY,promo_credits integer NOT NULL DEFAULT 0 CHECK(promo_credits>=0),purchased_credits integer NOT NULL DEFAULT 0 CHECK(purchased_credits>=0),lifetime_gifted integer NOT NULL DEFAULT 0,welcome_bonus_claimed boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS credit_transactions(id uuid PRIMARY KEY,user_id uuid NOT NULL,transaction_type text NOT NULL,promo_change integer NOT NULL DEFAULT 0,purchased_change integer NOT NULL DEFAULT 0,description text NOT NULL DEFAULT '',reference_id uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS one_welcome_bonus_per_user ON credit_transactions(user_id) WHERE transaction_type='welcome_bonus';
CREATE UNIQUE INDEX IF NOT EXISTS one_credit_purchase_per_load_order ON credit_transactions(reference_id) WHERE transaction_type='credit_purchase';
CREATE INDEX IF NOT EXISTS credit_history_idx ON credit_transactions(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS credit_load_orders(id uuid PRIMARY KEY,user_id uuid NOT NULL,amount_pesos integer NOT NULL CHECK(amount_pesos>0),credits integer NOT NULL CHECK(credits>0),payment_provider text NOT NULL CHECK(payment_provider IN ('gcash','paypal')),payment_reference text,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS credit_load_reference_unique ON credit_load_orders(payment_provider,payment_reference) WHERE payment_reference IS NOT NULL;
CREATE TABLE IF NOT EXISTS gifts(id uuid PRIMARY KEY,user_id uuid NOT NULL,song_id uuid NOT NULL,gift_type text NOT NULL,credits integer NOT NULL,message text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS song_plays(id bigserial PRIMARY KEY,song_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS site_visits(id bigserial PRIMARY KEY,path text,source text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app_installs(id bigserial PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS rate_limit_expiry_idx ON limits(expires_at);

INSERT INTO mq3_schema_migrations(version) VALUES('002-accounts.sql') ON CONFLICT DO NOTHING;

-- 003-paypal.sql
-- Run in the EXISTING MQ3 Neon database before deploying this patch.
-- No existing balances or payment statuses are changed.
CREATE TABLE IF NOT EXISTS paypal_checkouts (
  load_order_id uuid PRIMARY KEY REFERENCES credit_load_orders(id),
  paypal_order_id text NOT NULL,
  environment text NOT NULL CHECK(environment IN ('live','sandbox')),
  capture_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(environment,paypal_order_id),
  UNIQUE(environment,capture_id)
);
-- Existing payments have unknown environment. Do not guess or backfill them.

INSERT INTO mq3_schema_migrations(version) VALUES('003-paypal.sql') ON CONFLICT DO NOTHING;

-- 004-mp3.sql
CREATE TABLE IF NOT EXISTS mp3_requests (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,song_id uuid NOT NULL,
 song_title text NOT NULL,email text NOT NULL,display_name text,
 lyrics text NOT NULL DEFAULT '',credits integer NOT NULL DEFAULT 50 CHECK(credits=50),
 promo_used integer NOT NULL,purchased_used integer NOT NULL,
 status text NOT NULL DEFAULT 'paid' CHECK(status IN ('paid','sent','refunded')),
 created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,refunded_at timestamptz,
 UNIQUE(user_id,song_id)
);
INSERT INTO mq3_schema_migrations(version) VALUES('004-mp3.sql') ON CONFLICT DO NOTHING;

-- 005-priority.sql
-- MQ3 Priority Name Requests · 50 Credits
-- Run this once in the Neon SQL Editor before deploying this version.

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority_delivered_at timestamptz;


INSERT INTO mq3_schema_migrations(version) VALUES('005-priority.sql') ON CONFLICT DO NOTHING;

-- 006-history.sql
ALTER TABLE credit_load_orders ADD COLUMN IF NOT EXISTS admin_deleted_at timestamptz;

INSERT INTO mq3_schema_migrations(version) VALUES('006-history.sql') ON CONFLICT DO NOTHING;

-- 007-suno.sql
ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_download_confirmed_at timestamptz;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_gifts_enabled boolean NOT NULL DEFAULT false;

INSERT INTO mq3_schema_migrations(version) VALUES('007-suno.sql') ON CONFLICT DO NOTHING;

-- 008-hardening.sql
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_name text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS lyric_ideas text;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS request_key uuid;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS request_hash text;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS lyrics text NOT NULL DEFAULT '';
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS genre text NOT NULL DEFAULT '';
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS voice text NOT NULL DEFAULT '';
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'pending';
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS email_error text;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS email_attempt_id uuid;
ALTER TABLE song_creator_requests ADD COLUMN IF NOT EXISTS email_attempted_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS creator_request_key_unique ON song_creator_requests(user_id,request_key);
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_transaction_type_check CHECK(transaction_type IN ('welcome_bonus','credit_purchase','gift_sent','admin_adjustment','refund','mp3_purchase','mp3_refund','name_priority','song_creator')) NOT VALID;
CREATE TABLE IF NOT EXISTS lyrics_usage(scope text NOT NULL,day text NOT NULL,requests integer NOT NULL DEFAULT 0,PRIMARY KEY(scope,day));
CREATE INDEX IF NOT EXISTS lyrics_usage_day_idx ON lyrics_usage(day);

INSERT INTO mq3_schema_migrations(version) VALUES('008-hardening.sql') ON CONFLICT DO NOTHING;
COMMIT;
