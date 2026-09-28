import { z } from 'zod';
import { route, ok, readJson, HttpError } from '@/lib/api';
import { destroyImages, userFolder } from '@/lib/cloudinary';

/** Deletes an uploaded image that was never saved (e.g. user removed it before saving) */
export const POST = route(async (req, { userId }) => {
  const { publicId } = z.object({ publicId: z.string().min(1).max(200) }).parse(await readJson(req));
  if (!publicId.startsWith(`${userFolder(userId)}/`)) throw new HttpError(403, 'Not your file');
  destroyImages([publicId]);
  return ok({ deleted: true });
});
