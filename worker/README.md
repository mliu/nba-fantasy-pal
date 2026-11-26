# ESPN league proxy

A Cloudflare Worker that forwards ESPN fantasy league reads to the app, adding the CORS headers ESPN doesn't send.

- The app sends your `espn_s2` and `SWID` cookies with each request (as `X-ESPN-S2` / `X-ESPN-SWID` headers). The Worker passes them to ESPN and stores nothing.
- Only league IDs in `ALLOWED_LEAGUE_IDS` (see `wrangler.toml`) are forwarded, so it can't be used as a general ESPN proxy.

## Deploy

```sh
cd worker
npx wrangler@4 login
npx wrangler@4 deploy
```

`deploy` prints the Worker URL, e.g. `https://nba-fantasy-pal-espn-proxy.<your-subdomain>.workers.dev`. Then point the app at it:

- **Local dev:** add `VITE_ESPN_PROXY_URL=<worker url>` to `.env` in the project root.
- **GitHub Pages:** add a repository variable named `ESPN_PROXY_URL` (Settings → Secrets and variables → Actions → Variables) and re-run the deploy workflow.

The URL isn't secret. **Never** commit your ESPN cookies or put them in `wrangler.toml`.

## Getting your cookies

While logged in to ESPN fantasy, open dev tools → Application → Cookies → `https://fantasy.espn.com` and copy `espn_s2` and `SWID`. Paste them into the app's "Import from ESPN" dialog; they're saved in that browser's localStorage only.
