import { config, imageUrl } from './api.js';
import { currentUser, logout } from './auth.js';
import { toggleMyList, isInMyList, removeFromMyList } from './storage.js';
import {
  escapeHtml,
  detailUrl,
  itemKey,
  minimalItem,
  truncate,
  formatRating,
  formatYear,
  typeLabel,
} from './utils.js';

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19 20 8l-1.4-1.4z"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 10-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 7.4L10 6l6 6-6 6-1.4-1.4 4.6-4.6z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
};

function listButton(item, variant = 'icon') {
  const saved = isInMyList(Number(item.id), item.type || 'movie');
  const label = saved ? 'In My List' : 'My List';
  return `<button class="list-toggle ${saved ? 'is-active' : ''} ${variant === 'text' ? 'with-label' : ''}" type="button"
    data-list-toggle data-item='${escapeHtml(JSON.stringify(minimalItem(item)))}'
    aria-pressed="${saved}" aria-label="${label}" title="${label}">
    ${saved ? ICONS.check : ICONS.plus}${variant === 'text' ? `<span>${label}</span>` : ''}
  </button>`;
}

export function renderChrome() {
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="/index.html" aria-label="${escapeHtml(config.siteName)} home">
          <span class="brand-mark">TF</span>
          <span class="brand-name">Toxibh<span>Flix</span></span>
        </a>
        <nav class="nav-links" id="main-nav" aria-label="Main navigation">
          <a href="/index.html" data-nav="home">Home</a>
          <a href="/search.html" data-nav="search">Search</a>
          <a href="/my-list.html" data-nav="mylist">My List</a>
        </nav>
        <form class="header-search" id="header-search" role="search">
          ${ICONS.search}
          <input type="search" name="q" placeholder="Search movies & shows" aria-label="Search movies and shows" />
          <button type="submit" class="sr-only">Search</button>
        </form>
        <div class="header-actions" id="auth-actions"></div>
        <button class="menu-toggle" type="button" data-menu-toggle aria-label="Open menu">☰</button>
      </div>`;
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML = `
      <div class="footer-inner">
        <span class="footer-brand">Toxibh<span>Flix</span></span>
        <p>Movie data from TMDB. Playback provided by your Screenscape account.</p>
        <span class="footer-note">For personal/demo use. Not affiliated with Netflix or TMDB.</span>
      </div>`;
  }

  const banner = document.getElementById('setup-banner');
  if (banner && !config.tmdbConfigured) {
    banner.innerHTML = `
      <div class="setup-banner">
        <strong>Setup needed:</strong> add <code>TMDB_API_KEY</code> to <code>.env.local</code> (or your Render environment variables), or set <code>apiBaseUrl</code> in <code>config.js</code> for GitHub Pages.
      </div>`;
  }

  updateAuthUI();
  bindGlobalActions();
  markActiveNav();

  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });

  window.addEventListener('auth:changed', updateAuthUI);
}

function markActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const active = page.startsWith('index') ? 'home' : page.startsWith('search') ? 'search' : page.startsWith('my-list') ? 'mylist' : '';
  if (!active) return;
  document.querySelector(`[data-nav="${active}"]`)?.classList.add('active');
}

export function updateAuthUI() {
  const host = document.getElementById('auth-actions');
  if (!host) return;
  const user = currentUser();

  if (!user) {
    host.innerHTML = '<a class="btn btn-sm btn-outline" href="/login.html">Sign in</a>';
    return;
  }

  host.innerHTML = `
    <div class="user-menu">
      <button class="avatar" type="button" data-avatar aria-label="Account menu" aria-expanded="false">${escapeHtml(
        (user.name || 'U').charAt(0).toUpperCase()
      )}</button>
      <div class="user-dropdown" data-user-dropdown>
        <div class="dropdown-heading">
          <strong>${escapeHtml(user.name)}</strong>
          <span>${escapeHtml(user.email)}</span>
        </div>
        <a href="/my-list.html">My List</a>
        <button type="button" data-logout>Sign out</button>
      </div>
    </div>`;
}

export function renderHero(item) {
  const backdrop = imageUrl(item.backdrop_path || item.poster_path, 'original', 'backdrop');
  return `
    <section class="hero" style="--hero-image: url('${backdrop}')">
      <div class="hero-vignette"></div>
      <div class="hero-bottom-fade"></div>
      <div class="hero-content">
        <div class="hero-kicker"><span class="badge">${typeLabel(item.type)}</span><span>Top pick</span></div>
        <h1>${escapeHtml(item.title)}</h1>
        <div class="hero-meta">
          <span class="rating">★ ${formatRating(item.vote_average)}</span>
          <span>${formatYear(item.release_date)}</span>
          <span>${escapeHtml((item.genres || []).map((genre) => genre.name).slice(0, 3).join(' • '))}</span>
        </div>
        <p class="hero-overview">${escapeHtml(truncate(item.overview, 260))}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/watch.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(
            item.type || 'movie'
          )}">${ICONS.play}<span>Play now</span></a>
          <a class="btn btn-ghost" href="${detailUrl(item)}">${ICONS.info}<span>More info</span></a>
          ${listButton(item, 'text')}
        </div>
      </div>
    </section>`;
}

export function renderCard(item) {
  const poster = imageUrl(item.poster_path, 'w500');
  return `
    <a class="card" href="${detailUrl(item)}" aria-label="${escapeHtml(item.title)}">
      <img src="${poster}" alt="${escapeHtml(item.title)} poster" loading="lazy" />
      <span class="card-rating">★ ${formatRating(item.vote_average)}</span>
      <div class="card-overlay">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${formatYear(item.release_date)} • ${escapeHtml(typeLabel(item.type))}</p>
      </div>
    </a>`;
}

export function renderRow(title, items, id, options = {}) {
  if (!items?.length) return '';
  return `
    <section class="row" id="row-${escapeHtml(id)}">
      <div class="row-heading">
        <h2>${escapeHtml(title)}</h2>
        ${options.subtitle ? `<span>${escapeHtml(options.subtitle)}</span>` : ''}
        <div class="row-controls">
          <button type="button" data-scroll="${escapeHtml(id)}" data-dir="prev" aria-label="Scroll left">${ICONS.left}</button>
          <button type="button" data-scroll="${escapeHtml(id)}" data-dir="next" aria-label="Scroll right">${ICONS.right}</button>
        </div>
      </div>
      <div class="row-track" data-track="${escapeHtml(id)}">
        ${items.map((item) => renderCard(item)).join('')}
      </div>
    </section>`;
}

export function renderGrid(items, options = {}) {
  if (!items?.length) return '';
  return `<div class="card-grid">${items
    .map(
      (item) => `
        <div class="grid-item">
          ${renderCard(item)}
          ${options.removable ? `<button class="remove-btn" type="button" data-list-remove data-id="${
            item.id
          }" data-type="${item.type || 'movie'}" aria-label="Remove ${escapeHtml(item.title)}">${ICONS.close}</button>` : ''}
        </div>`
    )
    .join('')}</div>`;
}

export function renderSkeletonRows(count = 3) {
  return Array.from({ length: count }, () => `
    <section class="row skeleton-row">
      <div class="skeleton skeleton-title"></div>
      <div class="row-track">${Array.from({ length: 6 }, () => '<div class="skeleton skeleton-card"></div>').join('')}</div>
    </section>`).join('');
}

export function renderMessage(title, message, icon = 'info') {
  return `
    <div class="message-panel">
      <div class="message-icon">${ICONS[icon] || ICONS.info}</div>
      <h2>${escapeHtml(title)}</h2>
      <p>${message}</p>
    </div>`;
}

export function showToast(message, kind = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}`;
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function openTrailerModal(videoKey) {
  if (!/^[A-Za-z0-9_-]+$/.test(videoKey || '')) return;
  const host = document.getElementById('modal-host') || document.body;
  host.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="Trailer">
        <button class="modal-close" type="button" data-close-modal aria-label="Close trailer">${ICONS.close}</button>
        <div class="video-frame">
          <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(
            videoKey
          )}?autoplay=1&rel=0" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>
    </div>`;
  document.body.classList.add('modal-open');
}

function closeTrailerModal() {
  const host = document.getElementById('modal-host');
  if (host) host.innerHTML = '';
  document.body.classList.remove('modal-open');
}

function bindGlobalActions() {
  document.addEventListener('click', async (event) => {
    const scrollButton = event.target.closest('[data-scroll]');
    if (scrollButton) {
      const track = document.querySelector(`[data-track="${scrollButton.dataset.scroll}"]`);
      if (track) {
        const amount = track.clientWidth * 0.85;
        track.scrollBy({
          left: scrollButton.dataset.dir === 'next' ? amount : -amount,
          behavior: 'smooth',
        });
      }
      return;
    }

    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) {
      closeTrailerModal();
      return;
    }

    const trailerButton = event.target.closest('[data-trailer]');
    if (trailerButton) {
      openTrailerModal(trailerButton.dataset.trailer);
      return;
    }

    const removeButton = event.target.closest('[data-list-remove]');
    if (removeButton) {
      event.preventDefault();
      removeFromMyList(Number(removeButton.dataset.id), removeButton.dataset.type);
      removeButton.closest('.grid-item')?.remove();
      showToast('Removed from My List', 'success');
      return;
    }

    const toggleButton = event.target.closest('[data-list-toggle]');
    if (toggleButton) {
      event.preventDefault();
      if (!currentUser()) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?redirect=${redirect}`;
        return;
      }
      let item;
      try {
        item = JSON.parse(toggleButton.dataset.item);
      } catch {
        return;
      }
      const { added } = toggleMyList(item);
      toggleButton.classList.toggle('is-active', added);
      toggleButton.setAttribute('aria-pressed', String(added));
      if (toggleButton.classList.contains('with-label')) {
        const label = toggleButton.querySelector('span');
        if (label) label.textContent = added ? 'In My List' : 'My List';
      }
      const icon = toggleButton.querySelector('svg');
      if (icon) icon.outerHTML = added ? ICONS.check : ICONS.plus;
      showToast(added ? 'Added to My List' : 'Removed from My List', 'success');
      return;
    }

    const avatar = event.target.closest('[data-avatar]');
    if (avatar) {
      const dropdown = document.querySelector('[data-user-dropdown]');
      const isOpen = dropdown?.classList.toggle('open');
      avatar.setAttribute('aria-expanded', String(Boolean(isOpen)));
      return;
    }

    const logoutButton = event.target.closest('[data-logout]');
    if (logoutButton) {
      logout();
      window.location.href = '/index.html';
      return;
    }

    const menuButton = event.target.closest('[data-menu-toggle]');
    if (menuButton) {
      document.getElementById('main-nav')?.classList.toggle('open');
      return;
    }

    if (!event.target.closest('.user-menu')) {
      document.querySelector('[data-user-dropdown]')?.classList.remove('open');
      document.querySelectorAll('[data-avatar]').forEach((node) => node.setAttribute('aria-expanded', 'false'));
    }
  });

  const searchForm = document.getElementById('header-search');
  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = new FormData(searchForm).get('q')?.toString().trim();
    window.location.href = query ? `/search.html?q=${encodeURIComponent(query)}` : '/search.html';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTrailerModal();
  });
}

export { ICONS };
