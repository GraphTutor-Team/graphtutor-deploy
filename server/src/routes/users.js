/**
 * GraphTutor V3.0 - 用户管理路由
 * 
 * 作用：提供用户管理相关的API接口，包括用户信息获取、用户列表查询、角色管理、批量操作、权限查询等
 * 关联页面：
 *   - client/src/pages/admin/UserManagement.jsx (用户管理页面)
 *   - client/src/api/users.js (前端API客户端)
 *   - services/userStats.js (用户统计服务)
 *   - services/userPermissionService.js (权限服务)
 *   - services/userOperationLogService.js (操作日志服务)
 * 技术栈：
 *   - Express Router
 *   - MongoDB (Mongoose)
 *   - 中间件认证 (requireAuth, requireAdmin)
 *   - 数据验证和清理
 *   - 分页、搜索、筛选、排序
 */

import express from 'express';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { 
  getUserLearningStats, 
  getUserActivity, 
  getUserRanking,
  batchGetUserStats,
} from '../services/userStats.js';
import { getUserPermissions } from '../services/userPermissionService.js';
import { logUserOperation } from '../services/userOperationLogService.js';
import { sanitizeString, validateInt } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/users/me
 * 获取当前登录用户的基本信息
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ 
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('GET /api/users/me error:', err);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

/**
 * PUT /api/users/me
 * 更新当前用户的基本信息（目前只支持 name）
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (name && typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'name 必须是字符串' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { name: name?.trim() || undefined } },
      { new: true, lean: true }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({ 
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('PUT /api/users/me error:', err);
    res.status(500).json({ success: false, message: '更新用户信息失败' });
  }
});

/**
 * GET /api/users
 * 获取用户列表（仅管理员）
 * 
 * 查询参数：
 * - search: 搜索关键词（邮箱、姓名）
 * - role: 角色筛选
 * - createdAtFrom: 注册时间起始（ISO日期字符串）
 * - createdAtTo: 注册时间结束（ISO日期字符串）
 * - lastLoginFrom: 最后登录时间起始（ISO日期字符串）
 * - lastLoginTo: 最后登录时间结束（ISO日期字符串）
 * - activeDays: 活跃天数（最近N天内有登录，数字）
 * - sort: 排序字段（createdAt, email, name, lastLogin）
 * - order: 排序方向（asc, desc）
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      search,
      role,
      createdAtFrom,
      createdAtTo,
      lastLoginFrom,
      lastLoginTo,
      activeDays,
      sort = 'createdAt',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = validateInt(page, { min: 1, defaultValue: 1 });
    const limitNum = validateInt(limit, { min: 1, max: 100, defaultValue: 20 });
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const query = {};

    // 角色筛选
    if (role) {
      query.role = role;
    }

    // 注册时间范围筛选
    if (createdAtFrom || createdAtTo) {
      query.createdAt = {};
      if (createdAtFrom) {
        query.createdAt.$gte = new Date(createdAtFrom);
      }
      if (createdAtTo) {
        query.createdAt.$lte = new Date(createdAtTo);
      }
    }

    // 最后登录时间范围筛选
    if (lastLoginFrom || lastLoginTo) {
      query.lastLogin = {};
      if (lastLoginFrom) {
        query.lastLogin.$gte = new Date(lastLoginFrom);
      }
      if (lastLoginTo) {
        query.lastLogin.$lte = new Date(lastLoginTo);
      }
    }

    // 活跃度筛选（最近N天内有登录）
    if (activeDays) {
      const days = parseInt(activeDays, 10);
      if (!isNaN(days) && days > 0) {
        const activeDate = new Date();
        activeDate.setDate(activeDate.getDate() - days);
        query.lastLogin = query.lastLogin || {};
        query.lastLogin.$gte = activeDate;
      }
    }

    // 搜索条件
    if (search) {
      const searchRegex = new RegExp(sanitizeString(search), 'i');
      query.$or = [
        { email: searchRegex },
        { name: searchRegex },
      ];
    }

    // 排序
    const sortField = sort || 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // 查询用户
    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    // 移除密码哈希
    const safeUsers = users.map((u) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });

    res.json({
      success: true,
      data: safeUsers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

/**
 * PATCH /api/users/:id/role
 * 修改用户角色（user <-> admin）（仅管理员）
 * body: { role: "user" | "admin" }
 */
router.patch('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    // V3.0: 支持三种角色
    const validRoles = ['student', 'question_manager', 'admin'];
    // 向后兼容：'user' 映射为 'student'
    const normalizedRole = role === 'user' ? 'student' : role;
    
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `role 必须是以下之一: ${validRoles.join(', ')}`,
      });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 不允许在这里把自己从 admin 降级，防止把自己锁死
    if (String(target._id) === String(req.user.id) && normalizedRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: '不能通过此接口取消自己的管理员身份',
      });
    }

    // 如果是把管理员降级，检查是否是最后一个管理员
    if (target.role === 'admin' && normalizedRole !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: '这是系统中最后一个管理员，不能降级',
        });
      }
    }

    const oldRole = target.role;
    target.role = normalizedRole;
    await target.save();

    const { passwordHash, ...safeUser } = target.toObject();

    // 记录操作日志
    await logUserOperation({
      operatorId: req.user.id,
      action: 'role_update',
      targetUserId: target._id,
      details: {
        oldRole,
        newRole: normalizedRole,
      },
      beforeState: { role: oldRole },
      afterState: { role: normalizedRole },
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
      result: 'success',
    });

    res.json({
      success: true,
      message: '角色更新成功',
      data: safeUser,
    });
  } catch (err) {
    console.error('PATCH /api/users/:id/role error:', err);
    
    // 记录失败日志
    if (req.params.id) {
      await logUserOperation({
        operatorId: req.user.id,
        action: 'role_update',
        targetUserId: req.params.id,
        ipAddress: req.ip || req.connection?.remoteAddress || '',
        userAgent: req.get('user-agent') || '',
        result: 'failed',
        error: err.message || '更新用户角色失败',
      });
    }
    
    res.status(500).json({
      success: false,
      message: '更新用户角色失败',
    });
  }
});

/**
 * GET /api/users/:id/stats
 * 获取用户学习统计（仅管理员）
 */
router.get('/:id/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const stats = await getUserLearningStats(id, { days: parseInt(days) });

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/users/:id/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取用户统计失败',
    });
  }
});

/**
 * GET /api/users/:id/activity
 * 获取用户活跃度数据（仅管理员）
 */
router.get('/:id/activity', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const days = validateInt(req.query.days, { min: 1, max: 365, defaultValue: 30 });

    const activity = await getUserActivity(id, days);

    res.json({
      success: true,
      data: activity,
    });
  } catch (err) {
    console.error('GET /api/users/:id/activity error:', err);
    res.status(500).json({
      success: false,
      message: '获取用户活跃度失败',
    });
  }
});

/**
 * GET /api/users/:id/ranking
 * 获取用户排名信息（仅管理员）
 */
router.get('/:id/ranking', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ranking = await getUserRanking(id);

    res.json({
      success: true,
      data: ranking,
    });
  } catch (err) {
    console.error('GET /api/users/:id/ranking error:', err);
    res.status(500).json({
      success: false,
      message: '获取用户排名失败',
    });
  }
});

/**
 * GET /api/users/:id/permissions
 * 获取用户权限详情（管理员可查看所有用户，普通用户只能查看自己）
 */
router.get('/:id/permissions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // 普通用户只能查看自己的权限
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      return res.status(403).json({
        success: false,
        message: '无权查看其他用户的权限信息',
      });
    }

    const permissions = await getUserPermissions(id);

    res.json({
      success: true,
      data: permissions,
    });
  } catch (err) {
    console.error('GET /api/users/:id/permissions error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取用户权限失败',
    });
  }
});

/**
 * POST /api/users/batch-update-role
 * 批量修改用户角色（仅管理员）
 * body: { userIds: [string], role: string }
 */
router.post('/batch-update-role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userIds, role } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds 必须是非空数组',
      });
    }

    const validRoles = ['student', 'question_manager', 'admin'];
    const normalizedRole = role === 'user' ? 'student' : role;

    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `role 必须是以下之一: ${validRoles.join(', ')}`,
      });
    }

    // 不能批量修改自己
    const filteredUserIds = userIds.filter(id => id !== req.user.id);

    // 如果是批量降级管理员，检查是否会删除所有管理员
    if (normalizedRole !== 'admin') {
      const adminUsers = await User.find({
        _id: { $in: filteredUserIds },
        role: 'admin',
      });
      
      if (adminUsers.length > 0) {
        const remainingAdmins = await User.countDocuments({ role: 'admin' });
        if (remainingAdmins <= adminUsers.length) {
          return res.status(400).json({
            success: false,
            message: '不能批量降级所有管理员',
          });
        }
      }
    }

    // 获取更新前的角色信息
    const usersBefore = await User.find({ _id: { $in: filteredUserIds } }).lean();
    const beforeStates = usersBefore.map(u => ({ id: u._id.toString(), role: u.role }));

    // 批量更新
    const result = await User.updateMany(
      { _id: { $in: filteredUserIds } },
      { $set: { role: normalizedRole } }
    );

    // 记录操作日志
    await logUserOperation({
      operatorId: req.user.id,
      action: 'role_batch_update',
      targetUserIds: filteredUserIds,
      details: {
        newRole: normalizedRole,
        count: result.modifiedCount,
      },
      beforeState: { users: beforeStates },
      afterState: { role: normalizedRole, count: result.modifiedCount },
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
      result: result.modifiedCount > 0 ? 'success' : 'failed',
    });

    res.json({
      success: true,
      message: `成功更新 ${result.modifiedCount} 个用户的角色`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (err) {
    console.error('POST /api/users/batch-update-role error:', err);
    
    // 记录失败日志
    await logUserOperation({
      operatorId: req.user.id,
      action: 'role_batch_update',
      targetUserIds: req.body?.userIds || [],
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
      result: 'failed',
      error: err.message || '批量更新角色失败',
    });
    
    res.status(500).json({
      success: false,
      message: '批量更新角色失败',
    });
  }
});

/**
 * DELETE /api/users/batch
 * 批量删除用户（仅管理员）
 * body: { userIds: [string] }
 */
router.delete('/batch', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds 必须是非空数组',
      });
    }

    // 不能删除自己
    const filteredUserIds = userIds.filter(id => id !== req.user.id);

    // 不能删除管理员（防止误删）
    const adminUsers = await User.find({
      _id: { $in: filteredUserIds },
      role: 'admin',
    });

    if (adminUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '不能删除管理员用户',
      });
    }

    // 获取删除前的用户信息
    const usersBefore = await User.find({ _id: { $in: filteredUserIds } }).lean();
    const beforeStates = usersBefore.map(u => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
    }));

    // 批量删除
    const result = await User.deleteMany({
      _id: { $in: filteredUserIds },
    });

    // 记录操作日志
    await logUserOperation({
      operatorId: req.user.id,
      action: 'user_batch_delete',
      targetUserIds: filteredUserIds,
      details: {
        count: result.deletedCount,
      },
      beforeState: { users: beforeStates },
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
      result: result.deletedCount > 0 ? 'success' : 'failed',
    });

    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 个用户`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (err) {
    console.error('DELETE /api/users/batch error:', err);
    
    // 记录失败日志
    await logUserOperation({
      operatorId: req.user.id,
      action: 'user_batch_delete',
      targetUserIds: req.body?.userIds || [],
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
      result: 'failed',
      error: err.message || '批量删除用户失败',
    });
    
    res.status(500).json({
      success: false,
      message: '批量删除用户失败',
    });
  }
});

/**
 * POST /api/users/batch-import
 * 批量导入用户（仅管理员）
 */
router.post('/batch-import', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: '用户数据必须是非空数组',
      });
    }

    if (users.length > 1000) {
      return res.status(400).json({
        success: false,
        message: '单次最多导入1000个用户',
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const userData of users) {
      try {
        const { email, password, name, role = 'student' } = userData;

        // 验证必填字段
        if (!email || !password) {
          results.failed.push({
            email: email || '未知',
            reason: '邮箱和密码为必填项',
          });
          continue;
        }

        // 验证邮箱格式
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.failed.push({
            email,
            reason: '邮箱格式无效',
          });
          continue;
        }

        // 验证密码长度
        if (password.length < 6 || password.length > 50) {
          results.failed.push({
            email,
            reason: '密码长度必须在6-50位之间',
          });
          continue;
        }

        // 验证角色
        if (role && !['student', 'question_manager', 'admin'].includes(role)) {
          results.failed.push({
            email,
            reason: '角色无效',
          });
          continue;
        }

        // 检查邮箱是否已存在
        const exists = await User.findOne({ email: email.trim().toLowerCase() });
        if (exists) {
          results.failed.push({
            email,
            reason: '邮箱已存在',
          });
          continue;
        }

        // 创建用户
        const bcrypt = (await import('bcrypt')).default;
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
          email: email.trim().toLowerCase(),
          passwordHash,
          name: name?.trim() || '',
          role: role || 'student',
        });

        results.success.push({
          email: user.email,
          id: user._id,
        });
      } catch (err) {
        console.error('导入用户失败:', userData.email, err);
        results.failed.push({
          email: userData.email || '未知',
          reason: err.message || '创建用户失败',
        });
      }
    }

    // 记录操作日志
    const resultType = results.failed.length === 0 ? 'success' : 
                      results.success.length === 0 ? 'failed' : 'partial';
    
    await logUserOperation({
      operatorId: req.user.id,
      action: 'user_import',
      targetUserIds: results.success.map(u => u.id),
      details: {
        total: users.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
      },
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
      result: resultType,
      error: results.failed.length > 0 ? `${results.failed.length} 个用户导入失败` : '',
    });

    res.json({
      success: true,
      data: {
        total: users.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        success: results.success,
        failed: results.failed,
      },
    });
  } catch (err) {
    console.error('POST /api/users/batch-import error:', err);
    
    // 记录失败日志
    await logUserOperation({
      operatorId: req.user.id,
      action: 'user_import',
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
      result: 'failed',
      error: err.message || '批量导入用户失败',
    });
    
    res.status(500).json({
      success: false,
      message: err.message || '批量导入用户失败',
    });
  }
});

/**
 * GET /api/users/operation-logs
 * 获取用户操作日志列表（仅管理员）
 */
router.get('/operation-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      operatorId,
      targetUserId,
      action,
      result,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const { getUserOperationLogs } = await import('../services/userOperationLogService.js');
    
    const logs = await getUserOperationLogs({
      operatorId,
      targetUserId,
      action,
      result,
      startDate,
      endDate,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: logs.logs,
      meta: {
        page: logs.page,
        limit: logs.limit,
        total: logs.total,
        totalPages: logs.totalPages,
      },
    });
  } catch (err) {
    console.error('GET /api/users/operation-logs error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取操作日志失败',
    });
  }
});

/**
 * GET /api/users/operation-logs/stats
 * 获取操作日志统计（仅管理员）
 */
router.get('/operation-logs/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const { getOperationStats } = await import('../services/userOperationLogService.js');
    
    const stats = await getOperationStats({
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/users/operation-logs/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取操作统计失败',
    });
  }
});

export default router;
