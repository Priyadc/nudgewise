import mongoose from 'mongoose';

const ReminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, default: '', maxlength: 1000 },
    remindAt: { type: Date, required: true },
    repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'], default: 'none' },
    channels: {
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
    status: { type: String, enum: ['active', 'done'], default: 'active' },
    // true while the next occurrence still has to be delivered
    pending: { type: Boolean, default: true },
    lastSentAt: { type: Date, default: null },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
  },
  { timestamps: true }
);

ReminderSchema.index({ pending: 1, status: 1, remindAt: 1 });

export default mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);
