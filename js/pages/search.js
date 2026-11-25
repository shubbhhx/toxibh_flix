import { config, tmdb } from '../api.js';
import { renderChrome, renderGrid, renderMessage, renderSkeletonRows, showToast } from '../components.js';
import { debounce, escapeHtml, normalizeItem, queryParams } from '../utils.js';

const app = document.getElementById('app');
renderChrome();

const initialQuery = queryParams().get('q') || '';
const state = { query: initialQuery, filter: 'all', page: 1, totalPages: 0, items: [], loading: false };

app.innerHTML = `
  <div class="page-head">
    <span class="eyebrow">Discover</span>
    <h1>Search titles</h1>
    <p>Find something to watch from the TMDB library.</p>
  </div>
  <div class="search-bar-large">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 10-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z"/></svg>
    <input id="search-input" type="search" placeholder="Try “Inception” or “Breaking Bad”" value="${escapeHtml(
      initialQuery
    )}" aria-label="Search movies and shows" autofocus />
  </div>
  <div class="filter-chips" id="filter-chips" role="group" aria-label="Filter results">
    <button type="button" class="chip active" data-filter="all">All</button>
    <button type="button" class="chip" data-filter="movie">Movies</button>
    <button type="button" class="chip" data-filter="tv">TV Series</button>
  </div>
  <div id="search-results"></div>
  <div class="load-more-wrap" id="load-more-wrap"></div>`;

const input = document.getElementById('search-input');
const resultsHost = document.getElementById('search-results');
const loadMoreWrap = document.getElementById('load-more-wrap');

function updateUrl() {
  const url = new URL(window.location.href);
  if (state.query) url.searchParams.set('q', state.query);
  else url.searchParams.delete('q');
  window.history.replaceState({}, '', url);
}

function searchRequest(page) {
  if (state.filter === 'movie') return tmdb.searchMovies(state.query, page);
  if (state.filter === 'tv') return tmdb.searchTv(state.query, page);
  return tmdb.searchMulti(state.query, page);
}

async function runSearch({ reset = true, silent = false } = {}) {
  if (!state.query.trim()) {
    resultsHost.innerHTML = renderMessage('Start typing', 'Search for a movie or TV show to see results here.');
    loadMoreWrap.innerHTML = '';
    return;
  }
  if (!config.tmdbConfigured) {
    resultsHost.innerHTML = renderMessage(
      'TMDB setup required',
      'Add your TMDB API key to <code>.env.local</code> and restart the server to enable search.'
    );
    loadMoreWrap.innerHTML = '';
    return;
  }
  if (state.loading) return;

  state.loading = true;
  if (reset) {
    state.page = 1;
    resultsHost.innerHTML = renderSkeletonRows(2);
    loadMoreWrap.innerHTML = '';
  } else {
    loadMoreWrap.innerHTML = '<div class="loading-inline">Loading more…</div>';
  }

  try {
    const data = await searchRequest(state.page);
    const raw = data.results || [];
    const items = raw
      .filter((item) => (item.media_type || state.filter) !== 'person')
      .map((item) =>
        normalizeItem(item, state.filter === 'all' ? item.media_type || 'movie' : state.filter)
      );

    state.items = reset ? items : [...state.items, ...items];
    state.totalPages = Number(data.total_pages) || 0;

    if (!state.items.length) {
      resultsHost.innerHTML = renderMessage(
        'No matches found',
        `Nothing matched “${escapeHtml(state.query)}”. Try a different title or filter.`
      );
    } else {
      resultsHost.innerHTML = `
        <div class="results-count">${state.items.length} result${state.items.length === 1 ? '' : 's'}</div>
        ${renderGrid(state.items)}`;
    }

    loadMoreWrap.innerHTML =
      state.page < state.totalPages
        ? '<button class="btn btn-outline" type="button" id="load-more">Load more</button>'
        : '';
  } catch (error) {
    if (!silent) showToast(error.message || 'Search failed', 'error');
    if (reset) resultsHost.innerHTML = renderMessage('Search failed', escapeHtml(error.message || 'Unknown error'));
  } finally {
    state.loading = false;
  }
}

input.addEventListener(
  'input',
  debounce(() => {
    state.query = input.value.trim();
    updateUrl();
    runSearch();
  }, 400)
);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    state.query = input.value.trim();
    updateUrl();
    runSearch();
  }
});

document.getElementById('filter-chips').addEventListener('click', (event) => {
  const chip = event.target.closest('[data-filter]');
  if (!chip) return;
  state.filter = chip.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((node) => node.classList.toggle('active', node === chip));
  runSearch();
});

loadMoreWrap.addEventListener('click', (event) => {
  if (!event.target.closest('#load-more')) return;
  state.page += 1;
  runSearch({ reset: false });
});

runSearch({ silent: true });
