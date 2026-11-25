import { embedOverrides } from './screenscape-map.js';
import { config } from './api.js';

export const EXAMPLE_TEMPLATE =
  'https://web.screenscape.fun/embed?tmdb={tmdbId}&type=movie&lan=eng';
export const EXAMPLE_TV_TEMPLATE =
  'https://web.screenscape.fun/embed?tmdb={tmdbId}&type=tv&s={s}&e={e}&lan=eng';

function applyTokens(value, item, type, options = {}) {
  const providerId = item.screenscape_id || item.provider_id || item.id;
  const season = Number(options.season) || 1;
  const episode = Number(options.episode) || 1;
  return String(value)
    .replaceAll('{id}', encodeURIComponent(providerId))
    .replaceAll('{tmdbId}', encodeURIComponent(item.id))
    .replaceAll('{type}', encodeURIComponent(type))
    .replaceAll('{s}', encodeURIComponent(season))
    .replaceAll('{e}', encodeURIComponent(episode))
    .replaceAll('{title}', encodeURIComponent(item.title || ''));
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isConfigured() {
  const settings = config.screenscape || {};
  return Boolean(
    settings.template || settings.tvTemplate || Object.keys(embedOverrides).length
  );
}

export function resolveEmbedUrl(item, options = {}) {
  const type = item.type || item.media_type || 'movie';
  const settings = config.screenscape || {};
  const override = embedOverrides[`${type}:${item.id}`] || embedOverrides[String(item.id)];

  let template;
  if (type === 'tv') {
    template = settings.tvTemplate || '';
    // Backwards compatibility: a generic template with a {type} token can serve both.
    if (!template && settings.template?.includes('{type}')) template = settings.template;
  } else {
    template = settings.template || '';
  }

  if (!override && !template) return null;
  return safeUrl(applyTokens(override || template, item, type, options));
}
