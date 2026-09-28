'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Dropdown menu anchored to a trigger.
 *   <Menu trigger={<button ...>} items={[{ label, icon, onClick, danger }]} />
 */
export default function Menu({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const key = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => setOpen((o) => !o)} style={{ display: 'inline-flex' }}>
        {trigger}
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="menu"
            style={{ top: 'calc(100% + 6px)', [align]: 0 }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {items.filter(Boolean).map((it) => (
              <button
                key={it.label}
                role="menuitem"
                className={`menu-item ${it.danger ? 'danger' : ''}`}
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
              >
                {it.icon && <it.icon />}
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
