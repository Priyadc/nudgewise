'use client';

import { toast } from 'sonner';

/**
 * Gmail-style delete: the item disappears straight away, a toast offers "Undo" for a few seconds,
 * and the real DELETE only runs once that time is up (or the page is closed).
 *
 *   deleteWithUndo({ label, description, hide, restore, commit })
 */
const pending = new Map();

export function deleteWithUndo({ label = 'Deleted', description, hide, restore, commit, duration = 5000 }) {
  const id = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let settled = false;

  const run = async () => {
    if (settled) return;
    settled = true;
    pending.delete(id);
    try {
      await commit();
    } catch (err) {
      restore?.();
      toast.error(err.message || 'Could not delete');
    }
  };

  hide?.();
  pending.set(id, run);
  toast(label, {
    id,
    description,
    duration,
    action: {
      label: 'Undo',
      onClick: () => {
        if (settled) return;
        settled = true;
        pending.delete(id);
        restore?.();
      },
    },
    onAutoClose: run,
    onDismiss: run,
  });
}

// If the tab is closed while an Undo is still showing, finish the delete
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => pending.forEach((run) => run()));
}
