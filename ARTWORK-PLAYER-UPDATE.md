# Artwork and playback update — 2026-09-30

Based on the supplied mq3music-main (3).zip.

## Changes
- Reused all 12 photorealistic PNGs from the lyric video maker in public/assets/artworks/.
- Stable pseudo-random covers per song, selected within its category: 6 Name Songs, 2 Inspirational, 2 OPM, 2 Love Songs. The same song retains its artwork on reload, search, and the mini player.
- Song title is overlaid on the photo. Removed the duplicate title/category below the main artwork visually; the accessible heading remains.
- Replaced ad-hoc YouTube messages with the official iframe API. Added Spotify iframe API controls.
- Play/pause reflects confirmed player events. Buffering stops the bars, progress comes from the provider, and stale callbacks cannot affect a newly selected song.
- Play icon uses SVG for consistent alignment. Progress supports keyboard seeking. Connection failure reveals native playback controls on click.

## Waveform limitation
This app currently streams through YouTube and Spotify embeds. They do not provide raw audio samples for a Web Audio analyser. The bars are an honest playback animation, active only during confirmed playback, and respect reduced-motion preferences. They are NOT a measured audio-reactive waveform. A direct MP3/audio source is needed for that additional capability. No song files were extracted from either service.

## Verification
Build checks passed. Local browser tests passed for artwork consistency, category mapping, mobile/desktop display, title placement, play/pause confirmation, buffering, seeking, Spotify state changes, and next/previous tracks. Provider responses were mocked for repeatable tests; live availability, login restrictions, and platform playback policies still apply.

## Apply
Replace the corresponding project files with this updated source, then use your existing build/deploy workflow. No database migration is required. This ZIP does not deploy or change the live site.

Changed app files: public/index.html, public/listening.js, public/cover-variants.js, public/player-controls.js, public/visual-match.css; added public/assets/artworks/*.png.

API references:
- https://developers.google.com/youtube/iframe_api_reference
- https://developer.spotify.com/documentation/embeds/references/iframe-api

## Header refinement
MQ3 logo enlarged from 42px to a responsive 92–112px, centered independently of the preview badge, with balanced spacing above the search field and artwork. YouTube and Spotify remain the audio sources; waveform bars indicate their confirmed playback state.
