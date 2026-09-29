import mongoose from 'mongoose';

/**
 * A bill shared with other people.
 * `amount` on the transaction is always MY share, so totals and budgets show what I really spent.
 *  - paidBy 'me'   → each person in `people` owes me their share (until settled)
 *  - paidBy <name> → I owe that person my share (until meSettled)
 */
const SplitPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    share: { type: Number, required: true, min: 0 },
    settled: { type: Boolean, default: false },
  },
  { _id: false }
);

const SplitSchema = new mongoose.Schema(
  {
    total: { type: Number, required: true, min: 0 },
    paidBy: { type: String, default: 'me', maxlength: 40 },
    meSettled: { type: Boolean, default: false },
    people: { type: [SplitPersonSchema], default: [] },
  },
  { _id: false }
);

export const PAYMENT_METHOD_VALUES = ['upi', 'credit_card', 'debit_card', 'card', 'cash', 'bank', 'other'];

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, maxlength: 40 },
    note: { type: String, default: '', maxlength: 300 },
    date: { type: Date, required: true, default: Date.now },
    // 'card' is kept only for entries created before credit/debit were separated
    method: { type: String, enum: PAYMENT_METHOD_VALUES, default: 'upi' },
    tags: { type: [String], default: [] },
    split: { type: SplitSchema, default: null },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, 'split.paidBy': 1 });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
