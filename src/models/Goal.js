import mongoose from 'mongoose';

/** A savings goal: "Goa trip — ₹20,000", filled up bit by bit */
const GoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    emoji: { type: String, default: '🎯', maxlength: 8 },
    target: { type: Number, required: true, min: 1 },
    saved: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, default: null },
    reachedAt: { type: Date, default: null },
    history: {
      type: [{ amount: Number, date: { type: Date, default: Date.now }, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
