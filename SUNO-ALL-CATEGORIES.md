# Suno embeds for all MQ3 categories

Install this after the preceding Suno gift/compact player updates. No new SQL or environment variables are needed.

Extract the ZIP. Upload its src/, public/ and tests/ folders and this document to the GitHub repository root, preserving folder paths. Commit and wait for Vercel Ready, then refresh the admin dashboard.

## Existing uploaded songs
Open NAME SONGS, INSPIRATIONAL SONGS, OPM or ORIGINAL SONGS.
Click Convert to Suno / MP3 on the song.
Paste its corresponding Suno song link, click Test Suno link and play the preview.
Confirm that it is the correct song, then click Use Suno for this song.

The ID, title, lyrics, category, matching names, published state, views and MQ3 share URL stay the same. Old audio/preview files remain in Blob. No files are deleted by this update, so storage is not reclaimed until a separate cleanup. Entries with order history or active paid membership access remain blocked for review.

## New songs
Create a song in any of the four categories. Choose Suno link (all categories), enter the song link, paste lyrics and save with publishing enabled.

## Gifts
Use the Gifts / Download status button after confirming the exact song was downloaded through Suno with the usage rights you received. Gifts are off by default for new/converted Suno songs. A changed Suno link resets download confirmation and gift approval; the same link retains them. Existing MP3 gift behavior is unchanged.

## Storage report
Storage now includes retained audio from converted songs in every category and displays each song's category. The review amount is not a safe-to-delete approval. No automatic migration of song links or deletion is performed.

The existing compact gold-edged public player is included, along with its link restrictions. Suno streaming still depends on Suno/network availability; this update does not guarantee faster playback or provide offline downloads.

Validation: isolated database tests cover creation and conversion in all four categories, metadata preservation, gift confirmation and catalog flags, all-category storage totals, order-history and membership restrictions. Browser tests verify each category's conversion action and new-song form with lyrics. No production catalog edits, payments, emails or Blob deletions were performed.
