'use client';

import { signOut } from 'next-auth/react';
import { removeLock } from './lock';

/** Sign out and wipe everything this device kept for offline use */
export async function logout() {
  try {
    ['pockeazy-outbox', 'pockeazy-day-cleared'].forEach((k) => localStorage.removeItem(k));
    removeLock();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('pockeazy-data') || k.startsWith('pockeazy-pages')).map((k) => caches.delete(k)));
    }
  } catch {}
  return signOut({ callbackUrl: '/' });
}
