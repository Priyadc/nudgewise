import { v2 as cloudinary } from 'cloudinary';

export const cloudinaryReady = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryReady) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const userFolder = (userId) => `orbit/${userId}`;

/** Signature for a direct browser → Cloudinary upload (files never pass through our server) */
export function signUpload(userId) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = userFolder(userId);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);
  return { timestamp, folder, signature, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME };
}

/** Fire-and-forget deletion of images */
export function destroyImages(publicIds = []) {
  if (!cloudinaryReady || !publicIds.length) return;
  Promise.allSettled(publicIds.map((id) => cloudinary.uploader.destroy(id))).catch(() => {});
}
