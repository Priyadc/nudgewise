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
    // Money categories the user created themselves
    categories: {
      type: [
        new mongoose.Schema(
          {
            name: { type: String, required: true, trim: true, maxlength: 40 },
            type: { type: String, enum: ['expense', 'income'], required: true },
            icon: { type: String, default: 'Tag', maxlength: 30 },
            color: { type: String, default: '#8b5cf6', maxlength: 9 },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
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
