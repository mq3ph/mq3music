# MQ3 — GitHub at Vercel setup

Ito ang deployable app. Ang public page ay para sa listeners. Ang `/admin` ay may password login at pitong tabs: Name Request, Name Songs, Inspirational Songs, OPM, Original Songs, GCash, PayPal.

## 1. Ilagay ang code sa GitHub

Extract `MQ3-vercel-ready.zip`. Ilagay ang **contents** nito sa root ng GitHub repository mo: dapat direktang makita roon ang `package.json`, `src`, `public`, at `schema.sql`.

Kung buong `D:/MQ3 Music App` ang repository mo, piliin ang **vercel-app** bilang Root Directory sa Vercel. Huwag i-deploy ang lumang static app sa root.

Huwag i-upload ang `node_modules`, `.env.local`, passwords, o private backups. Hindi kasama ang mga ito sa ZIP.

## 2. Ikonekta ang database

Sa Vercel project, mag-connect ng **Neon Postgres** sa Storage/Marketplace. Gumamit ng bagong database para sa MQ3 app na ito. Hindi ito migration ng ibang existing dashboard.

Sa Neon SQL Editor, kopyahin at patakbuhin ang buong `schema.sql`. Gumagawa ito ng song catalog, requests, orders, admin sessions, rate limits, at upload tickets.

Kunin ang connection string at ilagay bilang `DATABASE_URL` sa Vercel environment variables. I-store ang requests at customer email dito, hindi sa GitHub o public JSON file.

## 3. Ikonekta ang MP3 storage

Gumawa ng **Private Vercel Blob store** at i-connect sa project.

- `BLOB_READ_WRITE_TOKEN`: token ng private store (madalas awtomatikong idinadagdag ng Vercel).
- `BLOB_HOST`: exact hostname ng store, halimbawa `abc123.private.blob.vercel-storage.com`, walang `https://` o slash.

Lahat ng full audio at preview uploads ay nasa private store. Ang app server ang nagbibigay ng preview/free audio, at nagche-check ng paid access bago mag-stream ng full paid song. Walang MP3 files sa GitHub repository.

Admin browser uploads go directly to Blob after the server checks the admin session. Limit: 100 MB bawat MP3. Gumamit ng hiwalay na maikling MP3 para sa preview ng paid song.

## 4. Gumawa ng admin password

Sa computer na may Node.js 22 o mas bago, buksan ang terminal sa app folder:

```sh
npm install
npm run password
```

I-save ang generated password sa password manager. Ilagay ang generated `ADMIN_PASSWORD_HASH` at `SESSION_SECRET` sa Vercel environment variables. Hindi kailangang maglagay ng plain password sa code.

Itakda rin ang `APP_URL` sa exact public origin, halimbawa `https://mq3-music.vercel.app`. Kapag may custom domain, iyon ang gamitin. Walang trailing path. Ang admin at public app ay dapat gamitin mula sa origin na ito; other preview domains are rejected for write actions until APP_URL is configured for that deployment.

Ang `SESSION_SECRET` ay dapat manatiling stable: ang pagpapalit nito ay maglo-log out ng sessions at magpapawalang-bisa sa existing browser purchase keys/access links. Panatilihin itong private.

## 5. Email notifications

Mag-set up ng Resend account at verified sender domain. Ilagay sa Vercel:

- `RESEND_API_KEY`
- `EMAIL_FROM`, halimbawa `MQ3 <music@your-verified-domain.com>`
- `OWNER_EMAIL`, contact email mo

Sa Name Request tab: **Update → matching published Name Song → Available → Save → Notify by email**. Explicit admin action ang email; walang automatic bulk send. Papalitan lang ang status ng Notified kapag tinanggap ng email service ang message. Hindi nito ginagarantiya ang inbox delivery.

## 6. GCash at PayPal

Ang kasamang checkout ay **manual verification**, hindi payment gateway/webhook integration.

- `GCASH_NUMBER`: sarili mong payment number
- `GCASH_ACCOUNT_NAME`: pangalan na makikita ng buyer
- `PAYPAL_PAYMENT_URL`: sarili mong HTTPS PayPal.Me o hosted payment URL
- `MEMBERSHIP_PRICE_PHP`: membership price in pesos (default 199)
- `MEMBERSHIP_DAYS`: haba ng access mula verification (default 30)

PHP ang currency ng app. Siguraduhing tama ang currency at halagang natanggap sa payment account bago mag-approve.

Buyer flow: piliin ang song o Membership → email at payment method → payment instructions → magbayad sa provider → submit transaction reference.

Admin flow: pumunta sa GCash/PayPal tab → tingnan ang actual transaction sa sarili mong account → i-check ang amount at reference → **Verify paid**. Screenshot o reference text lamang ay hindi proof na natanggap mo ang pera. Walang access hangga't hindi mo na-verify.

Pagkatapos mag-verify, gumagana ang access sa browser kung saan ginawa ang order. Gamitin ang **Email access link** para ma-activate sa ibang browser. One-time at private ang link; pag-redeem sa bagong browser, doon lilipat ang access ng order. Maaaring mag-email ng bagong link kapag nawala ang browser data.

Memberships are fixed-term and **do not auto-renew or auto-charge**. Hindi kasama ang automatic PayPal recurring billing, GCash gateway API, automatic refunds, chargeback handling, o webhook reconciliation. Kung kailangan ang mga iyon, kailangan ng hiwalay na provider integration bago i-advertise bilang automatic subscription.

## 7. Deploy

1. Import/connect ang GitHub repository sa Vercel.
2. Framework: **Express** (automatic detection). Root Directory: repository root, o `vercel-app` kung buong workspace ang in-upload.
3. Build Command: `npm run build`. Hayaan ang framework defaults para sa output; huwag gawing static-only project.
4. Idagdag ang environment variables sa tamang Production/Preview environment.
5. Deploy/redeploy pagkatapos baguhin ang settings.
6. Public URL: `/`. Admin URL: `/admin`.

Kung humingi ng install command, puwedeng `npm install`. May kasama ring `pnpm-lock.yaml` para sa pnpm workflow.

## 8. Unang song upload

1. Log in sa `/admin`.
2. Piliin ang tamang category tab at **Upload a song**.
3. Ilagay ang title, matching names (para sa Name Songs), lyrics, at price.
4. Piliin ang full MP3 at optional preview.
5. I-check ang Publish at i-save. Hindi puwedeng i-publish nang walang full audio.

Kapag nag-error ang upload, may draft record na mase-save. Buksan iyon gamit ang Edit/Upload at subukan ulit. Ang uploaded replacements ay bagong files; hindi awtomatikong dine-delete ang lumang blobs para maiwasan ang aksidenteng data loss. I-review at linisin ang unused blobs sa Vercel kapag may independent backup ka na.

## Local run

Copy `.env.example` to `.env.local`, fill in settings, then:

```sh
npm install
npm run build
npm run db:setup
npm run dev
```

Open `http://localhost:3000` and `http://localhost:3000/admin`. Local APP_URL must be `http://localhost:3000`. Huwag i-double-click lang ang HTML: kailangan nito ng server at database. Para sa tunay na Blob upload test, gamitin ang deployed Vercel preview; Blob completion callbacks need a reachable URL. May authenticated upload-finish fallback ang admin para sa local development.

## Validation at handoff

Automated backend tests passed with an isolated in-memory Postgres-compatible test database and mocked Blob/email services. Browser tests passed for public name requests, the seven-tab admin dashboard, draft saving and mobile layout. The admin upload bundle builds successfully.

**Hindi pa nasubukan laban sa sarili mong live Neon, Blob, Resend, GCash, o PayPal accounts.** Pagkatapos i-configure, subukan ang isang MP3 upload/playback/seek, isang name request/email, at maliit na payment na personal mong ive-verify. No emails, money transfers, GitHub pushes, or Vercel deployments were performed while preparing this package.

`npm test` runs backend tests. `tests/browser.cjs` additionally uses installed Chrome and Playwright; set `MQ3_NODE_MODULES` to the folder containing Playwright before running it. Test records contain example.test addresses only.

Backups: **Download metadata backup** exports catalog, requests and orders, including private customer records; it does not download the MP3 files. Keep original MP3 files independently. Review old rate-limit/session/upload-ticket rows periodically; there is no automatic retention or privacy-policy generator in this version.

## Reference documentation

- [Express deployment on Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Vercel Blob client uploads](https://vercel.com/docs/vercel-blob/client-upload)
- [Private Blob storage](https://vercel.com/docs/vercel-blob/private-storage)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Resend email API](https://resend.com/docs/api-reference/emails/send-email)
