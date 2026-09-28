'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, on } from '@/lib/client/api';
import { applyAccent } from '@/lib/theme';
import { setCustomCategories } from '@/lib/categories';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [features, setFeatures] = useState({});
  const [lists, setLists] = useState([]);
  const [quickAdd, setQuickAdd] = useState({ open: false, mode: 'task', listId: null });
  const [categories, setCategoriesState] = useState([]);

  /** Custom money categories: kept in state (to re-render) and in the shared registry (for lookups) */
  const setCategories = useCallback((list) => {
    setCustomCategories(list);
    setCategoriesState(list || []);
  }, []);

  const reloadUser = useCallback(async () => {
    try {
      const d = await api('/api/user');
      setUser(d.user);
      setFeatures(d.features || {});
      setCategories(d.user?.categories || []);
      if (d.user?.settings?.accent) applyAccent(d.user.settings.accent);
    } catch {}
  }, [setCategories]);

  const reloadLists = useCallback(async () => {
    try {
      const d = await api('/api/lists');
      setLists(d.lists);
    } catch {}
  }, []);

  useEffect(() => {
    reloadUser();
    reloadLists();
  }, [reloadUser, reloadLists]);

  // Keep sidebar counts fresh whenever tasks or lists change anywhere
  useEffect(() => on('tasks-changed', reloadLists), [reloadLists]);
  useEffect(() => on('lists-changed', reloadLists), [reloadLists]);

  const openQuickAdd = useCallback((mode = 'task', listId = null) => setQuickAdd({ open: true, mode, listId }), []);
  const closeQuickAdd = useCallback(() => setQuickAdd((q) => ({ ...q, open: false })), []);

  const currency = user?.settings?.currency || 'INR';

  return (
    <AppContext.Provider
      value={{ user, setUser, features, categories, setCategories, lists, setLists, reloadLists, reloadUser, currency, quickAdd, openQuickAdd, closeQuickAdd }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
