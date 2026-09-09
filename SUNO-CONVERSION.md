# Existing Name Songs to Suno

Install this patch after the Suno Name Songs update. No additional SQL or environment variables are required.

Extract the ZIP and drag its src, public, tests folders and this document to the GitHub repository root. Keep folder paths. Commit changes and wait for Vercel Ready.

Admin > NAME SONGS > Convert to Suno / MP3 on the existing song.
Paste its Suno link > Test Suno link > play the preview and verify the correct song > tick the confirmation > Use Suno for this song.

The same song record, title, lyrics, names, publishing state, views and MQ3 share URL are preserved. The public player now uses Suno. Old audio and preview files remain stored in Blob. This patch does not delete anything or free storage yet. Storage cleanup must be handled separately after playback is verified. Do not delete the song entry.

Songs with order history or active paid membership access are blocked from conversion for review. Gift records are preserved; new gifts are unavailable on Suno songs. MP3 source songs keep their existing functionality. Suno entries are excluded from new MP3 purchases.

For an already converted uploaded song, the Suno button reopens this conversion flow if the link needs updating. Use the ordinary Edit song / lyrics button for metadata.

Validated: isolated database conversion tests preserve all columns except suno_url, require confirmation and block order history. Browser tests verify preview, confirmation reset after link edits and saving. No live catalog writes or Blob deletions were performed.
