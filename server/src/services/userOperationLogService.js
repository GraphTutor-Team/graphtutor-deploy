/**
 * GraphTutor V3.0 - 用户操作日志服务
 * 
 * 作用：记录和查询用户操作日志，包括角色修改、用户删除、批量操作等，提供审计追踪功能
 * 关联页面：
 *   - routes/users.js (用户路由，记录操作日志)
 *   - client/src/pages/admin/OperationLogs.jsx (操作日志页面)
 *   - client/src/api/users.js (操作日志API客户端)
 *   - models/UserOperationLog.js (操作日志模型)
 * 技术栈：
 *   - MongoDB存储
 *   - Mongoose ODM
 *   - 日志查询和筛选
 *   - 分页和统计
 */

import UserOperationLog from '../models/UserOperationLog.js';
import User from '../models/User.js';

/**
 * 记录用户操作日志
 * @param {Object} logData - 日志数据
 * @param {string} logData.operatorId - 操作人ID
 * @param {string} logData.action - 操作类型
 * @param {string} logData.targetUserId - 目标用户ID（可选）
 * @param {Array} logData.targetUserIds - 批量操作的目标用户ID列表（可选）
 * @param {Object} logData.details - 操作详情
 * @param {Object} logData.beforeState - 操作前状态
 * @param {Object} logData.afterState - 操作后状态
 * @param {string} logData.ipAddress - IP地址
 * @param {string} logData.userAgent - 用户代理
 * @param {string} logData.result - 操作结果
 * @param {string} logData.error - 错误信息
 * @returns {Promise<Object>} 创建的日志记录
 */
export async function logUserOperation(logData) {
  try {
    const {
      operatorId,
      action,
      targetUserId,
      targetUserIds = [],
      details = {},
      beforeState = {},
      afterState = {},
      ipAddress = '',
      userAgent = '',
      result = 'success',
      error = '',
    } = logData;

    // 获取操作人信息
    const operator = await User.findById(operatorId).lean();
    const operatorInfo = operator ? {
      email: operator.email,
      name: operator.name,
      role: operator.role,
    } : {};

    // 获取目标用户信息（单个操作）
    let targetUserInfo = {};
    if (targetUserId) {
      const targetUser = await User.findById(targetUserId).lean();
      if (targetUser) {
        targetUserInfo = {
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
        };
      }
    }

    // 创建日志记录
    const log = await UserOperationLog.create({
      operatorId,
      operatorInfo,
      action,
      targetUserId,
      targetUserInfo,
      targetUserIds,
      details,
      beforeState,
      afterState,
      ipAddress,
      userAgent,
      result,
      error,
    });

    return log;
  } catch (err) {
    console.error('记录用户操作日志失败:', err);
    // 不阻塞主流程，静默失败
    return null;
  }
}

/**
 * 获取操作日志列表
 * @param {Object} options - 查询选项
 * @param {string} options.operatorId - 操作人ID（可选）
 * @param {string} options.targetUserId - 目标用户ID（可选）
 * @param {string} options.action - 操作类型（可选）
 * @param {string} options.result - 操作结果（可选）
 * @param {Date} options.startDate - 开始日期（可选）
 * @param {Date} options.endDate - 结束日期（可选）
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @returns {Promise<Object>} { logs, total, page, limit, totalPages }
 */
export async function getUserOperationLogs(options = {}) {
  const {
    operatorId,
    targetUserId,
    action,
    result,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = options;

  const query = {};

  if (operatorId) {
    query.operatorId = operatorId;
  }

  if (targetUserId) {
    query.$or = [
      { targetUserId },
      { targetUserIds: targetUserId },
    ];
  }

  if (action) {
    query.action = action;
  }

  if (result) {
    query.result = result;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    UserOperationLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserOperationLog.countDocuments(query),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取操作统计
 * @param {Object} options - 查询选项
 * @param {Date} options.startDate - 开始日期
 * @param {Date} options.endDate - 结束日期
 * @returns {Promise<Object>} 统计信息
 */
export async function getOperationStats(options = {}) {
  const { startDate, endDate } = options;

  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  const stats = await UserOperationLog.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        success: {
          $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$result', 'failed'] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const total = await UserOperationLog.countDocuments(query);

  return {
    total,
    byAction: stats,
  };
}

/**
 * 获取操作类型的中文名称
 */
export function getActionName(action) {
  const actionNames = {
    role_update: '修改角色',
    role_batch_update: '批量修改角色',
    user_delete: '删除用户',
    user_batch_delete: '批量删除用户',
    user_import: '导入用户',
    user_view: '查看用户详情',
    user_export: '导出用户',
    user_create: '创建用户',
  };
  return actionNames[action] || action;
}

