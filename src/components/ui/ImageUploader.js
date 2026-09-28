'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage, thumb } from '@/lib/client/upload';
import { api } from '@/lib/client/api';
import { Lightbox } from './Modal';

/**
 * Grid of image attachments with drag & drop, paste and camera support.
 *   value: [{ url, publicId, width, height }]
 */
export default function ImageUploader({ value = [], onChange, max = 10, disabled, single = false }) {
  const input = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const fresh = useRef(new Set());

  async function handleFiles(files) {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    const room = single ? 1 : max - value.length;
    if (room <= 0) return toast.error(`You can attach up to ${max} images`);
    const batch = list.slice(0, room);
    setUploading(batch.length);
    const done = [];
    for (const f of batch) {
      try {
        const img = await uploadImage(f, setProgress);
        fresh.current.add(img.publicId);
        done.push(img);
      } catch (e) {
        toast.error(e.message);
      }
      setUploading((n) => n - 1);
    }
    setProgress(0);
    if (done.length) onChange(single ? done.slice(0, 1) : [...value, ...done]);
  }

  function remove(img) {
    onChange(value.filter((v) => v.url !== img.url));
    // Uploaded in this session and never saved → delete right away.
    // Previously saved images are cleaned up by the API when the item is saved.
    if (img.publicId && fresh.current.has(img.publicId)) {
      fresh.current.delete(img.publicId);
      api('/api/upload/delete', { method: 'POST', body: { publicId: img.publicId } }).catch(() => {});
    }
  }

  const canAdd = !disabled && (single ? value.length === 0 : value.length < max);

  return (
    <>
      <div className="image-grid" onPaste={(e) => handleFiles(e.clipboardData.files)}>
        <AnimatePresence initial={false}>
          {value.map((img) => (
            <motion.div key={img.url} className="image-tile" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(img.url, 240)} alt="Attachment" loading="lazy" onClick={() => setPreview(img.url)} />
              {!disabled && (
                <button type="button" className="remove" onClick={() => remove(img)} aria-label="Remove image">
                  <X />
                </button>
              )}
            </motion.div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <motion.div key={`up-${i}`} className="image-tile skeleton" style={{ display: 'grid', placeItems: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="tiny muted row" style={{ gap: 4 }}>
                <Loader2 size={14} className="spin" /> {i === 0 && progress ? `${progress}%` : ''}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {canAdd && !uploading && (
          <button
            type="button"
            className={`upload-tile ${dragging ? 'dragging' : ''}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <ImagePlus />
            {single ? 'Add photo' : 'Add images'}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={!single}
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <Lightbox src={preview} onClose={() => setPreview(null)} />
    </>
  );
}
