import { config, imageUrl, tmdb } from '../api.js';
import {
  ICONS,
  renderChrome,
  renderMessage,
  renderRow,
  renderSkeletonRows,
  showToast,
} from '../components.js';
import {
  escapeHtml,
  formatRating,
  formatRuntime,
  formatYear,
  normalizeItem,
  queryParams,
  truncate,
} from '../utils.js';
import { isInMyList } from '../storage.js';

const app = document.getElementById('app');
renderChrome();

const params = queryParams();
const id = params.get('id');
const type = params.get('type') === 'tv' ? 'tv' : 'movie';

function pickTrailer(videos = []) {
  const youtube = videos.filter(
    (video) => video.site === 'YouTube' && ['Trailer', 'Teaser'].includes(video.type)
  );
  return youtube.find((video) => video.type === 'Trailer') || youtube[0] || null;
}

function castMarkup(credits = {}) {
  const cast = (credits.cast || []).slice(0, 12);
  if (!cast.length) return '<p class="muted">Cast information is unavailable.</p>';
  return `<div class="cast-grid">${cast
    .map((person) => {
      const photo = imageUrl(person.profile_path, 'w185');
      return `<div class="cast-card">
        <img src="${photo}" alt="${escapeHtml(person.name)}" loading="lazy" />
        <strong>${escapeHtml(person.name)}</strong>
        <span>${escapeHtml(person.character || 'Cast')}</span>
      </div>`;
    })
    .join('')}</div>`;
}

function factsMarkup(item) {
  const facts = [
    ['Type', item.type === 'tv' ? 'TV Series' : 'Movie'],
    ['Released', formatYear(item.release_date)],
    ['Runtime', item.runtime ? formatRuntime(item.runtime) : item.episode_run_time?.[0] ? formatRuntime(item.episode_run_time[0]) : '—'],
    ['Rating', `★ ${formatRating(item.vote_average)} (${(item.vote_count || 0).toLocaleString()} votes)`],
  ];
  if (item.genres?.length) facts.push(['Genres', item.genres.map((genre) => genre.name).join(', ')]);
  if (item.seasons?.length) facts.push(['Seasons', String(item.seasons.length)]);
  if (item.status) facts.push(['Status', item.status]);
  if (item.budget) facts.push(['Budget', `$${item.budget.toLocaleString()}`]);
  const languages = item.spoken_languages?.map((lang) => lang.english_name || lang.name).filter(Boolean);
  if (languages?.length) facts.push(['Languages', languages.slice(0, 3).join(', ')]);

  return `<dl class="facts">${facts
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`)
    .join('')}</dl>`;
}

async function init() {
  if (!id) {
    app.innerHTML = renderMessage('Missing title', 'Open a title from the homepage to see its details.');
    return;
  }
  if (!config.tmdbConfigured) {
    app.innerHTML = renderMessage(
      'TMDB setup required',
      'Add your TMDB API key to <code>.env.local</code> and restart the server.'
    );
    return;
  }

  app.innerHTML = `<div class="page-container">${renderSkeletonRows(1)}</div>`;

  try {
    const data = await tmdb.details(type, id, 'videos,credits,recommendations');
    const item = normalizeItem(data, type);
    const trailer = pickTrailer(data.videos?.results);
    const backdrop = imageUrl(item.backdrop_path || item.poster_path, 'original', 'backdrop');
    document.title = `${item.title} · Toxibh Flix`;

    app.innerHTML = `
      <section class="detail-hero" style="--hero-image: url('${backdrop}')">
        <div class="hero-vignette"></div>
        <div class="hero-bottom-fade"></div>
        <div class="detail-hero-content page-container">
          <a class="back-link" href="/index.html">${ICONS.back}<span>Back to browse</span></a>
          <div class="hero-kicker"><span class="badge">${item.type === 'tv' ? 'TV Series' : 'Movie'}</span>${
            item.tagline ? `<span>${escapeHtml(item.tagline)}</span>` : ''
          }</div>
          <h1>${escapeHtml(item.title)}</h1>
          <div class="hero-meta">
            <span class="rating">★ ${formatRating(item.vote_average)}</span>
            <span>${formatYear(item.release_date)}</span>
            <span>${item.runtime ? formatRuntime(item.runtime) : '—'}</span>
            <span>${escapeHtml(item.adult ? 'Adults only' : 'All ages')}</span>
          </div>
          <p class="hero-overview">${escapeHtml(truncate(item.overview, 420))}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/watch.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(
              item.type
            )}">${ICONS.play}<span>Play now</span></a>
            ${trailer ? `<button class="btn btn-ghost" type="button" data-trailer="${escapeHtml(
              trailer.key
            )}">${ICONS.play}<span>Watch trailer</span></button>` : ''}
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
        </div>
      </section>
      <div class="detail-body page-container">
        ${factsMarkup(item)}
        <section class="detail-section">
          <h2>Cast</h2>
          ${castMarkup(data.credits)}
        </section>
        ${renderRow('More like this', (data.recommendations?.results || []).map((entry) => normalizeItem(entry)), 'recommendations')}
      </div>`;

    // Keep the list button state in sync with storage.
    const listButton = document.querySelector('[data-list-toggle]');
    if (listButton && isInMyList(Number(item.id), item.type)) {
      listButton.classList.add('is-active');
      listButton.setAttribute('aria-pressed', 'true');
      listButton.innerHTML = `${ICONS.check}<span>In My List</span>`;
    }
  } catch (error) {
    app.innerHTML = renderMessage('Could not load this title', escapeHtml(error.message || 'Unknown error'));
    showToast(error.message || 'Request failed', 'error');
  }
}

init();
