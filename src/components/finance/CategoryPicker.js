'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import CategoryIcon, { ICONS } from '@/components/ui/CategoryIcon';
import { useApp } from '@/components/layout/AppContext';
import { api } from '@/lib/client/api';
import { getCategories, CUSTOM_ICON_CHOICES, CUSTOM_COLOR_CHOICES } from '@/lib/categories';

/**
 * Searchable grid of categories for 'expense' or 'income', including the user's own,
 * with an inline "New category" creator.
 */
export default function CategoryPicker({ type, value, onChange, exclude = [] }) {
  const { categories: custom, setCategories } = useApp();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', icon: 'Tag', color: CUSTOM_COLOR_CHOICES[0] });
  const [saving, setSaving] = useState(false);

  // `custom` is in the deps so the grid refreshes right after a category is created
  const all = useMemo(() => getCategories(type).filter((c) => !exclude.includes(c.name)), [type, custom, exclude]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = q.trim() ? all.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())) : all;

  async function create(e) {
    e?.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const d = await api('/api/categories', { method: 'POST', body: { ...draft, name: draft.name.trim(), type } });
      setCategories(d.categories);
      onChange(d.category.name);
      toast.success(`Category "${d.category.name}" added`);
      setCreating(false);
      setQ('');
      setDraft({ name: '', icon: 'Tag', color: CUSTOM_COLOR_CHOICES[0] });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack stack-sm">
      <div className="row" style={{ gap: 6 }}>
        <div className="input-wrap grow">
          <Search />
          <input className="input" placeholder={`Search ${all.length} categories`} value={q} onChange={(e) => setQ(e.target.value)} style={{ height: 38 }} aria-label="Search categories" />
        </div>
        <button
          type="button"
          className="btn btn-soft btn-sm"
          style={{ height: 38 }}
          onClick={() => {
            setCreating((c) => !c);
            setDraft((d) => ({ ...d, name: q.trim() }));
          }}
        >
          {creating ? <X /> : <Plus />} {creating ? 'Close' : 'New'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {creating && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
              <div className="stack">
                <div className="row" style={{ gap: 10 }}>
                  <CategoryIcon meta={draft} size={42} />
                  <input
                    className="input grow"
                    placeholder={type === 'income' ? 'e.g. Tuition I teach' : 'e.g. Gym supplements'}
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && create(e)}
                    maxLength={40}
                    autoFocus
                    aria-label="Category name"
                  />
                </div>
                <div>
                  <span className="label">Icon</span>
                  <div className="row row-wrap" style={{ gap: 6, marginTop: 6 }}>
                    {CUSTOM_ICON_CHOICES.map((name) => {
                      const Icon = ICONS[name];
                      if (!Icon) return null;
                      return (
                        <button
                          key={name}
                          type="button"
                          className="btn btn-icon btn-sm"
                          aria-label={name}
                          aria-pressed={draft.icon === name}
                          onClick={() => setDraft((d) => ({ ...d, icon: name }))}
                          style={{
                            background: draft.icon === name ? `${draft.color}22` : 'var(--surface-solid)',
                            color: draft.icon === name ? draft.color : 'var(--text-2)',
                            boxShadow: draft.icon === name ? `0 0 0 2px ${draft.color}` : 'none',
                          }}
                        >
                          <Icon />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="label">Colour</span>
                  <div className="row row-wrap" style={{ gap: 8, marginTop: 6 }}>
                    {CUSTOM_COLOR_CHOICES.map((c) => (
                      <button key={c} type="button" className="swatch" style={{ background: c, width: 28, height: 28 }} aria-label={`Colour ${c}`} aria-pressed={draft.color === c} onClick={() => setDraft((d) => ({ ...d, color: c }))}>
                        {draft.color === c && <Check />}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={create} disabled={saving || !draft.name.trim()} style={{ alignSelf: 'flex-end' }}>
                  {saving ? <Loader2 className="spin" /> : <Plus />} Add category
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="cat-grid" style={{ maxHeight: 280, overflowY: 'auto', padding: 2 }}>
        {shown.map((c) => (
          <button key={c.name} type="button" className="cat-option" aria-pressed={value === c.name} onClick={() => onChange(c.name)}>
            <CategoryIcon name={c.name} size={32} />
            {c.name}
          </button>
        ))}
        {shown.length === 0 && (
          <button
            type="button"
            className="cat-option"
            onClick={() => {
              setCreating(true);
              setDraft((d) => ({ ...d, name: q.trim() }));
            }}
            style={{ gridColumn: '1 / -1' }}
          >
            <Plus size={20} /> Create “{q.trim()}”
          </button>
        )}
      </div>
    </div>
  );
}
