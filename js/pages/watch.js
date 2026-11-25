import { config, tmdb } from '../api.js';
import { ICONS, renderChrome, renderMessage, showToast } from '../components.js';
import { currentUser } from '../auth.js';
import { addRecent, isInMyList } from '../storage.js';
import {
  EXAMPLE_TEMPLATE,
  EXAMPLE_TV_TEMPLATE,
  resolveEmbedUrl,
} from '../screenscape.js';
import {
  escapeHtml,
  formatRating,
  formatYear,
  normalizeItem,
  queryParams,
  truncate,
} from '../utils.js';

const app = document.getElementById('app');
renderChrome();

const params = queryParams();
const id = params.get('id');
const type = params.get('type') === 'tv' ? 'tv' : 'movie';

function setupPanel(item) {
  const example =
    type === 'tv'
      ? `<code>SCREENSCAPE_TV_EMBED_TEMPLATE=${escapeHtml(EXAMPLE_TV_TEMPLATE)}</code>`
      : `<code>SCREENSCAPE_EMBED_TEMPLATE=${escapeHtml(EXAMPLE_TEMPLATE)}</code>`;
  const where = window.location.hostname.endsWith('.github.io')
    ? 'your committed <code>config.js</code>'
    : '<code>.env.local</code> or your Render environment variables, then restart/redeploy';
  return renderMessage(
    'Screenscape embed not configured',
    `Add ${example} to ${where}. You can also add a per-title URL in <code>js/screenscape-map.js</code>. ${
      item ? `Current title: <strong>${escapeHtml(item.title)}</strong>.` : ''
    }`
  );
}

function episodePicker(seasons, state) {
  if (type !== 'tv') return '';
  const options = seasons
    .map(
      (season) => `<option value="${season.season_number}" ${
        season.season_number === state.season ? 'selected' : ''
      }>${escapeHtml(season.name || `Season ${season.season_number}`)}</option>`
    )
    .join('');
  return `
    <div class="episode-picker">
      <label>Season
        <select id="season-select">${options}</select>
      </label>
      <label>Episode
        <select id="episode-select"></select>
      </label>
      <span class="episode-hint" id="episode-hint"></span>
    </div>`;
}

async function init() {
  if (!id) {
    app.innerHTML = renderMessage('Nothing to play', 'Choose a title from the home page or search results.');
    return;
  }
  if (!config.tmdbConfigured) {
    app.innerHTML = renderMessage(
      'TMDB setup required',
      'Add your TMDB API key to <code>.env.local</code> and restart the server.'
    );
    return;
  }

  app.innerHTML = '<div class="player-shell skeleton-player"></div>';

  let item;
  try {
    item = normalizeItem(await tmdb.details(type, id), type);
  } catch (error) {
    app.innerHTML = renderMessage('Could not load this title', escapeHtml(error.message || 'Unknown error'));
    return;
  }

  document.title = `Watching ${item.title} · Toxibh Flix`;
  if (currentUser()) addRecent(item);

  const seasons = Array.isArray(item.seasons)
    ? item.seasons.filter((season) => Number.isFinite(Number(season.season_number)))
    : [];
  const validSeasons = seasons.length
    ? seasons
    : [{ season_number: 1, episode_count: 1, name: 'Season 1' }];

  const requestedSeason = Number(params.get('s'));
  const requestedEpisode = Number(params.get('e'));
  const state = {
    season: validSeasons.some((season) => season.season_number === requestedSeason)
      ? requestedSeason
      : (validSeasons.find((season) => season.season_number === 1) || validSeasons[0]).season_number,
    episode: Number.isFinite(requestedEpisode) && requestedEpisode > 0 ? requestedEpisode : 1,
  };

  const embedUrl = resolveEmbedUrl(item, state);
  if (!embedUrl) {
    app.innerHTML = `
      <a class="back-link" href="/detail.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(
        item.type
      )}">${ICONS.back}<span>Back to details</span></a>
      ${setupPanel(item)}`;
    return;
  }

  app.innerHTML = `
    <div class="watch-head">
      <a class="back-link" href="/detail.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(
        item.type
      )}">${ICONS.back}<span>Back to details</span></a>
      <div class="watch-heading">
        <h1>${escapeHtml(item.title)}</h1>
        <div class="hero-meta">
          <span class="rating">★ ${formatRating(item.vote_average)}</span>
          <span>${formatYear(item.release_date)}</span>
          <span>${item.type === 'tv' ? 'TV Series' : 'Movie'}</span>
        </div>
      </div>
      <button class="list-toggle with-label" type="button" data-list-toggle data-item='${escapeHtml(
        JSON.stringify({
          id: item.id,
          type: item.type,
          title: item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          overview: item.overview,
          vote_average: item.vote_average,
          release_date: item.release_date,
        })
      )}'>${ICONS.plus}<span>My List</span></button>
    </div>
    ${episodePicker(validSeasons, state)}
    <div class="player-shell" id="player-shell">
      <iframe id="player-frame" src="${escapeHtml(embedUrl)}" title="${escapeHtml(
        item.title
      )}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
      <button class="fullscreen-btn" id="fullscreen-btn" type="button" aria-label="Toggle fullscreen">${ICONS.expand}</button>
    </div>
    <div class="watch-footer">
      <p>${escapeHtml(truncate(item.overview || 'Enjoy the show.', 220))}</p>
      <p class="muted">Playback is provided by your Screenscape embed. If it does not start, check the embed URL and provider settings.</p>
    </div>`;

  const listButton = document.querySelector('[data-list-toggle]');
  if (listButton && isInMyList(Number(item.id), item.type)) {
    listButton.classList.add('is-active');
    listButton.setAttribute('aria-pressed', 'true');
    listButton.innerHTML = `${ICONS.check}<span>In My List</span>`;
  }

  if (type === 'tv') {
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');
    const hint = document.getElementById('episode-hint');

    const maxEpisodes = () =>
      Math.max(
        1,
        Number(validSeasons.find((season) => season.season_number === state.season)?.episode_count) || 1
      );

    const populateEpisodes = () => {
      const max = Math.max(1, maxEpisodes());
      if (state.episode > max) state.episode = 1;
      episodeSelect.innerHTML = Array.from({ length: Math.min(max, 200) }, (_, index) => {
        const number = index + 1;
        return `<option value="${number}" ${number === state.episode ? 'selected' : ''}>Episode ${number}</option>`;
      }).join('');
      if (hint) hint.textContent = `${max} episode${max === 1 ? '' : 's'} listed`;
    };

    const updatePlayer = () => {
      const nextUrl = resolveEmbedUrl(item, state);
      const frame = document.getElementById('player-frame');
      if (frame && nextUrl) frame.src = nextUrl;
      const url = new URL(window.location.href);
      url.searchParams.set('s', String(state.season));
      url.searchParams.set('e', String(state.episode));
      window.history.replaceState({}, '', url);
    };

    seasonSelect?.addEventListener('change', (event) => {
      state.season = Number(event.target.value);
      state.episode = 1;
      populateEpisodes();
      updatePlayer();
    });

    episodeSelect?.addEventListener('change', (event) => {
      state.episode = Number(event.target.value);
      updatePlayer();
    });

    populateEpisodes();
  }

  document.getElementById('fullscreen-btn')?.addEventListener('click', async () => {
    const shell = document.getElementById('player-shell');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell?.requestFullscreen();
    } catch {
      showToast('Fullscreen is not available in this browser', 'error');
    }
  });
}

init();
