import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['reminder', 'bill', 'share', 'system'], default: 'reminder' },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 500 },
    url: { type: String, default: '/dashboard' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-delete notifications after 60 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
