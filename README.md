# Song Guess Game

International song guessing game with country routes, shareable score cards, server-side admin authentication, configurable SEO metadata, advertising placements, Google integrations, and activity logging.

Routes:

- `/` public home page
- `/play` game app
- `/artist` artist archive and Spotify artist pack search
- `/play/country` country archive
- `/play/genre` genre archive
- `/contact` contact form

## Local Development

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set at least:
   `APP_URL`, `ADMIN_ACCESS_PATH`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
3. Run the app:
   `npm run dev`

The admin panel is hidden from the visible UI. Open it with the configured `ADMIN_ACCESS_PATH`, the keyboard shortcut `Ctrl/Cmd + Shift + A`, or the existing footer secret-click trigger, then sign in with the server env credentials.

## Production

Build and start:

```bash
npm run build
npm start
```

Important production environment variables:

```bash
APP_URL="https://songguessgame.online"
TRUST_PROXY="true"
ADMIN_ACCESS_PATH="/owner-panel-change-me"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="use-a-long-random-password"
ADMIN_SESSION_SECRET="use-at-least-32-random-characters"
GOOGLE_ANALYTICS_MEASUREMENT_ID="G-XXXXXXXXXX"
GOOGLE_ADSENSE_CLIENT="ca-pub-0000000000000000"
GOOGLE_SEARCH_CONSOLE_VERIFICATION=""
```

Admin config and activity logs persist under `./data` by default, or through `ADMIN_CONFIG_PATH` and `ADMIN_ACTIVITY_PATH`.

For Hetzner/EasyPanel, Stripe, Spotify, Google Search Console, Analytics, AdSense, and MailerSend setup, see [PRODUCTION.md](./PRODUCTION.md).
