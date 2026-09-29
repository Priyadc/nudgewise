import { toast } from 'sonner';

/*
 * Offline support: creating or changing tasks, money entries and reminders while offline
 * is saved in an "outbox" on this device and sent automatically once the connection is back.
 */
const OUTBOX = 'pockeazy-outbox';
const QUEUEABLE = [
  { method: 'POST', re: /^\/api\/(tasks|transactions|reminders)$/ },
  { method: 'PATCH', re: /^\/api\/(tasks|transactions|reminders)\/[a-f0-9]{24}$/ },
  { method: 'DELETE', re: /^\/api\/(tasks|transactions|reminders|goals)\/[a-f0-9]{24}$/ },
];

function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX) || '[]');
  } catch {
    return [];
  }
}
function writeOutbox(items) {
  try {
    localStorage.setItem(OUTBOX, JSON.stringify(items));
  } catch {}
}
export const outboxCount = () => readOutbox().length;

function canQueue(path, method) {
  return QUEUEABLE.some((q) => q.method === method && q.re.test(path));
}

let offlineToastAt = 0;
function queue(path, method, body) {
  const items = readOutbox();
  items.push({ path, method, body, at: Date.now() });
  writeOutbox(items);
  emit('outbox-changed', items.length);
  if (Date.now() - offlineToastAt > 4000) {
    offlineToastAt = Date.now();
    toast("You're offline — saved on this device", { description: "It'll sync by itself when you're back online." });
  }
  return { offline: true, queued: true };
}

/** Small fetch wrapper: JSON in, JSON out, throws Error(message) on failure */
export async function api(path, { method = 'GET', body, signal, keepalive } = {}) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline && method !== 'GET' && canQueue(path, method)) return queue(path, method, body);

  let res;
  try {
    res = await fetch(path, {
      method,
      signal,
      keepalive,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch (err) {
    // Network failure (not an abort) → keep the change for later
    if (err?.name !== 'AbortError' && method !== 'GET' && canQueue(path, method)) return queue(path, method, body);
    throw new Error(err?.name === 'AbortError' ? 'Cancelled' : "Can't reach Pockeazy — check your internet connection");
  }
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

let flushing = false;
/** Sends everything saved while offline, in order. Returns how many went through. */
export async function flushOutbox() {
  if (flushing || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 0;
  const items = readOutbox();
  if (!items.length) return 0;
  flushing = true;
  let sent = 0;
  const left = [...items];
  try {
    while (left.length) {
      const it = left[0];
      let res;
      try {
        res = await fetch(it.path, {
          method: it.method,
          headers: it.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
          body: it.body !== undefined ? JSON.stringify(it.body) : undefined,
        });
      } catch {
        break; // still offline — try again later
      }
      left.shift();
      if (res.ok || res.status === 404) sent += 1; // 404 = already deleted elsewhere
      writeOutbox(left);
    }
  } finally {
    flushing = false;
  }
  emit('outbox-changed', left.length);
  if (sent) {
    ['tasks-changed', 'money-changed', 'reminders-changed', 'lists-changed'].forEach((e) => emit(e));
    toast.success(`Back online — synced ${sent} change${sent > 1 ? 's' : ''}`);
  }
  return sent;
}

/** Local-time boundaries for "today", sent to the API so views match the user's timezone */
export function todayParams() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return new URLSearchParams({
    dayStart: start.toISOString(),
    dayEnd: end.toISOString(),
    tz: String(new Date().getTimezoneOffset()),
  });
}

/** Tiny event bus so pages refresh when something is added elsewhere (quick add, voice, etc.) */
export const emit = (name, detail) => window.dispatchEvent(new CustomEvent(`pockeazy:${name}`, { detail }));
export const on = (name, fn) => {
  const h = (e) => fn(e.detail);
  window.addEventListener(`pockeazy:${name}`, h);
  return () => window.removeEventListener(`pockeazy:${name}`, h);
};
