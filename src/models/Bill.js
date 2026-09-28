import mongoose from 'mongoose';

const BillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'Bills & Utilities' },
    frequency: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    dueDay: { type: Number, min: 1, max: 31, required: true },
    dueMonth: { type: Number, min: 1, max: 12, default: 1 }, // only for yearly bills
    remindDaysBefore: { type: Number, min: 0, max: 30, default: 2 },
    autopay: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    // periods already paid / notified: "2026-09" for monthly, "2026" for yearly
    paidPeriods: { type: [String], default: [] },
    notifiedPeriods: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Bill || mongoose.model('Bill', BillSchema);
