import { parseTransaction } from '@/lib/nlp';

/**
 * Guesses the category (and payment method) for a note.
 * 1. Your own history: what you picked last time for the same or a similar note
 * 2. Otherwise the built-in keywords ("swiggy" → Food & Dining)
 */
export function guessEntry(note, type, memory = []) {
  const q = String(note || '').trim().toLowerCase();
  if (q.length < 2) return null;
  const mine = memory.filter((m) => m.type === type);
  const first = q.split(/\s+/)[0];
  const hit =
    mine.find((m) => m.key === q) ||
    (q.length >= 3 && mine.find((m) => m.key.startsWith(q))) ||
    (first.length >= 3 && mine.find((m) => m.key.split(/\s+/)[0] === first));
  if (hit) return { category: hit.category, method: hit.method, source: 'history' };

  const parsed = parseTransaction(`${type === 'income' ? 'received' : 'spent'} ${note}`);
  if (parsed.category && parsed.category !== 'Other' && parsed.category !== 'Other Income' && parsed.type === type) {
    return { category: parsed.category, source: 'keywords' };
  }
  return null;
}
