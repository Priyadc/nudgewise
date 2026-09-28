export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'USD', label: 'US Dollar ($)', locale: 'en-US' },
  { code: 'EUR', label: 'Euro (€)', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound (£)', locale: 'en-GB' },
  { code: 'AED', label: 'UAE Dirham (د.إ)', locale: 'en-AE' },
  { code: 'SGD', label: 'Singapore Dollar (S$)', locale: 'en-SG' },
  { code: 'AUD', label: 'Australian Dollar (A$)', locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian Dollar (C$)', locale: 'en-CA' },
  { code: 'JPY', label: 'Japanese Yen (¥)', locale: 'ja-JP' },
];

export function formatMoney(amount, currency = 'INR', { compact = false } = {}) {
  const locale = CURRENCIES.find((c) => c.code === currency)?.locale || 'en-IN';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard',
    }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;

export function relativeDay(date, now = new Date()) {
  const d = new Date(date);
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((a - b) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(date, now = new Date()) {
  const s = Math.round((new Date(date) - now) / 1000);
  const abs = Math.abs(s);
  if (!rtf) return '';
  if (abs < 60) return rtf.format(s, 'second');
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

/** Value for <input type="datetime-local"> in the user's local time */
export function toLocalInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInput(date) {
  return date ? toLocalInput(date).slice(0, 10) : '';
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const PRIORITIES = [
  { value: 0, label: 'None', color: 'var(--text-3)' },
  { value: 1, label: 'Low', color: 'var(--info)' },
  { value: 2, label: 'Medium', color: 'var(--warning)' },
  { value: 3, label: 'High', color: 'var(--danger)' },
];
