import { ICONS, renderChrome, showToast } from '../components.js';
import { currentUser, login, logout, register } from '../auth.js';
import { escapeHtml, queryParams } from '../utils.js';

const app = document.getElementById('app');
renderChrome();

const redirectTarget = queryParams().get('redirect') || '/index.html';
const safeRedirect = redirectTarget.startsWith('/') && !redirectTarget.startsWith('//') ? redirectTarget : '/index.html';

function signedInPanel() {
  const user = currentUser();
  app.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">Toxibh<span>Flix</span></div>
      <h1>Welcome back, ${escapeHtml(user.name)}</h1>
      <p class="muted">You are signed in on this device.</p>
      <div class="auth-actions">
        <a class="btn btn-primary" href="${escapeHtml(safeRedirect)}">Continue</a>
        <button class="btn btn-outline" type="button" id="sign-out">Sign out</button>
      </div>
    </div>`;
  document.getElementById('sign-out')?.addEventListener('click', () => {
    logout();
    window.location.reload();
  });
}

function authPanel() {
  app.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">Toxibh<span>Flix</span></div>
      <div class="auth-tabs" role="tablist">
        <button type="button" class="auth-tab active" data-mode="login">Sign in</button>
        <button type="button" class="auth-tab" data-mode="register">Create account</button>
      </div>
      <form id="auth-form" novalidate>
        <div class="field" id="name-field" hidden>
          <label for="name">Name</label>
          <input id="name" name="name" type="text" autocomplete="name" placeholder="Your name" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" placeholder="At least 6 characters" required />
        </div>
        <p class="form-error" id="form-error" role="alert"></p>
        <button class="btn btn-primary btn-block" type="submit" id="submit-btn">Sign in</button>
      </form>
      <p class="auth-note">Demo accounts are stored in this browser only, with a salted SHA-256 hash. Use a real auth backend before deploying publicly.</p>
    </div>`;

  let mode = 'login';
  const form = document.getElementById('auth-form');
  const nameField = document.getElementById('name-field');
  const errorBox = document.getElementById('form-error');
  const submitButton = document.getElementById('submit-btn');

  app.querySelectorAll('[data-mode]').forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      app.querySelectorAll('[data-mode]').forEach((node) => node.classList.toggle('active', node === tab));
      nameField.hidden = mode !== 'register';
      submitButton.textContent = mode === 'register' ? 'Create account' : 'Sign in';
      errorBox.textContent = '';
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    errorBox.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Please wait…';
    try {
      const result = mode === 'register' ? await register(values) : await login(values);
      if (!result.ok) {
        errorBox.textContent = result.error;
        return;
      }
      showToast(mode === 'register' ? 'Account created' : 'Signed in', 'success');
      window.location.href = safeRedirect;
    } catch (error) {
      errorBox.textContent = error.message || 'Something went wrong.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === 'register' ? 'Create account' : 'Sign in';
    }
  });
}

if (currentUser()) signedInPanel();
else authPanel();
