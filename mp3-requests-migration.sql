CREATE TABLE IF NOT EXISTS mp3_requests (
 id uuid PRIMARY KEY,user_id uuid NOT NULL,song_id uuid NOT NULL,
 song_title text NOT NULL,email text NOT NULL,display_name text,
 lyrics text NOT NULL DEFAULT '',credits integer NOT NULL DEFAULT 50 CHECK(credits=50),
 promo_used integer NOT NULL,purchased_used integer NOT NULL,
 status text NOT NULL DEFAULT 'paid' CHECK(status IN ('paid','sent','refunded')),
 created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,refunded_at timestamptz,
 UNIQUE(user_id,song_id)
);