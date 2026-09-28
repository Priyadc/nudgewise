/**
 * Only allow redirects to paths on this site ("/tasks"), never to another domain.
 * Also accepts absolute URLs on our own origin (NextAuth sometimes sends those).
 */
export function safeCallback(value, fallback = '/dashboard') {
  if (!value || typeof value !== 'string') return fallback;
  try {
    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const url = new URL(value, base);
    if (url.origin !== new URL(base).origin) return fallback;
    const path = `${url.pathname}${url.search}`;
    return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login') ? path : fallback;
  } catch {
    return fallback;
  }
}
