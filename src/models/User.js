import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    image: { type: String },
    provider: { type: String, enum: ['credentials', 'google'], default: 'credentials' },
    settings: {
      currency: { type: String, default: 'INR' },
      accent: { type: String, default: 'violet' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      emailReminders: { type: Boolean, default: true },
      pushReminders: { type: Boolean, default: true },
    },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpires;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
