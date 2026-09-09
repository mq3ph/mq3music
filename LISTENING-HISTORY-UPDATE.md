# MQ3 Recently Played and Continue Listening

Upload the public folder to the repository root, replace public/app.js, commit and wait for Vercel Ready. Keep other files. No database or environment changes are needed.

The existing new-release section remains. Recently Played lists up to 12 distinct published songs played in this browser, most recent first. Continue resumes the latest song from its saved position after the listener presses the button. Recently Played cards can resume their saved positions too. No audio autoplays on page load.

Position is saved periodically, on pause/seek, when the page is hidden, and when leaving the page. Completed tracks restart from the beginning. Unpublished or missing songs are not displayed. Clear history removes saved history for this browser; future playback can build a new history.

History is browser-local and shared by users of that same browser, not synced to an MQ3 account or across TikTok/Chrome/devices. Storage restrictions or clearing browser data can remove it. A sudden browser/process termination may lose the last few seconds. Streaming still requires internet and existing access rights.

Local Chrome checks with simulated audio passed: save position, reload without autoplay, resume at saved position, unique-song history, clear history and corrupted-storage fallback. No real song playback or live deployment was performed during this check.
