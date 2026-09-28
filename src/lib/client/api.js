/** Small fetch wrapper: JSON in, JSON out, throws Error(message) on failure */
export async function api(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(path, {
    method,
    signal,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
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
export const emit = (name, detail) => window.dispatchEvent(new CustomEvent(`tickrupee:${name}`, { detail }));
export const on = (name, fn) => {
  const h = (e) => fn(e.detail);
  window.addEventListener(`tickrupee:${name}`, h);
  return () => window.removeEventListener(`tickrupee:${name}`, h);
};
