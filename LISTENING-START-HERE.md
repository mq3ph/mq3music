# MQ3 Music — Listening Edition 2.0

This is an updated source copy of mq3music-main.zip. The live mq3music.com site and its database have not been changed.

## What changed

- Approved listening-hub layout: compact featured-song hero, song list left and player right, with MQ3 burgundy/gold styling and supplied logo.
- Four categories: Name Songs, Inspirational, OPM and Love Songs.
- Public listening catalog with search, featured song, shareable song URLs and official YouTube/Spotify embeds. No autoplay and no subscription gate.
- Admin manages song details, cover URLs, draft/published state and YouTube/Spotify links or pasted iframe embed codes (only the validated platform URL is used).
- Payment, wallet, credit-load, song-request and Suno endpoints are not mounted in this edition; their old public files are not served. No old financial database records are deleted.
- Daily, weekly, monthly and all-time MQ3 song-page opens, deduplicated by visitor/song/30-minute bucket. Philippine calendar days, Monday-start weeks. CSV export included. These counts are not official streams or royalties. Website reporting starts at migration; old lifetime counters are separately retained with their original meaning. Existing historical song_plays tables are untouched.
- Audience snapshots: manually enter dated YouTube subscriber / Spotify follower totals and see net change. No automatic follower API integration or claims that follows came from this website. The site does not track YouTube Subscribe-button actions.

## Preview on this computer

Run `npm install`, then `npm run preview`. Open http://localhost:3478 and http://localhost:3478/admin.

Demo password: `preview-only`. The demo binds only to this computer, uses an in-memory database, and resets on restart. Never use this password in production. It includes five verified public Art Track links and the BestFriends Spotify track. Categories are proposed assignments that you can edit. Playing the real embeds contacts YouTube/Spotify; platform eligibility and browser limitations still apply.

Verified artist links: https://www.youtube.com/@manny-III and https://open.spotify.com/artist/3ELxNlNqw2zgLqNFbGDaiK . These are editable in admin. Preview song links are in verified-preview-songs.json; they are not automatically inserted into the live database.

## Prepare for deployment

1. Back up the current deployed project and database. Keep any outstanding transactions/requests available in the original admin until settled; this edition does not expose old fulfillment functions.
2. Keep existing DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD_HASH and APP_URL environment variables. APP_URL must exactly match the final website origin for write security. Set a strong admin password using the original password script if needed.
3. Run `npm run db:listening` against the intended database. This creates separate hub tables and copies existing songs/title/category/legacy view totals as drafts. It is rerunnable and does not overwrite already migrated song edits. ORIGINAL SONGS are provisionally mapped to OPM; review them. No songs are published automatically and no payments or wallets are erased.
4. In the new admin, add the correct platform track URLs and release cover image URL for each song, verify preview availability, then publish. The original ZIP contains code rather than your live database, so the local preview is not your complete live catalog.
5. Run `npm test` and `npm run build`, deploy a preview to the existing Express-capable Vercel project, then verify against the real database before promoting it. Production deployment has NOT been performed or verified here.
6. Confirm the old PWA service worker updates. The included sw.js unregisters the retired creator cache; hard refresh once if an old installed app still shows creator screens.

## Playback and covers

Only official embeds are used. HTTPS and the Referrer-Policy `strict-origin-when-cross-origin` are retained to avoid YouTube error 153. Embedding may still be disabled by a rights holder or region. The Open on platform fallback remains available. Spotify may offer only a preview, depending on the listener/browser. Only one iframe is mounted at a time.

The supplied logo is the fallback cover. Admin can enter an HTTPS URL for actual release art. Preview uses a verified Spotify cover and YouTube thumbnails. A dedicated image-upload interface is not included in this version.

## Tests and limits

Automated tests cover admin access, origin checks, supported link validation, draft publishing, deduplicated website counts, four reporting periods, audience snapshots, and retired commerce endpoints. Browser checks cover desktop/mobile rendering, category filtering, admin login, draft saving and analytics. Live platform royalty/count attribution cannot be verified from a local preview. Follower totals require manual entry until platform access is connected.

Original frontend/server entry and config backups are in legacy-source (excluded from deployment). Other original helper modules and documents remain for reference but are not imported by the new app entry. No payment secrets are needed by the new routes.
