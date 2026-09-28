import { api } from './api';

const MAX_DIM = 1800;
const MAX_BYTES = 10 * 1024 * 1024;

/** Downscales large photos in the browser before upload (faster on mobile data) */
async function compress(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

/**
 * Uploads an image straight from the browser to Cloudinary using a signature from our API.
 * Returns { url, publicId, width, height }
 */
export async function uploadImage(file, onProgress) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > MAX_BYTES * 2) throw new Error('Image is too large (max 20 MB)');
  const sig = await api('/api/upload/sign', { method: 'POST' });
  const small = await compress(file);

  const form = new FormData();
  form.append('file', small);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) return reject(new Error(data.error?.message || 'Upload failed'));
        resolve({ url: data.secure_url, publicId: data.public_id, width: data.width, height: data.height });
      } catch {
        reject(new Error('Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.send(form);
  });
}

/** Cloudinary on-the-fly thumbnail */
export function thumb(url, size = 200) {
  if (!url?.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}
