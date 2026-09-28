import { route, ok, fail } from '@/lib/api';
import { cloudinaryReady, signUpload } from '@/lib/cloudinary';

export const POST = route(async (_req, { userId }) => {
  if (!cloudinaryReady) return fail('Image uploads are not configured yet (add Cloudinary keys to your env).', 503);
  return ok(signUpload(userId));
});
