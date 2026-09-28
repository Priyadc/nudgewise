'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

function useLockScroll(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
}

function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** Centered dialog on desktop, bottom sheet on mobile */
export function Modal({ open, onClose, title, children, footer, size }) {
  useLockScroll(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={typeof title === 'string' ? title : undefined}
              className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            >
              {title && (
                <div className="modal-head">
                  <h2>{title}</h2>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
                    <X />
                  </button>
                </div>
              )}
              <div className="modal-body">{children}</div>
              {footer && <div className="modal-foot">{footer}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Slide-in panel from the right */
export function Drawer({ open, onClose, header, children }) {
  useLockScroll(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="backdrop drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
          >
            <motion.aside
              role="dialog"
              aria-modal="true"
              className="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            >
              <div className="drawer-head">
                {header}
                <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto' }}>
                  <X />
                </button>
              </div>
              <div className="drawer-body">{children}</div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Full-screen image viewer */
export function Lightbox({ src, onClose }) {
  useLockScroll(Boolean(src), onClose);
  return (
    <Portal>
      <AnimatePresence>
        {src && (
          <motion.div className="backdrop" style={{ zIndex: 80 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img src={src} alt="" className="lightbox" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Simple confirmation dialog */
export function Confirm({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', danger = true, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}
