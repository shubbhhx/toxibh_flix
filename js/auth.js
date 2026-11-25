const USERS_KEY = 'toxibhflix.users.v1';
const SESSION_KEY = 'toxibhflix.session.v1';

function readUsers() {
  try {
    const value = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function notify() {
  window.dispatchEvent(new CustomEvent('auth:changed', { detail: currentUser() }));
}

export function currentUser() {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const found = readUsers().find((user) => user.id === id);
  if (!found) return null;
  return { id: found.id, name: found.name, email: found.email, createdAt: found.createdAt };
}

async function digest(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure password hashing is unavailable. Use localhost or HTTPS.');
  }
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function makeSalt() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setSession(id) {
  localStorage.setItem(SESSION_KEY, id);
  notify();
}

export async function register({ name, email, password }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanName.length < 2) return { ok: false, error: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (String(password || '').length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const users = readUsers();
  if (users.some((user) => user.email === cleanEmail)) {
    return { ok: false, error: 'An account with that email already exists.' };
  }

  const salt = makeSalt();
  const user = {
    id: makeSalt(),
    name: cleanName,
    email: cleanEmail,
    salt,
    passwordHash: await digest(`${salt}:${password}`),
    createdAt: new Date().toISOString(),
  };

  writeUsers([...users, user]);
  setSession(user.id);
  return { ok: true, user: { id: user.id, name: user.name, email: user.email } };
}

export async function login({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = readUsers().find((entry) => entry.email === cleanEmail);
  if (!user) return { ok: false, error: 'No account found with that email.' };

  const hash = await digest(`${user.salt}:${password || ''}`);
  if (hash !== user.passwordHash) {
    return { ok: false, error: 'Incorrect password.' };
  }

  setSession(user.id);
  return { ok: true, user: { id: user.id, name: user.name, email: user.email } };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  notify();
}
