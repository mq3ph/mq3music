# MQ3 Music App

Public music catalog + private owner dashboard, prepared for GitHub and Vercel.

**Start with [SETUP.md](SETUP.md).** It explains the environment variables, database creation, private MP3 storage, admin password, email, and deployment steps.

- Preserves the MQ3 black/burgundy/gold design and original logo lettering.
- Public visitors search/listen and request missing name songs; they cannot upload or edit songs.
- Admin tabs: Name Request, Name Songs, Inspirational Songs, OPM, Original Songs, GCash, PayPal.
- MP3 uploads, previews, lyrics, prices, drafts and publishing; private Vercel Blob storage.
- Server-side admin sessions and protected write APIs.
- Neon Postgres stores catalog, requests, order status, and access records.
- Availability emails and one-time purchase access emails via Resend.
- Manual GCash/PayPal payment verification and fixed-term membership access. **No automatic recurring billing.**

```sh
npm install
npm run build
npm test
```

No secrets, real music, or real customer records are included. Live integrations require your environment settings and post-deployment checks.
