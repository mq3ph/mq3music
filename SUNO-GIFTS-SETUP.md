# MQ3: confirmed Suno downloads and gifts

## Install
1. In Neon SQL editor, run suno-gifts-migration.sql before deploying this update. It adds a confirmation timestamp and gift switch. It does not enable any existing Suno song automatically.
2. Extract this ZIP and upload its folders/files to the GitHub repository root, keeping src/, public/ and tests/ paths. Commit changes and wait for Vercel Ready.
3. No environment variable changes are needed.

## Mark a song
Admin > NAME SONGS > Gifts / Download status column.
Click Not confirmed - Gifts OFF.
Check the box confirming you downloaded that exact song through Suno and confirmed its commercial-use rights.
Check Enable gifts for this song, then Save gift setting.

Statuses:
- Not confirmed - Gifts OFF: no recorded download confirmation.
- Downloaded - Gifts OFF: confirmed, but gifts disabled.
- Gifts ON: confirmed and enabled.

The date records when you confirmed the download in MQ3, not the actual Suno download date. This is your declaration; MQ3 does not inspect your Suno account or verify licensing. Follow the guidance you received from Suno when marking each song.

You can disable gifts without clearing its downloaded status. Unchecking download confirmation also turns gifts off. Changing to a different Suno song link resets both fields; title/lyrics edits and saving the same link retain them. The gift-setting save checks the expected Suno URL and rejects stale dialogs after a link change.

Public catalog cards and the embedded player show Send a gift only for enabled songs. The server independently checks eligibility before debiting credits, including in the gift transaction. Existing MP3 gifts retain their previous behavior. Existing wallet/gift history is not changed. Listeners with an already-open page may need to refresh to see a newly enabled button; disabled gifts are rejected by the server even from an old page.

## Player appearance
Removed the MQ3 instruction mentioning Suno and the MQ3 Listen on Suno button. Share links still point to the MQ3 song page. The logo and links INSIDE the external Suno player remain visible and usable: no supported branding-free option was found, and MQ3 cannot directly edit the cross-origin iframe content. This patch does not cover, crop or intercept the provider controls.

Other categories keep their existing MP3 setup. Embedding other categories was conditional on removing Suno's own branding; that capability was not established, so this patch does not expand the source options.

## Verification
Isolated database tests covered admin-only settings, blocked unconfirmed gifts without wallet changes, enabled gifts with matching ledger records, disabled gifts, unchanged MP3 gifts, stale-link rejection, and reset after link replacement.
Browser tests covered checkbox dependencies, enable/disable status, public gift visibility, gift dialog from the embedded player, removed MQ3 outbound button, mobile widths, player close cleanup and MP3 controls.
No real payments, emails, production catalog changes, or Blob deletions were made. Storage-monitor and conversion support files are included to preserve the preceding updates.
