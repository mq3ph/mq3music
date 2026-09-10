# MQ3 player cover

Upload public/app.js and public/styles.css in their existing public folder. Commit and wait for Vercel Ready, then refresh the app. No SQL, environment changes or new audio uploads.

The embedded player's current lower-right logo region is covered with the existing MQ3 logo. The upper-right outbound icon region is covered separately. Playback and seek controls remain exposed. The underlying Suno player is still used; its code and stored song are not changed.

The iframe is sandboxed with scripts and its own origin allowed for playback, but without popup or top-navigation permissions. This blocks the current title/logo links from opening external tabs, including keyboard activation. The app's Share button continues to share the MQ3 song URL.

Tested with the real public Moses embed in Chrome: play/pause/resume, keyboard seeking, covered-logo pointer hit area, blocked title popup and keyboard logo link, widths 1000/390/320, and frame removal on closing. Mobile widths are browser simulations; check your actual phone/TikTok browser after deployment.

This is a visual cover for the current provider layout, not an official branding-free Suno setting. If Suno changes its layout or navigation behavior, the covers may need adjustment. It cannot stop someone from finding Suno independently or inspecting the embed URL. No audio is downloaded or re-hosted by this patch.
