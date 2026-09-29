'use client';

import { motion } from 'framer-motion';

/** "Try one" chips for empty screens — each tap opens a sheet that is already filled in */
export default function Examples({ items, label = 'Try one:' }) {
  if (!items?.length) return null;
  return (
    <div className="examples">
      <span className="tiny muted bold">{label}</span>
      <div className="chip-row" style={{ justifyContent: 'center' }}>
        {items.map((it, i) => (
          <motion.button
            key={it.label}
            type="button"
            className="pick-chip"
            onClick={it.onClick}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
          >
            {it.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
