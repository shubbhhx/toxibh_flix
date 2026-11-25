const appConfig = window.APP_CONFIG || {};

export const config = {
  siteName: appConfig.siteName || 'Toxibh Flix',
  // When the front end is hosted on GitHub Pages, point this at the Render
  // service so /api/tmdb/* requests still reach the server-side proxy.
  apiBaseUrl: appConfig.apiBaseUrl || '',
  tmdbConfigured: Boolean(appConfig.tmdbConfigured || appConfig.apiBaseUrl),
  screenscape: appConfig.screenscape || { template: '', configured: false },
};

function placeholder(label = 'Toxibh Flix', ratio = 'poster') {
  const width = ratio === 'backdrop' ? 640 : 400;
  const height = ratio === 'backdrop' ? 360 : 600;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f1f29"/><stop offset="100%" stop-color="#0a0a0f"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" fill="#4a4a57" font-family="Arial, sans-serif" font-size="22" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function imageUrl(filePath, size = 'w500', ratio = 'poster') {
  if (typeof filePath === 'string' && filePath.startsWith('/')) {
    return `https://image.tmdb.org/t/p/${size}${filePath}`;
  }
  if (typeof filePath === 'string' && /^https:\/\/image\.tmdb\.org\//.test(filePath)) {
    return filePath;
  }
  return placeholder(ratio === 'backdrop' ? 'Backdrop unavailable' : 'Poster unavailable', ratio);
}

async function request(path, params = {}) {
  let origin = window.location.origin;
  if (config.apiBaseUrl) {
    try {
      origin = new URL(config.apiBaseUrl).origin;
    } catch {
      throw new Error('Invalid apiBaseUrl in config.js.');
    }
  }
  const url = new URL(`/api/tmdb/${path.replace(/^\/+/, '')}`, origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error(
      config.apiBaseUrl
        ? 'Could not reach the TMDB proxy. Check the apiBaseUrl in config.js.'
        : 'Could not connect to the server. Is `npm start` running, or is apiBaseUrl set in config.js?'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an unexpected response.');
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.status_message || `TMDB request failed (${response.status}).`);
  }
  return data;
}

export const tmdb = {
  trending: (media = 'all', window = 'week', page = 1) =>
    request(`trending/${media}/${window}`, { page }),

  movies: (category = 'popular', page = 1) => request(`movie/${category}`, { page }),
  tvShows: (category = 'popular', page = 1) => request(`tv/${category}`, { page }),

  details: (type, id, append = '') =>
    request(`${type}/${id}`, { append_to_response: append }),

  searchMulti: (query, page = 1) => request('search/multi', { query, page, include_adult: false }),
  searchMovies: (query, page = 1) => request('search/movie', { query, page, include_adult: false }),
  searchTv: (query, page = 1) => request('search/tv', { query, page, include_adult: false }),

  discover: (type, params = {}) => request(`discover/${type}`, params),
};
