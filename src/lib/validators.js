import { z } from 'zod';

/** Accepts ISO strings / Date / null / '' and returns Date | null */
const dateField = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d;
}, z.date({ invalid_type_error: 'Invalid date' }).nullable());

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const repeat = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);
const tags = z.array(z.string().trim().min(1).max(30)).max(10);

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password needs at least one letter')
    .regex(/\d/, 'Password needs at least one number'),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  notes: z.string().max(5000).optional(),
  list: objectId.nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  dueDate: dateField.optional(),
  hasTime: z.boolean().optional(),
  reminderAt: dateField.optional(),
  repeat: repeat.optional(),
  tags: tags.optional(),
  subtasks: z.array(z.object({ title: z.string().trim().min(1).max(200), done: z.boolean().optional() })).max(50).optional(),
  assignee: objectId.nullable().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  done: z.boolean().optional(),
  order: z.number().optional(),
});

export const listSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  icon: z.string().max(8).optional(),
});

export const reminderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  note: z.string().max(1000).optional(),
  remindAt: dateField.refine((d) => d !== null, 'Pick a date and time'),
  repeat: repeat.optional(),
  channels: z
    .object({ inApp: z.boolean().optional(), push: z.boolean().optional(), email: z.boolean().optional() })
    .optional(),
});

export const reminderUpdateSchema = reminderSchema.partial().extend({
  status: z.enum(['active', 'done']).optional(),
});

const money = z.coerce.number().min(0).max(1e11);

/** A shared bill: `amount` on the transaction must equal my share (total − everyone else's shares) */
export const splitSchema = z
  .object({
    total: money.refine((v) => v > 0, 'Enter the total bill amount'),
    paidBy: z.string().trim().min(1).max(40).default('me'),
    meSettled: z.boolean().optional(),
    people: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Every person needs a name').max(40),
          share: money,
          settled: z.boolean().optional(),
        })
      )
      .min(1, 'Add at least one person to split with')
      .max(20, 'You can split with up to 20 people'),
  })
  .superRefine((s, ctx) => {
    const names = s.people.map((p) => p.name.toLowerCase());
    if (new Set(names).size !== names.length) ctx.addIssue({ code: 'custom', message: 'Each person should appear only once' });
    if (names.includes('me') || names.includes('you')) ctx.addIssue({ code: 'custom', message: 'Use a real name instead of "me" or "you"' });
    if (s.paidBy !== 'me' && !names.includes(s.paidBy.toLowerCase())) ctx.addIssue({ code: 'custom', message: 'Who paid must be you or someone in the split' });
    const others = s.people.reduce((sum, p) => sum + p.share, 0);
    if (others > s.total + 0.01) ctx.addIssue({ code: 'custom', message: "Other people's shares add up to more than the total" });
  });

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be greater than 0').max(1e11),
  category: z.string().trim().min(1).max(40),
  note: z.string().max(300).optional(),
  date: dateField.optional(),
  method: z.enum(['upi', 'credit_card', 'debit_card', 'card', 'cash', 'bank', 'other']).optional(),
  tags: tags.optional(),
  split: splitSchema.nullable().optional(),
});

export const budgetSchema = z.object({
  category: z.string().trim().min(1).max(40),
  limit: z.coerce.number().min(0).max(1e11),
});

export const billSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  amount: z.coerce.number().min(0).max(1e11),
  category: z.string().max(40).optional(),
  frequency: z.enum(['monthly', 'yearly']).optional(),
  dueDay: z.coerce.number().int().min(1).max(31),
  dueMonth: z.coerce.number().int().min(1).max(12).optional(),
  remindDaysBefore: z.coerce.number().int().min(0).max(30).optional(),
  autopay: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  image: z.string().url().nullable().optional(),
  settings: z
    .object({
      currency: z.string().length(3).optional(),
      accent: z.string().max(20).optional(),
      timezone: z.string().max(60).optional(),
      emailReminders: z.boolean().optional(),
      pushReminders: z.boolean().optional(),
    })
    .optional(),
});
