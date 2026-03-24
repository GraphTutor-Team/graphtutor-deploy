/**
 * GraphTutor V3.0 - 角色申请API路由
 * 
 * 路径：/api/v3/role-applications
 * 功能：处理用户角色申请和审核
 */

import express from 'express';
import RoleApplication from '../../models/RoleApplication.js';
import User from '../../models/User.js';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { sanitizeString } from '../../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/v3/role-applications
 * 提交角色申请（需要登录）
 * 
 * body: {
 *   requestedRole: 'question_manager' | 'admin',
 *   reason: string (申请理由)
 * }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { requestedRole, reason } = req.body;
    const userId = req.user.id;
    const currentRole = req.user.role;

    // 验证申请角色
    if (!['question_manager', 'admin'].includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: '申请角色必须是 question_manager 或 admin',
      });
    }

    // 检查当前角色
    if (currentRole === 'admin') {
      return res.status(400).json({
        success: false,
        message: '您已经是管理员，无需申请',
      });
    }

    if (currentRole === 'question_manager' && requestedRole === 'question_manager') {
      return res.status(400).json({
        success: false,
        message: '您已经是出题负责人，无需申请',
      });
    }

    // 验证申请理由
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: '申请理由至少需要 10 个字符',
      });
    }

    if (reason.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: '申请理由不能超过 1000 个字符',
      });
    }

    // 检查是否有待审核的申请
    const existingPending = await RoleApplication.findOne({
      userId,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: '您已有待审核的申请，请等待审核结果',
        data: {
          applicationId: existingPending._id,
          requestedRole: existingPending.requestedRole,
          createdAt: existingPending.createdAt,
        },
      });
    }

    // 创建申请
    const application = await RoleApplication.create({
      userId,
      requestedRole,
      reason: sanitizeString(reason, { maxLength: 1000 }),
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: '申请已提交，等待管理员审核',
      data: application,
    });
  } catch (err) {
    console.error('POST /api/v3/role-applications error:', err);
    res.status(500).json({
      success: false,
      message: '提交申请失败',
    });
  }
});

/**
 * GET /api/v3/role-applications
 * 获取申请列表
 * - 普通用户：只能查看自己的申请
 * - 管理员：可以查看所有申请
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { status, requestedRole, page = 1, limit = 20 } = req.query;

    // 构建查询条件
    const query = {};
    if (!isAdmin) {
      // 普通用户只能查看自己的申请
      query.userId = userId;
    }
    if (status) {
      query.status = status;
    }
    if (requestedRole) {
      query.requestedRole = requestedRole;
    }

    // 分页
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // 查询
    const [applications, total] = await Promise.all([
      RoleApplication.find(query)
        .populate('userId', 'email name role')
        .populate('reviewerId', 'email name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RoleApplication.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: applications,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/role-applications error:', err);
    res.status(500).json({
      success: false,
      message: '获取申请列表失败',
    });
  }
});

/**
 * GET /api/v3/role-applications/:id
 * 获取申请详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const application = await RoleApplication.findById(id)
      .populate('userId', 'email name role')
      .populate('reviewerId', 'email name')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在',
      });
    }

    // 权限检查：普通用户只能查看自己的申请
    if (!isAdmin && application.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权查看该申请',
      });
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (err) {
    console.error('GET /api/v3/role-applications/:id error:', err);
    res.status(500).json({
      success: false,
      message: '获取申请详情失败',
    });
  }
});

/**
 * POST /api/v3/role-applications/:id/approve
 * 批准申请（仅管理员）
 */
router.post('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { comment = '' } = req.body;

    const application = await RoleApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在',
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `该申请已${application.status === 'approved' ? '批准' : '拒绝'}，无法重复操作`,
      });
    }

    // 批准申请
    await application.approve(reviewerId, sanitizeString(comment, { maxLength: 500, allowEmpty: true }));

    res.json({
      success: true,
      message: '申请已批准，用户角色已更新',
      data: application,
    });
  } catch (err) {
    console.error('POST /api/v3/role-applications/:id/approve error:', err);
    res.status(500).json({
      success: false,
      message: '批准申请失败',
    });
  }
});

/**
 * POST /api/v3/role-applications/:id/reject
 * 拒绝申请（仅管理员）
 */
router.post('/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { comment = '' } = req.body;

    const application = await RoleApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在',
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `该申请已${application.status === 'approved' ? '批准' : '拒绝'}，无法重复操作`,
      });
    }

    // 拒绝申请
    await application.reject(reviewerId, sanitizeString(comment, { maxLength: 500, allowEmpty: true }));

    res.json({
      success: true,
      message: '申请已拒绝',
      data: application,
    });
  } catch (err) {
    console.error('POST /api/v3/role-applications/:id/reject error:', err);
    res.status(500).json({
      success: false,
      message: '拒绝申请失败',
    });
  }
});

/**
 * GET /api/v3/role-applications/stats
 * 获取申请统计（仅管理员）
 */
router.get('/stats/overview', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [pending, approved, rejected, byRole] = await Promise.all([
      RoleApplication.countDocuments({ status: 'pending' }),
      RoleApplication.countDocuments({ status: 'approved' }),
      RoleApplication.countDocuments({ status: 'rejected' }),
      RoleApplication.aggregate([
        {
          $group: {
            _id: { role: '$requestedRole', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected,
        byRole: byRole.reduce((acc, item) => {
          const key = `${item._id.role}_${item._id.status}`;
          acc[key] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/role-applications/stats error:', err);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
    });
  }
});

export default router;

