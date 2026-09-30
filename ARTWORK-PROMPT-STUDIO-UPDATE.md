# MQ3 Artwork Prompt Studio update

Based on the supplied mq3music-main (4).zip. Existing custom covers and the 12 fallback artworks are retained.

## Admin / Edit song
1. Fill in the song title, category and lyrics. Choose subject, mood and scene, or keep Auto.
2. Click **Build ChatGPT Command**, then **Copy command**.
3. Paste into ChatGPT. The command requests three complete image prompts first. Choose a concept and ask ChatGPT to generate its image.
4. Save the image from ChatGPT, then select it under **Upload the finished artwork**.
5. When upload completes, click **Save song**. The uploaded image becomes the song cover in the public player and library.

PNG, JPEG and WebP are supported up to 5 MB. Existing cover storage configuration is still required for uploads. Building/copying commands is local and does not call an image-generation API. The previous image-generation endpoint has been removed; no OpenAI API key is needed for this workflow.

Changing song details clears an outdated command so it can be rebuilt. Upload failure preserves the previous cover. Saving is blocked while an upload is pending; switching songs cancels the pending upload so it cannot attach to the wrong song.

## Duration and player
Your manually entered duration remains the displayed total. The provider's actual elapsed time drives progress. If duration is blank, the provider's duration is used. YouTube and Spotify remain the sources. Bars are playback animation, not raw-audio analysis, and stop during pause/buffering. Reduced-motion preferences are respected.

## Additional repair
Fixed a pre-existing undefined category variable in song validation that prevented saving songs in the supplied ZIP.

## Verification
- Build syntax checks pass.
- All 11 automated tests pass, including upload/save/catalog cover persistence and removal of the generation endpoint.
- Browser verified admin login, command generation, clipboard copying, valid image upload, song save/reopen, invalid-image protection and mobile/desktop layout.
- Browser verified manual 3:51 duration overrides provider 3:30; elapsed 1:55.5 yields 50% progress; bars stop when paused. Provider events are simulated; external platform availability and playback restrictions are not tested here.
- No live database, storage or website was modified. Use your existing deployment workflow to publish this source update. No database migration is required.
