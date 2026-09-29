/** Display preferences for this device: larger text, high contrast, calm (no animations) */
const KEY = 'pockeazy-a11y';
export const A11Y_DEFAULTS = { large: false, contrast: false, calm: false };

export function getA11y() {
  try {
    return { ...A11Y_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...A11Y_DEFAULTS };
  }
}

export function applyA11y(prefs = getA11y()) {
  const el = document.documentElement;
  el.classList.toggle('a11y-large', Boolean(prefs.large));
  el.classList.toggle('a11y-contrast', Boolean(prefs.contrast));
  el.classList.toggle('a11y-calm', Boolean(prefs.calm));
}

export function setA11y(patch) {
  const next = { ...getA11y(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  applyA11y(next);
  window.dispatchEvent(new CustomEvent('pockeazy:a11y-changed', { detail: next }));
  return next;
}
