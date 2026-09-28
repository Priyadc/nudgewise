'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { api, emit } from '@/lib/client/api';
import { LIST_COLORS, LIST_ICONS } from '@/lib/categories';

/** Create or edit a list (name, colour, emoji) */
export default function ListModal({ open, onClose, list, onSaved }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(LIST_COLORS[0]);
  const [icon, setIcon] = useState(LIST_ICONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(list?.name || '');
      setColor(list?.color || LIST_COLORS[0]);
      setIcon(list?.icon || LIST_ICONS[0]);
    }
  }, [open, list]);

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const d = list
        ? await api(`/api/lists/${list._id}`, { method: 'PATCH', body: { name, color, icon } })
        : await api('/api/lists', { method: 'POST', body: { name, color, icon } });
      toast.success(list ? 'List updated' : 'List created');
      emit('lists-changed');
      onSaved?.(d.list);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={list ? 'Edit list' : 'New list'}>
      <form onSubmit={save} className="stack stack-lg">
        <div className="row" style={{ gap: 14 }}>
          <motion.div
            key={icon + color}
            initial={{ scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            style={{ width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center', fontSize: 26, background: `${color}22`, border: `2px solid ${color}` }}
          >
            {icon}
          </motion.div>
          <div className="field grow">
            <label className="label" htmlFor="list-name">
              Name
            </label>
            <input id="list-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries, Trip to Goa" autoFocus maxLength={60} />
          </div>
        </div>
        <div className="field">
          <span className="label">Colour</span>
          <div className="row row-wrap">
            {LIST_COLORS.map((c) => (
              <button type="button" key={c} className="swatch" style={{ background: c, width: 32, height: 32 }} aria-pressed={color === c} aria-label={`Colour ${c}`} onClick={() => setColor(c)}>
                {color === c && <Check />}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">Icon</span>
          <div className="row row-wrap" style={{ gap: 6 }}>
            {LIST_ICONS.map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setIcon(i)}
                aria-pressed={icon === i}
                className="btn btn-icon"
                style={{ fontSize: 20, background: icon === i ? 'var(--accent-soft)' : 'var(--surface-2)', boxShadow: icon === i ? '0 0 0 2px var(--accent)' : 'none' }}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving && <Loader2 className="spin" />} {list ? 'Save' : 'Create list'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
