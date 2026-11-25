import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

async function loadEnvFiles() {
  const merged = {};
  for (const name of ['.env', '.env.local']) {
    try {
      Object.assign(merged, parseEnv(await readFile(path.join(ROOT, name), 'utf8')));
    } catch {
      // Missing env files are fine; placeholders still work.
    }
  }
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

await loadEnvFiles();

function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  });
  res.end(body);
}

function isPlaceholder(value) {
  const text = String(value || '').trim().toLowerCase();
  return (
    !text ||
    text.includes('your_') ||
    text.includes('your-') ||
    text.includes('example') ||
    text.includes('placeholder') ||
    text.includes('here')
  );
}

function credentials() {
  const apiKey = process.env.TMDB_API_KEY || '';
  const readToken =
    process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_V4_TOKEN || '';
  return {
    apiKey: isPlaceholder(apiKey) ? '' : apiKey,
    readToken: isPlaceholder(readToken) ? '' : readToken,
  };
}

function publicConfig() {
  const { apiKey, readToken } = credentials();
  const template = process.env.SCREENSCAPE_EMBED_TEMPLATE || '';
  const tvTemplate = process.env.SCREENSCAPE_TV_EMBED_TEMPLATE || '';
  const movieTemplate = isPlaceholder(template) ? '' : template;
  const seriesTemplate = isPlaceholder(tvTemplate) ? '' : tvTemplate;
  return {
    siteName: process.env.SITE_NAME || 'Toxibh Flix',
    tmdbConfigured: Boolean(apiKey || readToken),
    screenscape: {
      template: movieTemplate,
      tvTemplate: seriesTemplate,
      configured: Boolean(movieTemplate || seriesTemplate),
    },
  };
}

function configScript() {
  return `window.APP_CONFIG = ${JSON.stringify(publicConfig(), null, 2)};\n`;
}

const TMDB_ALLOWED_SEGMENTS = new Set([
  'trending',
  'movie',
  'tv',
  'search',
  'discover',
  'genre',
  'person',
  'configuration',
]);

async function proxyTmdb(req, res, url) {
  const rawPath = url.pathname.slice('/api/tmdb/'.length);
  let segments;
  try {
    segments = rawPath.split('/').map(decodeURIComponent);
  } catch {
    return send(res, 400, JSON.stringify({ error: 'Invalid TMDB path.' }), 'application/json');
  }

  const clean = segments.filter(Boolean);
  if (
    clean.length === 0 ||
    clean.length > 8 ||
    !TMDB_ALLOWED_SEGMENTS.has(clean[0]) ||
    clean.some((s) => s === '.' || s === '..' || s.includes('\\'))
  ) {
    return send(res, 400, JSON.stringify({ error: 'TMDB path is not allowed.' }), 'application/json');
  }

  const { apiKey, readToken } = credentials();

  if (!apiKey && !readToken) {
    return send(
      res,
      503,
      JSON.stringify({
        error:
          'TMDB is not configured. Add TMDB_API_KEY (or TMDB_READ_ACCESS_TOKEN) to .env.local and restart the server.',
      }),
      'application/json'
    );
  }

  const upstream = new URL(process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3/');
  const basePath = upstream.pathname.replace(/\/+$/, '');
  upstream.pathname = `${basePath}/${clean.map(encodeURIComponent).join('/')}`;

  for (const [key, value] of url.searchParams) {
    if (key.toLowerCase() === 'api_key' || key.toLowerCase() === 'access_token') continue;
    upstream.searchParams.set(key, value);
  }

  const headers = { Accept: 'application/json' };
  if (readToken) {
    headers.Authorization = `Bearer ${readToken}`;
  } else {
    upstream.searchParams.set('api_key', apiKey);
  }

  let upstreamRes;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        upstreamRes = await fetch(upstream, { headers });
        break;
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
    const body = await upstreamRes.text();
    res.writeHead(upstreamRes.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch (error) {
    send(
      res,
      502,
      JSON.stringify({ error: `Could not reach TMDB: ${error.message}` }),
      'application/json'
    );
  }
}

function resolveStaticFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded === '/') decoded = '/index.html';
  const target = path.resolve(ROOT, `.${decoded}`);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;
  return target;
}

async function serveStatic(req, res, pathname) {
  let target = resolveStaticFile(pathname);
  if (!target) return send(res, 403, 'Forbidden');

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      target = path.join(target, 'index.html');
      await stat(target);
    }
  } catch {
    return send(res, 404, 'Not found');
  }

  try {
    const body = await readFile(target);
    const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
    send(res, 200, req.method === 'HEAD' ? '' : body, type);
  } catch {
    send(res, 500, 'Could not read file');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/config.js') {
    return send(res, 200, configScript(), 'text/javascript; charset=utf-8');
  }

  if (url.pathname.startsWith('/api/tmdb/')) {
    return proxyTmdb(req, res, url);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed');
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Toxibh Flix running at http://localhost:${PORT}`);
  if (!publicConfig().tmdbConfigured) {
    console.warn('TMDB key missing — copy .env.example to .env.local and fill it in.');
  }
});
