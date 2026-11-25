import { currentUser } from './auth.js';
import { itemKey, minimalItem } from './utils.js';

const PREFIX = 'toxibhflix.v1';

function storageKey(name) {
  const user = currentUser();
  return `${PREFIX}.${name}.${user?.id || 'guest'}`;
}

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getMyList() {
  return read(storageKey('mylist'));
}

export function isInMyList(id, type) {
  return getMyList().some((item) => itemKey(item) === `${type}:${id}`);
}

export function toggleMyList(rawItem) {
  const item = minimalItem(rawItem);
  const key = itemKey(item);
  const list = getMyList();
  const exists = list.some((entry) => itemKey(entry) === key);
  write(
    storageKey('mylist'),
    exists ? list.filter((entry) => itemKey(entry) !== key) : [item, ...list]
  );
  window.dispatchEvent(new CustomEvent('list:changed'));
  return { added: !exists };
}

export function removeFromMyList(id, type) {
  write(
    storageKey('mylist'),
    getMyList().filter((item) => itemKey(item) !== `${type}:${id}`)
  );
  window.dispatchEvent(new CustomEvent('list:changed'));
}

export function clearMyList() {
  write(storageKey('mylist'), []);
  window.dispatchEvent(new CustomEvent('list:changed'));
}

export function getRecent() {
  return read(storageKey('recent'));
}

export function addRecent(rawItem) {
  const item = minimalItem(rawItem);
  const key = itemKey(item);
  const recent = getRecent().filter((entry) => itemKey(entry) !== key);
  write(storageKey('recent'), [item, ...recent].slice(0, 20));
  window.dispatchEvent(new CustomEvent('recent:changed'));
}

export function clearRecent() {
  write(storageKey('recent'), []);
  window.dispatchEvent(new CustomEvent('recent:changed'));
}
