import { config, tmdb } from '../api.js';
import {
  renderChrome,
  renderHero,
  renderRow,
  renderSkeletonRows,
  renderMessage,
  showToast,
} from '../components.js';
import { normalizeItem } from '../utils.js';
import { currentUser } from '../auth.js';
import { getMyList, getRecent } from '../storage.js';

const app = document.getElementById('app');
renderChrome();

function extract(settled) {
  if (settled.status !== 'fulfilled') return [];
  return settled.value?.results || [];
}

async function init() {
  if (!config.tmdbConfigured) {
    app.innerHTML = renderMessage(
      'TMDB setup required',
      'Copy <code>.env.example</code> to <code>.env.local</code>, add your TMDB API key, and restart the server. The homepage will fill in automatically.'
    );
    return;
  }

  app.innerHTML = `
    <div class="hero-skeleton">
      <div class="skeleton skeleton-hero"></div>
      <div class="skeleton skeleton-hero-line"></div>
      <div class="skeleton skeleton-hero-line short"></div>
    </div>
    ${renderSkeletonRows(4)}`;

  const requests = await Promise.allSettled([
    tmdb.trending('all', 'week'),
    tmdb.movies('popular'),
    tmdb.tvShows('top_rated'),
    tmdb.movies('upcoming'),
    tmdb.tvShows('popular'),
  ]);

  const failures = requests.filter((result) => result.status === 'rejected');
  if (failures.length === requests.length) {
    app.innerHTML = renderMessage(
      'Could not load the library',
      `TMDB request failed: ${failures[0].reason?.message || 'Unknown error'}. Check your API key and connection.`
    );
    return;
  }
  if (failures.length) {
    showToast(`${failures.length} row(s) could not be loaded`, 'error');
  }

  const [trending, popularMovies, topTv, upcomingMovies, popularTv] = requests.map(extract);

  const heroCandidate =
    trending.find((item) => item.backdrop_path) ||
    popularMovies.find((item) => item.backdrop_path) ||
    popularMovies[0];

  const user = currentUser();
  const myList = user ? getMyList() : [];
  const recent = user ? getRecent() : [];

  app.innerHTML = `
    ${heroCandidate ? renderHero(normalizeItem(heroCandidate)) : ''}
    <div class="rows-wrap">
      ${renderRow('Trending now', trending.map((item) => normalizeItem(item)), 'trending')}
      ${renderRow('Popular movies', popularMovies.map((item) => normalizeItem(item, 'movie')), 'popular-movies')}
      ${renderRow('Top rated series', topTv.map((item) => normalizeItem(item, 'tv')), 'top-tv')}
      ${renderRow('Coming soon', upcomingMovies.map((item) => normalizeItem(item, 'movie')), 'upcoming')}
      ${renderRow('Popular series', popularTv.map((item) => normalizeItem(item, 'tv')), 'popular-tv')}
      ${renderRow('Recently watched', recent.map((item) => normalizeItem(item)), 'recent', {
        subtitle: 'Your activity on this device',
      })}
      ${renderRow('My List', myList.map((item) => normalizeItem(item)), 'my-list', {
        subtitle: 'Saved for later',
      })}
    </div>`;
}

init();
