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
      // Pop-ups on phone/computer by default; email is opt-in
      emailReminders: { type: Boolean, default: false },
      pushReminders: { type: Boolean, default: true },
      // Sunday-evening "your week" push
      weeklyRecap: { type: Boolean, default: true },
      // Salary-day plan: expected monthly income and % to put aside
      monthlyIncome: { type: Number, default: 0, min: 0 },
      savePercent: { type: Number, default: 20, min: 0, max: 90 },
      onboarded: { type: Boolean, default: false },
    },
    // Day key ('YYYY-MM-DD', the Sunday) of the last weekly recap sent, so it goes out once
    lastRecapWeek: { type: String, default: null },
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
    delete ret.lastRecapWeek;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
