# Toxibh Flix

A Netflix-style movie and TV app built with plain HTML, CSS, and JavaScript. Movie data comes from TMDB, playback uses Screenscape embeds, and a tiny zero-dependency Node server keeps your TMDB key off the client.

## Features

- Home hero plus horizontally scrolling rows: trending, popular, top-rated, upcoming, your list, and recently watched
- Search with movie/TV filters and "Load more" pagination
- Detail pages with trailers, cast, facts, and recommendations
- Watch page with a fullscreen Screenscape iframe player
- Season/episode picker and deep links for TV titles
- Local accounts with per-user **My List** and watch activity
- Fully responsive dark UI

## Quick start

Requires Node.js 18+.

This workspace already has a filled-in `.env.local`. On a fresh copy, create it first:

```bash
cp .env.example .env.local
# add your TMDB key and Screenscape templates to .env.local
npm start
```

Open **http://localhost:3000**. No `npm install` is needed — the server uses only Node built-ins.

After changing `.env.local`, restart the server.

## Project layout

```text
server.mjs              Static server + TMDB proxy + public config injection
index.html              Home page
search.html             Search page
detail.html             Title details
watch.html              Video player
my-list.html            Saved titles and activity
login.html              Local sign-in / sign-up
css/styles.css          All styling
js/api.js               TMDB request helpers and image URLs
js/auth.js              Local account handling
js/storage.js           Per-user My List and recent titles
js/screenscape.js       Embed URL resolver
js/screenscape-map.js   Optional per-title embed overrides
js/components.js        Shared header, cards, rows, toasts, modal
js/pages/               Page-specific logic
.env.example            Safe config template (no secrets)
.env.local              Real credentials, gitignored
```

## Configuration

All secrets live in `.env.local`, which is gitignored. The browser only receives `/config.js` containing non-secret flags and the public embed templates.

| Variable | Required | Description |
| --- | --- | --- |
| `TMDB_API_KEY` | Yes* | TMDB v3 API key from [TMDB settings](https://www.themoviedb.org/settings/api). |
| `TMDB_READ_ACCESS_TOKEN` | No | Alternative v4 read token. Takes precedence over `TMDB_API_KEY`. |
| `SCREENSCAPE_EMBED_TEMPLATE` | Movies | Movie embed URL pattern. |
| `SCREENSCAPE_TV_EMBED_TEMPLATE` | Series | TV embed URL pattern; supports `{s}` and `{e}`. |
| `SITE_NAME` | No | Display name. |
| `port` | No | Port to listen on (defaults to `3000`). Server always binds to `0.0.0.0`. |
| `TMDB_BASE_URL` | No | Override the TMDB API base URL. Defaults to `https://api.themoviedb.org/3/`. |

\* Or use a v4 read token instead.

> **Security:** never put real credentials in `.env.example` — it is meant to be committed/shared. If credentials ever leak there, rotate them in TMDB.

## Screenscape embeds

The configured templates resolve like this:

```text
Movie 597     → https://web.screenscape.fun/embed?tmdb=597&type=movie&lan=eng
TV 1396 S2E3  → https://web.screenscape.fun/embed?tmdb=1396&type=tv&s=2&e=3&lan=eng
```

TV watch pages include season and episode selectors. You can also deep-link to an episode:

```text
/watch.html?id=1396&type=tv&s=2&e=3
```

### Template tokens

| Token | Meaning |
| --- | --- |
| `{id}` | Provider ID if present, otherwise the TMDB ID |
| `{tmdbId}` | TMDB ID |
| `{type}` | `movie` or `tv` |
| `{s}` | Season number (TV) |
| `{e}` | Episode number (TV) |
| `{title}` | URL-encoded title |

For titles needing a custom URL, edit `js/screenscape-map.js`:

```js
export const embedOverrides = {
  'movie:597': 'https://web.screenscape.fun/embed?tmdb=597&type=movie&lan=eng',
  'tv:1396': 'https://web.screenscape.fun/embed?tmdb=1396&type=tv&s={s}&e={e}&lan=eng',
};
```

If no template matches, the watch page shows a setup message instead of a broken player.

Because the player is a cross-origin iframe, exact playback position cannot be read back unless Screenscape exposes a `postMessage` API. "Recently watched" records when a title is opened, not a seek position.

## Accounts

Login, registration, My List, and watch history are stored in `localStorage` in the browser. Passwords are salted and hashed with SHA-256, but this is **demo-grade local auth only**. For a public deployment, use a real backend with HTTP-only sessions and server-side storage.

## Troubleshooting

- **"TMDB setup required" banner** — add a real key to `.env.local` and restart the server.
- **Rows are empty or return 401** — the TMDB key is invalid or lacks read access.
- **"Screenscape embed not configured"** — check that the movie and TV templates are set in `.env.local`.
- **Player area is blank** — open the embed URL directly in a browser tab to confirm the provider allows embedding, then check the season/episode values.

## Attribution

TMDB attribution requirements apply to its data and images; see [TMDB's terms](https://www.themoviedb.org/terms-of-use). This project is not affiliated with Netflix or TMDB.
