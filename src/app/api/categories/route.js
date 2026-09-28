import { z } from 'zod';
import { route, ok, readJson, HttpError } from '@/lib/api';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CUSTOM_ICON_CHOICES } from '@/lib/categories';
import User from '@/models/User';

const MAX_CUSTOM = 60;

const createSchema = z.object({
  name: z.string().trim().min(1, 'Give the category a name').max(40, 'Keep the name under 40 characters'),
  type: z.enum(['expense', 'income']),
  icon: z.string().refine((i) => CUSTOM_ICON_CHOICES.includes(i), 'Pick an icon from the list').optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Invalid colour').optional(),
});

/** GET /api/categories — the signed-in user's own categories */
export const GET = route(async (_req, { userId }) => {
  const user = await User.findById(userId).select('categories').lean();
  return ok({ categories: user?.categories || [] });
});

/** POST /api/categories — create a custom category */
export const POST = route(async (req, { userId }) => {
  const body = createSchema.parse(await readJson(req));
  const user = await User.findById(userId).select('categories');
  const lower = body.name.toLowerCase();
  const builtIn = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].some((c) => c.name.toLowerCase() === lower);
  const mine = user.categories.some((c) => c.name.toLowerCase() === lower);
  if (builtIn || mine) throw new HttpError(409, `"${body.name}" already exists — pick it from the list`);
  if (user.categories.length >= MAX_CUSTOM) throw new HttpError(400, `You can create up to ${MAX_CUSTOM} categories`);

  user.categories.push({ name: body.name, type: body.type, icon: body.icon || 'Tag', color: body.color || '#8b5cf6' });
  await user.save();
  return ok({ category: user.categories[user.categories.length - 1], categories: user.categories }, 201);
});

/** DELETE /api/categories?id=... — past transactions keep the name */
export const DELETE = route(async (req, { userId }) => {
  const id = new URL(req.url).searchParams.get('id');
  const user = await User.findById(userId).select('categories');
  const before = user.categories.length;
  user.categories = user.categories.filter((c) => String(c._id) !== id);
  if (user.categories.length === before) throw new HttpError(404, 'Category not found');
  await user.save();
  return ok({ categories: user.categories });
});
