import { ICONS, renderChrome, renderGrid, renderMessage } from '../components.js';
import { currentUser } from '../auth.js';
import { clearMyList, clearRecent, getMyList, getRecent } from '../storage.js';
import { escapeHtml, normalizeItem } from '../utils.js';

const app = document.getElementById('app');
renderChrome();

function section(title, items, kind, subtitle) {
  if (!items.length) {
    return `<section class="list-section">
      <div class="row-heading"><h2>${escapeHtml(title)}</h2></div>
      <div class="empty-inline">${kind === 'mylist' ? 'Your list is empty. Add titles from any detail page.' : 'Nothing watched yet.'}</div>
    </section>`;
  }
  return `<section class="list-section">
    <div class="row-heading">
      <h2>${escapeHtml(title)}</h2>
      <span>${escapeHtml(subtitle)}</span>
      <button class="text-btn" type="button" data-clear="${kind}">Clear all</button>
    </div>
    ${renderGrid(items, { removable: kind === 'mylist' })}
  </section>`;
}

function render() {
  const user = currentUser();
  if (!user) {
    app.innerHTML = `
      ${renderMessage(
        'Sign in to see your list',
        'Your saved titles and watch activity are stored locally for each account on this device.'
      )}
      <div class="center-cta"><a class="btn btn-primary" href="/login.html?redirect=${encodeURIComponent(
        '/my-list.html'
      )}">${ICONS.play}<span>Sign in</span></a></div>`;
    return;
  }

  const list = getMyList().map((item) => normalizeItem(item));
  const recent = getRecent().map((item) => normalizeItem(item));

  app.innerHTML = `
    <div class="page-head">
      <span class="eyebrow">${escapeHtml(user.name)}'s space</span>
      <h1>My List</h1>
      <p>Everything you saved, plus what you recently opened on this device.</p>
    </div>
    ${section('Saved titles', list, 'mylist', `${list.length} title${list.length === 1 ? '' : 's'}`)}
    ${section('Recently watched', recent, 'recent', `${recent.length} title${recent.length === 1 ? '' : 's'}`)}`;
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-clear]');
  if (!button) return;
  if (button.dataset.clear === 'mylist') clearMyList();
  else clearRecent();
  render();
});

window.addEventListener('auth:changed', render);
window.addEventListener('list:changed', render);
window.addEventListener('recent:changed', render);

render();
