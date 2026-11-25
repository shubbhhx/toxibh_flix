import { embedOverrides } from './screenscape-map.js';
import { config } from './api.js';
import {
  DEFAULT_MOVIE_EMBED_TEMPLATE,
  DEFAULT_TV_EMBED_TEMPLATE,
} from './screenscape-templates.js';

// Kept as aliases for existing imports in watch.js.
export const EXAMPLE_TEMPLATE = DEFAULT_MOVIE_EMBED_TEMPLATE;
export const EXAMPLE_TV_TEMPLATE = DEFAULT_TV_EMBED_TEMPLATE;

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

function templates() {
  const settings = config.screenscape || {};

  // Values from /config.js (Render / local server) override the built-in
  // defaults. On GitHub Pages /config.js is the committed static fallback, so
  // this still resolves to the same public Screenscape URLs.
  const movieTemplate = settings.template || DEFAULT_MOVIE_EMBED_TEMPLATE;
  const genericTemplate = settings.template?.includes('{type}') ? settings.template : '';
  const tvTemplate =
    settings.tvTemplate || genericTemplate || DEFAULT_TV_EMBED_TEMPLATE;

  return { movieTemplate, tvTemplate };
}

export function isConfigured() {
  // The bundled defaults always produce a valid Screenscape URL, so the player
  // no longer depends on deployment-specific environment variables.
  return true;
}

export function resolveEmbedUrl(item, options = {}) {
  const type = item.type || item.media_type || 'movie';
  const { movieTemplate, tvTemplate } = templates();
  const override = embedOverrides[`${type}:${item.id}`] || embedOverrides[String(item.id)];
  const template = type === 'tv' ? tvTemplate : movieTemplate;

  if (!override && !template) return null;
  return safeUrl(applyTokens(override || template, item, type, options));
}
