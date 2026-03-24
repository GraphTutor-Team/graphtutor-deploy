/**
 * GraphTutor V3.0 - 作业提交记录
 * 学生提交后一条记录，用于统计完成情况
 */

import mongoose from 'mongoose';

const AssignmentSubmissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupAssignment',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    totalCorrect: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

AssignmentSubmissionSchema.index({ assignmentId: 1, userId: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ assignmentId: 1, submittedAt: -1 });

export default mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);
