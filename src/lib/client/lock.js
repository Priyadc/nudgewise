/**
 * Optional PIN lock for the Money section — stored on this device only (like a banking app).
 * The PIN itself is never stored: only a salted SHA-256 hash.
 */
const KEY = 'pockeazy-money-lock';
const SESSION = 'pockeazy-money-unlocked';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

async function hash(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const hasLock = () => Boolean(read());

export async function setPin(pin) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(KEY, JSON.stringify({ salt, hash: await hash(pin, salt) }));
  markUnlocked();
}

export async function checkPin(pin) {
  const lock = read();
  if (!lock) return true;
  return (await hash(pin, lock.salt)) === lock.hash;
}

export function removeLock() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(SESSION);
  } catch {}
}

export function isUnlocked() {
  try {
    return sessionStorage.getItem(SESSION) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked() {
  try {
    sessionStorage.setItem(SESSION, '1');
  } catch {}
}

export function relock() {
  try {
    sessionStorage.removeItem(SESSION);
  } catch {}
}
