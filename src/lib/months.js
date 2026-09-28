/**
 * Month boundaries in the user's local time.
 * `tzOffset` is the value of `new Date().getTimezoneOffset()` from the browser (IST = -330).
 */
export function monthBounds(key, tzOffset = 0) {
  const [y, m] = key.split('-').map(Number);
  const off = Number(tzOffset) || 0;
  return {
    start: new Date(Date.UTC(y, m - 1, 1) + off * 60000),
    end: new Date(Date.UTC(y, m, 1) + off * 60000),
  };
}

export function isMonthKey(s) {
  return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function currentMonthKey(tzOffset = 0) {
  const local = new Date(Date.now() - (Number(tzOffset) || 0) * 60000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
