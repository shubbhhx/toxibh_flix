export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export function normalizeItem(raw = {}, fallbackType = 'movie') {
  const rawType = raw.media_type || raw.type;
  const type = rawType === 'movie' || rawType === 'tv' ? rawType : fallbackType;
  return {
    ...raw,
    id: raw.id,
    type,
    title: raw.title || raw.name || 'Untitled',
    release_date: raw.release_date || raw.first_air_date || '',
    vote_average: Number(raw.vote_average) || 0,
    overview: raw.overview || '',
  };
}

export function formatYear(date = '') {
  return date ? String(date).slice(0, 4) : '—';
}

export function formatRuntime(minutes) {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatRating(value = 0) {
  return Number(value) ? Number(value).toFixed(1) : 'NR';
}

export function truncate(text = '', max = 180) {
  const clean = String(text).trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function queryParams() {
  return new URLSearchParams(window.location.search);
}

export function typeLabel(type) {
  return type === 'tv' ? 'TV Series' : 'Movie';
}

export function itemKey(item) {
  return `${item.type || item.media_type || 'movie'}:${item.id}`;
}

export function detailUrl(item) {
  return `/detail.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(
    item.type || item.media_type || 'movie'
  )}`;
}

export function minimalItem(item) {
  return {
    id: item.id,
    type: item.type || item.media_type || 'movie',
    title: item.title,
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    overview: item.overview || '',
    vote_average: item.vote_average || 0,
    release_date: item.release_date || '',
  };
}
