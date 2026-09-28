/** Accent themes. Values are OKLCH hues used by --accent-h in globals.css */
export const ACCENTS = [
  { id: 'violet', label: 'Violet', hue: 293, swatch: '#8b5cf6' },
  { id: 'blue', label: 'Ocean', hue: 259, swatch: '#3b82f6' },
  { id: 'cyan', label: 'Lagoon', hue: 215, swatch: '#06b6d4' },
  { id: 'emerald', label: 'Emerald', hue: 163, swatch: '#10b981' },
  { id: 'amber', label: 'Sunset', hue: 60, swatch: '#f59e0b' },
  { id: 'rose', label: 'Rose', hue: 10, swatch: '#f43f5e' },
  { id: 'fuchsia', label: 'Fuchsia', hue: 330, swatch: '#d946ef' },
];

export const ACCENT_STORAGE_KEY = 'nudgewise-accent';

export function applyAccent(id) {
  const accent = ACCENTS.find((a) => a.id === id) || ACCENTS[0];
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--accent-h', String(accent.hue));
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent.id);
    } catch {}
  }
  return accent;
}

/** Inline script that runs before paint to avoid an accent-color flash */
export const accentBootScript = `(function(){try{var m=${JSON.stringify(
  Object.fromEntries(ACCENTS.map((a) => [a.id, a.hue]))
)};var id=localStorage.getItem('${ACCENT_STORAGE_KEY}');if(id&&m[id]!==undefined){document.documentElement.style.setProperty('--accent-h',m[id]);}}catch(e){}})();`;
