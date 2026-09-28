'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api';

/**
 * Fetches JSON from an API path and keeps it in state.
 *   const { data, loading, error, reload, setData } = useApi('/api/tasks?view=today')
 * Pass null as path to skip fetching.
 */
export function useApi(path, { keepPrevious = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(null);
  const ctrl = useRef(null);

  const load = useCallback(
    async (silent = false) => {
      if (!path) return;
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      if (!silent) setLoading(true);
      if (!keepPrevious) setData(null);
      try {
        const d = await api(path, { signal: c.signal });
        setData(d);
        setError(null);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e);
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    },
    [path, keepPrevious]
  );

  useEffect(() => {
    load();
    return () => ctrl.current?.abort();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}
