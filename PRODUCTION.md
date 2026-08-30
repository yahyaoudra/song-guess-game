# Song Guess Game Production Guide

Production domain: `https://songguessgame.online`

Public routes:

- `/` is the marketing home page.
- `/play` is the game app.
- `/artist` is the artist archive/search page.
- `/play/country` is the country archive.
- `/play/genre` is the genre archive.
- `/contact` sends contact requests to `info@songguessgame.online`.

## Preflight

Run locally before every deploy:

```bash
npm ci
npm run lint
npm run build
docker compose build
```

## Required Production Environment

Set these in EasyPanel for the app service:

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
TRUST_PROXY=true

APP_URL=https://songguessgame.online
VITE_APP_URL=https://songguessgame.online
VITE_DOMAIN_NAME=songguessgame.online

ADMIN_ACCESS_PATH=/your-hidden-admin-path
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-long-random-password
ADMIN_SESSION_SECRET=your-long-random-secret

ADMIN_CONFIG_PATH=/app/data/admin-config.json
ADMIN_ACTIVITY_PATH=/app/data/activity-log.json
ARTIST_REQUESTS_PATH=/app/data/artist-requests.json
OVERWRITE_SEEDED_DATA=false

DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
DATABASE_SSL=false

STRIPE_SECRET_KEY=sk_live_or_test_value
STRIPE_WEBHOOK_SECRET=whsec_value
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_value

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_AUTO_REFRESH_ENABLED=true
SPOTIFY_ARTIST_ALBUM_LIMIT=20

MAILERSEND_API_KEY=your_mailersend_api_key
MAILERSEND_FROM_EMAIL=noreply@songguessgame.online
MAILERSEND_FROM_NAME=Song Guess Game

GOOGLE_CLIENT_ID=optional_google_oauth_client_id
GOOGLE_CLIENT_SECRET=optional_google_oauth_client_secret

GOOGLE_ANALYTICS_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
GOOGLE_SEARCH_CONSOLE_VERIFICATION=google-site-verification-code

VITE_RECAPTCHA_SITE_KEY=your_recaptcha_v3_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_v3_secret_key
RECAPTCHA_MIN_SCORE=0.5
```

For Docker Compose with the included Postgres service, use:

```bash
POSTGRES_DB=song_guess
POSTGRES_USER=song_guess
POSTGRES_PASSWORD=long-random-db-password
DOCKER_DATABASE_URL=postgres://song_guess:long-random-db-password@postgres:5432/song_guess
DATABASE_SSL=false
DOMAIN=songguessgame.online
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_v3_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_v3_secret_key
RECAPTCHA_MIN_SCORE=0.5
```

## EasyPanel On Hetzner

1. Point DNS `A` record for `songguessgame.online` to the Hetzner server IPv4 address.
2. Add `www.songguessgame.online` as either a `CNAME` to `songguessgame.online` or an `A` record to the same IP.
3. In EasyPanel, create a new project named `song-guess-game`.
4. Add a Postgres service, or use the `postgres` service from `docker-compose.yml`.
5. Add the app service from the GitHub repository.
6. Set build method to Dockerfile, port `3000`.
7. Add a persistent volume mounted at `/app/data`.
8. Add all required environment variables above.
9. Attach domain `songguessgame.online` to the app service and enable HTTPS.
10. Visit `https://songguessgame.online/api/health`; it should return JSON with `"ok": true`.
11. Visit your hidden admin path and sign in with the admin env credentials.

The included Compose file avoids fixed `container_name`, public `ports` bindings, and custom Docker healthchecks so EasyPanel can assign service names, track the running processes, and route traffic through its own proxy. The app listens internally on port `3000`; Postgres stays internal on `5432`.

## reCAPTCHA v3

1. Open Google reCAPTCHA or Google Cloud reCAPTCHA.
2. Create a reCAPTCHA v3 key.
3. Add allowed domains:
   - `songguessgame.online`
   - `localhost`
   - `127.0.0.1`
4. Add the site key to `VITE_RECAPTCHA_SITE_KEY`.
5. Add the secret key to `RECAPTCHA_SECRET_KEY`.
6. Start with `RECAPTCHA_MIN_SCORE=0.5`; raise it if spam still gets through, lower it only if real users are blocked.

Protected actions:

- account registration
- login
- email change
- contact form
- artist pack requests

## Spotify App

Create an app in Spotify Developer Dashboard:

- App name: `Song Guess Game`
- App description: `Music guessing game that builds artist quiz packs from Spotify catalog metadata.`
- Website: `https://songguessgame.online`
- Redirect URIs:
  - `https://songguessgame.online/api/spotify/callback`
  - `http://127.0.0.1:3000/api/spotify/callback`
- APIs/SDKs:
  - Select `Web API`

This backend uses client credentials for catalog lookup. The redirect URI is still required by Spotify's app form, but users are not redirected through Spotify for this catalog-building flow.

## Stripe

1. Create or open your Stripe account.
2. Add `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` to EasyPanel.
3. Add a webhook endpoint:

```text
https://songguessgame.online/api/stripe/webhook
```

4. Subscribe the webhook to `checkout.session.completed`.
5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Test checkout with Stripe test keys before switching to live keys.
7. Refunds are handled from the admin payments dashboard when a paid record has a Stripe payment intent.

## Google Search Console

Recommended method:

1. Open Google Search Console.
2. Add a `Domain` property for `songguessgame.online`.
3. Google will give you a DNS TXT record.
4. Add that TXT record at your DNS provider.
5. Wait for DNS propagation, then click Verify.

Optional HTML tag method:

1. Add a URL-prefix property for `https://songguessgame.online`.
2. Copy only the content value from the Google meta tag.
3. Put it in `GOOGLE_SEARCH_CONSOLE_VERIFICATION` or the admin SEO settings.
4. Deploy and verify.

The app serves:

- `/robots.txt`
- `/sitemap.xml`
- canonical route metadata for countries, genres, and artists

## Google Analytics

1. Create a Google Analytics 4 property.
2. Create a Web data stream for `https://songguessgame.online`.
3. Copy the Measurement ID, formatted like `G-XXXXXXXXXX`.
4. Set `GOOGLE_ANALYTICS_MEASUREMENT_ID` or paste it in the admin Google integrations panel.
5. Open the live app and confirm traffic in GA4 Realtime.

## AdSense

1. Add `songguessgame.online` in AdSense Sites.
2. Copy your publisher client ID, formatted like `ca-pub-XXXXXXXXXXXXXXXX`.
3. Set `GOOGLE_ADSENSE_CLIENT` or paste it in the admin Google integrations panel.
4. Keep manual banners configured as fallback while AdSense approval is pending.

## MailerSend

1. Verify `songguessgame.online` as a sending domain in MailerSend.
2. Add SPF, DKIM, and any required tracking DNS records.
3. Create an API token with email sending permission.
4. Set `MAILERSEND_API_KEY`, `MAILERSEND_FROM_EMAIL`, and `MAILERSEND_FROM_NAME`.
5. Register a test user and verify that the email verification message arrives.
6. Submit the `/contact` form and verify the message arrives at `info@songguessgame.online`.

## Smoke Test Checklist

Run after deployment:

```bash
curl -I https://songguessgame.online
curl -I https://songguessgame.online/play
curl -I https://songguessgame.online/contact
curl https://songguessgame.online/api/health
curl https://songguessgame.online/robots.txt
curl https://songguessgame.online/sitemap.xml
```

Manual checks:

- Register with email/password.
- Open verification email and confirm redirect to `/play?auth=verified`.
- Log out and log back in.
- Update display name and country.
- Start email change and verify the new address.
- Play free Daily 5 once; confirm the next attempt shows the paywall, not login.
- Start Stripe Checkout while logged in.
- Complete a Stripe test payment and confirm the 7-day pass is active.
- Download receipt from account history.
- Refund the test payment from admin and confirm payment status changes.
- Search an unknown artist, choose the exact Spotify artist, and confirm the pack builds before play starts.
- Confirm AdSense/manual banner behavior.
- Confirm admin route is not linked in public UI.

## Artist Pack Backfill

After deploy, use small batches to avoid Spotify `429` quota responses:

```bash
SPOTIFY_BACKFILL_TIMEOUT_MS=45000 npx tsx scripts/backfill-artist-packs-via-local-api.ts --min=8 --limit=25
```

Run again after quota cooldown. The script stops after repeated Spotify `429` responses.
