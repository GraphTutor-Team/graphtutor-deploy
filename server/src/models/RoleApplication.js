/**
 * GraphTutor V3.0 - 角色申请模型
 * 
 * 功能：用户申请成为出题负责人或管理员
 * 流程：用户提交申请 -> 管理员审核 -> 批准/拒绝
 */

import mongoose from 'mongoose';

const RoleApplicationSchema = new mongoose.Schema(
  {
    // 申请人ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 申请的角色
    requestedRole: {
      type: String,
      enum: ['question_manager', 'admin'],
      required: true,
    },

    // 申请理由
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },

    // 申请状态
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    // 审核人ID（管理员）
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // 审核意见
    reviewComment: {
      type: String,
      maxlength: 500,
      trim: true,
      default: '',
    },

    // 审核时间
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// 索引
RoleApplicationSchema.index({ userId: 1, status: 1 });
RoleApplicationSchema.index({ status: 1, createdAt: -1 });
RoleApplicationSchema.index({ requestedRole: 1, status: 1 });

// 虚拟字段：获取申请人信息
RoleApplicationSchema.virtual('applicant', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// 虚拟字段：获取审核人信息
RoleApplicationSchema.virtual('reviewer', {
  ref: 'User',
  localField: 'reviewerId',
  foreignField: '_id',
  justOne: true,
});

// 实例方法：批准申请
RoleApplicationSchema.methods.approve = async function (reviewerId, comment = '') {
  this.status = 'approved';
  this.reviewerId = reviewerId;
  this.reviewComment = comment;
  this.reviewedAt = new Date();
  await this.save();

  // 更新用户角色
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(this.userId, {
    $set: { role: this.requestedRole },
  });

  return this;
};

// 实例方法：拒绝申请
RoleApplicationSchema.methods.reject = async function (reviewerId, comment = '') {
  this.status = 'rejected';
  this.reviewerId = reviewerId;
  this.reviewComment = comment;
  this.reviewedAt = new Date();
  await this.save();
  return this;
};

const RoleApplication = mongoose.model('RoleApplication', RoleApplicationSchema);

export default RoleApplication;

