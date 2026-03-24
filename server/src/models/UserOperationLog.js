/**
 * GraphTutor V3.0 - 用户操作日志模型
 * 
 * 功能：记录管理员对用户的所有操作历史
 */

import mongoose from 'mongoose';

const UserOperationLogSchema = new mongoose.Schema(
  {
    // 操作人（管理员ID）
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 操作人信息（快照，避免用户删除后无法查看）
    operatorInfo: {
      email: String,
      name: String,
      role: String,
    },

    // 操作类型
    action: {
      type: String,
      required: true,
      enum: [
        'role_update',        // 修改角色
        'role_batch_update',  // 批量修改角色
        'user_delete',        // 删除用户
        'user_batch_delete',  // 批量删除用户
        'user_import',        // 导入用户
        'user_view',          // 查看用户详情
        'user_export',        // 导出用户
        'user_create',        // 创建用户（手动）
      ],
      index: true,
    },

    // 操作目标用户ID（单个操作）
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },

    // 操作目标用户信息（快照）
    targetUserInfo: {
      email: String,
      name: String,
      role: String,
    },

    // 批量操作的目标用户ID列表
    targetUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    // 操作详情
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // 操作前状态（用于对比）
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // 操作后状态
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // IP地址
    ipAddress: {
      type: String,
      default: '',
    },

    // 用户代理
    userAgent: {
      type: String,
      default: '',
    },

    // 操作结果
    result: {
      type: String,
      enum: ['success', 'failed', 'partial'],
      default: 'success',
      index: true,
    },

    // 错误信息（如果失败）
    error: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// 索引
UserOperationLogSchema.index({ operatorId: 1, createdAt: -1 }); // 按操作人查询
UserOperationLogSchema.index({ targetUserId: 1, createdAt: -1 }); // 按目标用户查询
UserOperationLogSchema.index({ action: 1, createdAt: -1 }); // 按操作类型查询
UserOperationLogSchema.index({ createdAt: -1 }); // 按时间查询
UserOperationLogSchema.index({ result: 1, createdAt: -1 }); // 按结果查询

const UserOperationLog = mongoose.model('UserOperationLog', UserOperationLogSchema);

export default UserOperationLog;

