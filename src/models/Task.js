import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    width: Number,
    height: Number,
  },
  { _id: true }
);

const SubtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const TaskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    notes: { type: String, default: '', maxlength: 5000 },
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    // 0 = none, 1 = low, 2 = medium, 3 = high
    priority: { type: Number, min: 0, max: 3, default: 0 },
    dueDate: { type: Date, default: null },
    hasTime: { type: Boolean, default: false },
    reminderAt: { type: Date, default: null },
    repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'], default: 'none' },
    tags: { type: [String], default: [] },
    subtasks: { type: [SubtaskSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TaskSchema.index({ owner: 1, done: 1, dueDate: 1 });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
