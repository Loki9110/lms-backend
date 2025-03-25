import mongoose from "mongoose";

const accessRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  }
}, { timestamps: true });

// Compound index to prevent duplicate requests
accessRequestSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema); 