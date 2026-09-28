import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, maxlength: 40 },
    note: { type: String, default: '', maxlength: 300 },
    date: { type: Date, required: true, default: Date.now },
    method: { type: String, enum: ['upi', 'card', 'cash', 'bank', 'other'], default: 'upi' },
    tags: { type: [String], default: [] },
    receipt: {
      url: String,
      publicId: String,
    },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, date: -1 });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
