CREATE TABLE IF NOT EXISTS hub_songs (
 id uuid PRIMARY KEY, title text NOT NULL, artist text NOT NULL DEFAULT 'manny III',
 category text NOT NULL CHECK(category IN ('Name Songs','Inspirational','OPM','Love Songs')),
 youtube_url text NOT NULL DEFAULT '', spotify_url text NOT NULL DEFAULT '', cover_url text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false, featured boolean NOT NULL DEFAULT false,
 legacy_views integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hub_events (
 event_key text PRIMARY KEY, song_id uuid NOT NULL REFERENCES hub_songs(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hub_events_date ON hub_events(created_at,song_id);
CREATE INDEX IF NOT EXISTS hub_events_song_date ON hub_events(song_id,created_at);
CREATE TABLE IF NOT EXISTS hub_settings (id integer PRIMARY KEY, youtube_channel text NOT NULL, spotify_artist text NOT NULL DEFAULT '');
INSERT INTO hub_settings(id,youtube_channel,spotify_artist) VALUES(1,'https://www.youtube.com/@manny-III','https://open.spotify.com/artist/3ELxNlNqw2zgLqNFbGDaiK') ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS hub_audience (
 id uuid PRIMARY KEY, recorded_on date NOT NULL UNIQUE, youtube_subscribers integer NOT NULL CHECK(youtube_subscribers>=0),
 spotify_followers integer NOT NULL CHECK(spotify_followers>=0), note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS limits(key text PRIMARY KEY,hits integer NOT NULL DEFAULT 1,expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS limits_expires ON limits(expires_at);
