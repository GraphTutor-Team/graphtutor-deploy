/**
 * GraphTutor V3.0 - 群组模型
 * 
 * 功能：管理学习群组，支持老师创建群组、学生加入群组、群组关联题库和题目
 */

import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    // 群组类型：class（班级）、study（学习小组）、custom（自定义）
    type: {
      type: String,
      enum: ['class', 'study', 'custom'],
      default: 'custom',
    },
    // 成员列表
    members: [
      {
        userId: {
          type: String,
          required: true,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['teacher', 'student'],
          default: 'student',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['active', 'pending', 'removed'],
          default: 'active',
        },
      },
    ],
    // 关联的题库ID列表
    bankIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionBank',
      },
    ],
    // 关联的题目ID列表
    questionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    // 设置
    settings: {
      // 是否允许学生邀请其他学生
      allowStudentInvite: {
        type: Boolean,
        default: false,
      },
      // 是否公开（可以通过代码加入）
      isPublic: {
        type: Boolean,
        default: false,
      },
      // 是否需要审核才能加入
      requireApproval: {
        type: Boolean,
        default: false,
      },
      // 最大成员数
      maxMembers: {
        type: Number,
        default: 100,
      },
    },
    // 状态
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
GroupSchema.index({ ownerId: 1, status: 1 });
GroupSchema.index({ 'members.userId': 1, 'members.status': 1 });
GroupSchema.index({ code: 1 }, { unique: true, sparse: true });

// 生成唯一群组代码
GroupSchema.statics.generateCode = async function () {
  let code;
  let exists = true;
  while (exists) {
    // 生成6位随机代码（字母+数字）
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    exists = await this.findOne({ code });
  }
  return code;
};

// 检查用户是否是群组成员
GroupSchema.methods.isMember = function (userId) {
  return this.members.some(
    (m) => m.userId.toString() === userId.toString() && m.status === 'active'
  );
};

// 检查用户是否是群组老师
GroupSchema.methods.isTeacher = function (userId) {
  return (
    this.ownerId.toString() === userId.toString() ||
    this.members.some(
      (m) =>
        m.userId.toString() === userId.toString() &&
        m.role === 'teacher' &&
        m.status === 'active'
    )
  );
};

// 添加成员
GroupSchema.methods.addMember = function (userId, role = 'student', status = 'active') {
  // 检查是否已经是成员
  const existing = this.members.find(
    (m) => m.userId.toString() === userId.toString()
  );
  if (existing) {
    existing.status = status;
    existing.role = role;
    existing.joinedAt = new Date();
    return existing;
  }

  // 添加新成员
  const member = {
    userId,
    role,
    status,
    joinedAt: new Date(),
  };
  this.members.push(member);
  return member;
};

// 移除成员
GroupSchema.methods.removeMember = function (userId) {
  const member = this.members.find(
    (m) => m.userId.toString() === userId.toString()
  );
  if (member) {
    member.status = 'removed';
    return true;
  }
  return false;
};

export default mongoose.model('Group', GroupSchema);

