import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['viewer', 'editor'], default: 'editor' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    color: { type: String, default: '#8b5cf6' },
    icon: { type: String, default: '📋', maxlength: 8 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [MemberSchema], default: [] },
    shareEnabled: { type: Boolean, default: false },
    shareToken: { type: String, index: true, sparse: true },
    shareRole: { type: String, enum: ['viewer', 'editor'], default: 'editor' },
  },
  { timestamps: true }
);

ListSchema.index({ 'members.user': 1 });

export default mongoose.models.List || mongoose.model('List', ListSchema);
