# MQ3 Suno Name Songs update

## 1. Database first
In the Neon SQL editor, run suno-migration.sql once:

ALTER TABLE songs ADD COLUMN IF NOT EXISTS suno_url text;

This only adds one optional field. It does not delete songs, MP3 files, lyrics, requests, or credits. Existing MP3 songs remain MP3 songs.

## 2. Upload the update
Extract MQ3-Suno-Name-Songs-Update.zip. Drag its public, src, and tests folders and root files into the GitHub repository root. Keep folder paths intact. Commit changes and wait for Vercel Ready. No environment variable changes are needed.

## 3. Add your first Suno song
Admin dashboard > NAME SONGS > Upload a song (new-song button).
Title: Moses
Category: NAME SONGS
Matching names: Moses
Song source: Suno link (Name Songs)
Suno song link: https://suno.com/song/657e28fc-df67-4dd1-be2d-24bfaa952503
Lyrics: paste your lyrics from Suno.
Tick Show this song in the public app, then Save.

Short /s/ links are resolved on the server using only Suno HTTPS URLs. If Suno does not redirect, paste the full /song/ address as above. Existing uploaded MP3 entries have their source locked; add a new entry for a new Suno song.

## 4. Check after deployment
Search Moses in the public app and press its Play button. Press Play inside the Suno panel. Expand Lyrics. Check Share and Listen on Suno. Close the panel, then try an existing MP3 song. Repeat on your phone and TikTok browser.

Suno songs can be linked to Name Requests and included in the existing preview/send-email flow. This update does not send any emails by itself.

## Playback differences
- Suno controls playback inside its own player. Closing the MQ3 panel stops that player.
- Opening Suno pauses MQ3 MP3 playback.
- Suno playback is not tracked in MQ3 Recently Played, play counts, exact-position resume, or automatic next-track. MP3 history and controls keep working.
- Suno entries have no MQ3 gifts or paid MP3 access. They have no uploaded audio to download.
- Lyrics are entered by you and displayed as plain text; they are not automatically synchronized to Suno playback.
- The fallback Listen on Suno remains visible because embedded playback depends on Suno and the listener's browser. Phone/TikTok playback still needs checking after deployment.

## Validation performed locally
- Actual public Moses embed rendered inside an iframe and played past 14 seconds (duration 267.2 seconds).
- Database tests: valid/unsafe URLs, short-link redirects, publishing, catalog lyrics, Name Request linking, preservation of existing MP3 paths and publishing state.
- Browser tests: admin save and source lock, widths 320/390/1280, plain-text lyrics, close cleanup, existing MP3 controls and local listening history.
- Admin bundle built successfully. Tests used isolated data; the production database and catalog were not changed.
