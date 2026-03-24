/**
 * GraphTutor V3.0 - 题库管理API (V3版本)
 * 
 * 路径：/api/v3/banks
 * 功能：提供完整的题库管理功能，支持学科关联、权限控制、统计信息
 */

import express from 'express';
import QuestionBank from '../../models/QuestionBank.js';
import Question from '../../models/Question.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import {
  canViewBank,
  canEditBank,
  canDeleteBank,
  loadBank,
} from '../../middleware/bankAuth.js';
import {
  calculateBankStats,
  getBankActivity,
  getQuestionDistribution,
  updateBankQuestionCount,
} from '../../services/bankStats.js';
import { sanitizeString, validateInt } from '../../middleware/validation.js';
import bankImportExportRoutes from './bankImportExport.js';

const router = express.Router();

// 导入导出路由
router.use('/', bankImportExportRoutes);

/**
 * GET /api/v3/banks
 * 获取题库列表（支持筛选）
 * 
 * 查询参数：
 * - subjectCode: 学科代码
 * - managerId: 负责人ID
 * - isPublic: 是否公开
 * - search: 关键词搜索
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      subjectCode,
      managerId,
      isPublic,
      search,
      groupId,
      page = '1',
      limit = '20',
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // 构建查询条件
    const cond = {};

    // 学科筛选
    if (subjectCode) {
      cond.subjectCode = subjectCode;
    }

    // 负责人筛选
    if (managerId) {
      cond.$or = [
        { ownerId: managerId },
        { managers: managerId },
      ];
    }

    // 公开性筛选
    if (isPublic !== undefined) {
      cond.isPublic = isPublic === 'true';
    }

    // 群组筛选
    if (groupId) {
      cond.groupId = groupId;
    }

    // 权限过滤：非管理员只能看到公开题库或自己管理的题库，或群组关联的题库
    if (userRole !== 'admin') {
      // 获取用户所在的群组
      const Group = await import('../../models/Group.js');
      const userGroups = await Group.default.find({
        $or: [
          { ownerId: userId },
          { 'members.userId': userId, 'members.status': 'active' },
        ],
        status: 'active',
      }).select('_id').lean();
      const userGroupIds = userGroups.map(g => g._id);

      // 构建权限条件
      const permissionOr = [
        { isPublic: true },
        { ownerId: userId },
        { managers: userId },
        ...(userGroupIds.length > 0 ? [{ groupId: { $in: userGroupIds } }] : []),
      ];

      // 如果有搜索条件，需要合并
      if (search) {
        const searchRegex = new RegExp(sanitizeString(search, { maxLength: 100 }), 'i');
        cond.$and = [
          {
            $or: permissionOr,
          },
          {
            $or: [
              { name: searchRegex },
              { description: searchRegex },
            ],
          },
        ];
      } else {
        cond.$or = permissionOr;
      }
    } else if (search) {
      // 管理员：只需要搜索条件
      const searchRegex = new RegExp(sanitizeString(search, { maxLength: 100 }), 'i');
      cond.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    // 分页参数
    const pageNum = validateInt(page, { min: 1, defaultValue: 1 });
    const limitNum = validateInt(limit, { min: 1, max: 100, defaultValue: 20 });
    const skip = (pageNum - 1) * limitNum;

    // 查询题库列表
    const [banks, total] = await Promise.all([
      QuestionBank.find(cond)
        .populate('ownerId', 'name email')
        .populate('managers', 'name email role')
        .populate('subjectCode', 'code name icon')
        .populate('groupId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      QuestionBank.countDocuments(cond),
    ]);

    res.json({
      success: true,
      data: banks,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/banks error:', err);
    res.status(500).json({
      success: false,
      message: '获取题库列表失败',
    });
  }
});

/**
 * GET /api/v3/banks/:id
 * 获取题库详情
 */
router.get('/:id', requireAuth, loadBank, canViewBank, async (req, res) => {
  try {
    const bank = req.bank;

    // 获取题目数量（如果缓存不存在，则计算）
    if (bank.questionCount === undefined || bank.questionCount === null) {
      bank.questionCount = await updateBankQuestionCount(bank._id);
    }

    res.json({
      success: true,
      data: bank,
    });
  } catch (err) {
    console.error('GET /api/v3/banks/:id error:', err);
    res.status(500).json({
      success: false,
      message: '获取题库详情失败',
    });
  }
});

/**
 * POST /api/v3/banks
 * 创建题库（所有用户都可以创建）
 * 
 * body: {
 *   name: string (必填),
 *   subjectCode: string (可选),
 *   description: string (可选),
 *   isPublic: boolean (可选，默认true),
 *   managers: [ObjectId] (可选),
 *   settings: object (可选),
 *   groupId: ObjectId (可选，关联群组)
 * }
 */
router.post(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const {
        name,
        subjectCode,
        description,
        isPublic = true,
        managers,
        settings,
        groupId,
        isOfficial = false, // 是否为官方题库
      } = req.body;

      const userId = req.user.id;
      const userRole = req.user.role;

      // 验证必填字段
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: '题库名称不能为空',
        });
      }

      // 只有管理员可以创建官方题库
      if (isOfficial && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '只有管理员可以创建官方题库',
        });
      }

      // 如果关联了群组，不能是官方题库
      if (groupId && isOfficial) {
        return res.status(400).json({
          success: false,
          message: '小组题库不能设置为官方题库',
        });
      }

      // 构建管理者数组
      let finalManagers = [userId]; // 创建者自动添加为管理者
      if (managers && Array.isArray(managers)) {
        // 管理员可以指定其他管理者
        if (userRole === 'admin') {
          finalManagers = [...new Set([userId, ...managers])];
        }
      }

      // 创建题库
      const bank = await QuestionBank.create({
        name: sanitizeString(name, { maxLength: 100 }),
        subjectCode: subjectCode || null,
        description: sanitizeString(description || '', {
          maxLength: 500,
          allowEmpty: true,
        }),
        ownerId: userId,
        managers: finalManagers,
        isPublic: isPublic,
        isOfficial: isOfficial && userRole === 'admin', // 只有管理员可以创建官方题库
        settings: settings || {
          difficultyRange: [1, 2, 3, 4, 5],
          questionTypes: ['single'],
          aiEnabled: false,
        },
        questionCount: 0,
        groupId: groupId || undefined,
      });

      res.status(201).json({
        success: true,
        data: bank,
      });
    } catch (err) {
      console.error('POST /api/v3/banks error:', err);
      res.status(500).json({
        success: false,
        message: '创建题库失败',
      });
    }
  }
);

/**
 * PUT /api/v3/banks/:id
 * 更新题库（需要编辑权限）
 */
import { canModifyBank } from '../../middleware/permission.js';

router.put('/:id', requireAuth, canModifyBank, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subjectCode,
      description,
      isPublic,
      managers,
      settings,
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // 如果更新了学科代码，验证学科是否存在
    if (subjectCode !== undefined && subjectCode) {
      const Subject = (await import('../../models/Subject.js')).default;
      const subject = await Subject.findOne({ code: subjectCode, enabled: true });
      if (!subject) {
        return res.status(400).json({
          success: false,
          message: `学科代码 "${subjectCode}" 不存在或已禁用`,
        });
      }
    }

    // 构建更新对象
    const updates = {};

    if (name !== undefined) {
      updates.name = sanitizeString(name, { maxLength: 100 });
    }
    if (description !== undefined) {
      updates.description = sanitizeString(description, {
        maxLength: 500,
        allowEmpty: true,
      });
    }
    if (subjectCode !== undefined) {
      updates.subjectCode = subjectCode || null;
    }
    if (isPublic !== undefined && typeof isPublic === 'boolean') {
      updates.isPublic = isPublic;
    }
    if (settings !== undefined) {
      updates.settings = settings;
    }

    // 只有管理员可以修改管理者列表
    if (managers !== undefined && userRole === 'admin') {
      updates.managers = managers;
    }

    // 更新题库
    const updated = await QuestionBank.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )
      .populate('ownerId', 'name email')
      .populate('managers', 'name email role')
      .lean();

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('PUT /api/v3/banks/:id error:', err);
    res.status(500).json({
      success: false,
      message: '更新题库失败',
    });
  }
});

/**
 * DELETE /api/v3/banks/:id
 * 删除题库（需要删除权限）
 */
router.delete(
  '/:id',
  requireAuth,
  loadBank,
  canDeleteBank,
  async (req, res) => {
    try {
      const { id } = req.params;

      // 检查题库下是否有题目
      const questionCount = await Question.countDocuments({ bankId: id });
      if (questionCount > 0) {
        return res.status(400).json({
          success: false,
          message: `该题库下有 ${questionCount} 道题目，无法删除。请先删除或移动题目。`,
        });
      }

      // 删除题库
      await QuestionBank.findByIdAndDelete(id);

      res.json({
        success: true,
        message: '题库删除成功',
      });
    } catch (err) {
      console.error('DELETE /api/v3/banks/:id error:', err);
      res.status(500).json({
        success: false,
        message: '删除题库失败',
      });
    }
  }
);

/**
 * GET /api/v3/banks/:id/stats
 * 获取题库统计信息
 */
router.get('/:id/stats', requireAuth, loadBank, canViewBank, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await calculateBankStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/banks/:id/stats error:', err);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
    });
  }
});

/**
 * GET /api/v3/banks/:id/activity
 * 获取题库活跃度数据
 * 
 * 查询参数：
 * - days: 天数（默认30）
 */
router.get(
  '/:id/activity',
  requireAuth,
  loadBank,
  canViewBank,
  async (req, res) => {
    try {
      const { id } = req.params;
      const days = validateInt(req.query.days, {
        min: 1,
        max: 365,
        defaultValue: 30,
      });

      const activity = await getBankActivity(id, days);

      res.json({
        success: true,
        data: activity,
      });
    } catch (err) {
      console.error('GET /api/v3/banks/:id/activity error:', err);
      res.status(500).json({
        success: false,
        message: '获取活跃度数据失败',
      });
    }
  }
);

/**
 * GET /api/v3/banks/:id/distribution
 * 获取题目分布统计
 */
router.get(
  '/:id/distribution',
  requireAuth,
  loadBank,
  canViewBank,
  async (req, res) => {
    try {
      const { id } = req.params;
      const distribution = await getQuestionDistribution(id);

      res.json({
        success: true,
        data: distribution,
      });
    } catch (err) {
      console.error('GET /api/v3/banks/:id/distribution error:', err);
      res.status(500).json({
        success: false,
        message: '获取分布统计失败',
      });
    }
  }
);

/**
 * GET /api/v3/banks/:id/usage
 * 获取题库使用情况统计
 */
router.get(
  '/:id/usage',
  requireAuth,
  loadBank,
  canViewBank,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { getBankUsageStats } = await import('../../services/bankStats.js');
      const usageStats = await getBankUsageStats(id);

      res.json({
        success: true,
        data: usageStats,
      });
    } catch (err) {
      console.error('GET /api/v3/banks/:id/usage error:', err);
      res.status(500).json({
        success: false,
        message: '获取使用情况统计失败',
      });
    }
  }
);

/**
 * POST /api/v3/banks/batch-update-counts
 * 批量更新题库题目数量缓存（管理员功能）
 */
router.post(
  '/batch-update-counts',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { bankIds } = req.body;

      if (!Array.isArray(bankIds) || bankIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'bankIds 必须是非空数组',
        });
      }

      const { batchUpdateBankQuestionCounts } = await import('../../services/bankStats.js');
      await batchUpdateBankQuestionCounts(bankIds);

      res.json({
        success: true,
        message: `成功更新 ${bankIds.length} 个题库的题目数量`,
      });
    } catch (err) {
      console.error('POST /api/v3/banks/batch-update-counts error:', err);
      res.status(500).json({
        success: false,
        message: '批量更新失败',
      });
    }
  }
);

/**
 * PUT /api/v3/banks/:id/managers
 * 分配题库管理者（需要管理员权限）
 */
router.put(
  '/:id/managers',
  requireAuth,
  requireRole(['admin']),
  loadBank,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { managers } = req.body;

      if (!Array.isArray(managers)) {
        return res.status(400).json({
          success: false,
          message: 'managers 必须是数组',
        });
      }

      // 确保创建者在管理者列表中
      const finalManagers = [
        ...new Set([req.bank.ownerId.toString(), ...managers]),
      ];

      const updated = await QuestionBank.findByIdAndUpdate(
        id,
        { $set: { managers: finalManagers } },
        { new: true }
      )
        .populate('managers', 'name email role')
        .lean();

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error('PUT /api/v3/banks/:id/managers error:', err);
      res.status(500).json({
        success: false,
        message: '分配管理者失败',
      });
    }
  }
);

/**
 * POST /api/v3/banks/:id/move-questions
 * 批量移动题目到另一个题库
 * 
 * body: {
 *   questionIds: [ObjectId], // 要移动的题目ID数组
 *   targetBankId: ObjectId,   // 目标题库ID
 * }
 */
router.post(
  '/:id/move-questions',
  requireAuth,
  canModifyBank,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { questionIds, targetBankId } = req.body;

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'questionIds 必须是非空数组',
        });
      }

      if (!targetBankId) {
        return res.status(400).json({
          success: false,
          message: 'targetBankId 不能为空',
        });
      }

      // 验证目标题库是否存在
      const targetBank = await QuestionBank.findById(targetBankId);
      if (!targetBank) {
        return res.status(404).json({
          success: false,
          message: '目标题库不存在',
        });
      }

      // 验证权限：是否有权限修改目标题库
      const userId = req.user.id;
      const userRole = req.user.role;
      const canModifyTarget = 
        userRole === 'admin' ||
        targetBank.ownerId?.toString() === userId ||
        targetBank.managers?.some(m => m.toString() === userId);

      if (!canModifyTarget) {
        return res.status(403).json({
          success: false,
          message: '没有权限修改目标题库',
        });
      }

      // 批量移动题目
      const { moveQuestionToBank } = await import('../../utils/businessOperations.js');
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];

      for (const questionId of questionIds) {
        try {
          await moveQuestionToBank(questionId, targetBankId, userId);
          successCount++;
        } catch (err) {
          failCount++;
          errors.push({
            questionId,
            error: err.message || '移动失败',
          });
        }
      }

      // 更新两个题库的题目数量缓存
      await Promise.all([
        updateBankQuestionCount(id),
        updateBankQuestionCount(targetBankId),
      ]);

      res.json({
        success: true,
        data: {
          successCount,
          failCount,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (err) {
      console.error('POST /api/v3/banks/:id/move-questions error:', err);
      res.status(500).json({
        success: false,
        message: '批量移动题目失败',
      });
    }
  }
);

/**
 * POST /api/v3/banks/:id/merge
 * 合并题库（将当前题库的题目合并到目标题库，然后删除当前题库）
 * 
 * body: {
 *   targetBankId: ObjectId, // 目标题库ID
 *   deleteAfterMerge: boolean, // 合并后是否删除当前题库（默认true）
 * }
 */
router.post(
  '/:id/merge',
  requireAuth,
  canModifyBank,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { targetBankId, deleteAfterMerge = true } = req.body;

      if (!targetBankId) {
        return res.status(400).json({
          success: false,
          message: 'targetBankId 不能为空',
        });
      }

      if (id === targetBankId) {
        return res.status(400).json({
          success: false,
          message: '不能合并到自身',
        });
      }

      // 验证目标题库是否存在
      const targetBank = await QuestionBank.findById(targetBankId);
      if (!targetBank) {
        return res.status(404).json({
          success: false,
          message: '目标题库不存在',
        });
      }

      // 验证权限：是否有权限修改目标题库
      const userId = req.user.id;
      const userRole = req.user.role;
      const canModifyTarget = 
        userRole === 'admin' ||
        targetBank.ownerId?.toString() === userId ||
        targetBank.managers?.some(m => m.toString() === userId);

      if (!canModifyTarget) {
        return res.status(403).json({
          success: false,
          message: '没有权限修改目标题库',
        });
      }

      // 获取当前题库的所有题目
      const questions = await Question.find({ bankId: id });
      const questionIds = questions.map(q => q._id);

      // 批量移动题目
      const { moveQuestionToBank } = await import('../../utils/businessOperations.js');
      
      let successCount = 0;
      let failCount = 0;

      for (const questionId of questionIds) {
        try {
          await moveQuestionToBank(questionId, targetBankId, userId);
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`移动题目失败: ${questionId}`, err);
        }
      }

      // 更新目标题库的题目数量缓存
      await updateBankQuestionCount(targetBankId);

      // 如果选择删除当前题库
      if (deleteAfterMerge && successCount > 0) {
        await QuestionBank.findByIdAndDelete(id);
      }

      res.json({
        success: true,
        data: {
          successCount,
          failCount,
          targetBankId,
          deleted: deleteAfterMerge && successCount > 0,
        },
      });
    } catch (err) {
      console.error('POST /api/v3/banks/:id/merge error:', err);
      res.status(500).json({
        success: false,
        message: '合并题库失败',
      });
    }
  }
);

/**
 * GET /api/v3/banks/:id/questions
 * 获取题库下的题目列表
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - difficulty: 难度筛选
 * - type: 题型筛选
 * - search: 关键词搜索
 */
router.get(
  '/:id/questions',
  requireAuth,
  loadBank,
  canViewBank,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        page = '1',
        limit = '20',
        difficulty,
        type,
        search,
      } = req.query;

      const pageNum = validateInt(page, { min: 1, defaultValue: 1 });
      const limitNum = validateInt(limit, { min: 1, max: 100, defaultValue: 20 });
      const skip = (pageNum - 1) * limitNum;

      // 构建查询条件
      const cond = { bankId: id };

      if (difficulty) {
        const diffNum = validateInt(difficulty, { min: 1, max: 5, defaultValue: null });
        if (diffNum !== null) {
          cond.difficulty = diffNum;
        }
      }

      if (type) {
        cond.type = type;
      }

      if (search) {
        const searchRegex = new RegExp(sanitizeString(search, { maxLength: 100 }), 'i');
        cond.$or = [
          { content: searchRegex },
          { explain: searchRegex },
          { tags: searchRegex },
        ];
      }

      // 查询题目列表
      const [questions, total] = await Promise.all([
        Question.find(cond)
          .populate('creatorId', 'name email')
          .populate('managerId', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Question.countDocuments(cond),
      ]);

      res.json({
        success: true,
        data: questions,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      console.error('GET /api/v3/banks/:id/questions error:', err);
      res.status(500).json({
        success: false,
        message: '获取题目列表失败',
      });
    }
  }
);

/**
 * GET /api/v3/banks/recommend
 * 获取推荐的题库列表
 * 
 * 查询参数：
 * - strategy: 推荐策略（wrong, history, popular, related, all）
 * - limit: 返回数量（默认10）
 * - subjectCode: 学科代码筛选
 */
router.get('/recommend', requireAuth, async (req, res) => {
  try {
    const {
      strategy = 'all',
      limit = '10',
      subjectCode,
    } = req.query;

    const userId = req.user.id;
    const limitNum = validateInt(limit, { min: 1, max: 50, defaultValue: 10 });

    const { recommendBanks, recommendBanksFromWrongQuestions, recommendBanksFromHistory, recommendPopularBanks, recommendRelatedBanks } = await import('../../services/bankRecommendation.js');

    let banks = [];

    switch (strategy) {
      case 'wrong':
        banks = await recommendBanksFromWrongQuestions(userId, { limit: limitNum });
        break;
      case 'history':
        banks = await recommendBanksFromHistory(userId, { limit: limitNum });
        break;
      case 'popular':
        banks = await recommendPopularBanks({ limit: limitNum, subjectCode });
        break;
      case 'related':
        banks = await recommendRelatedBanks(userId, { limit: limitNum });
        break;
      case 'all':
      default:
        banks = await recommendBanks(userId, { limit: limitNum });
        break;
    }

    res.json({
      success: true,
      data: banks,
    });
  } catch (err) {
    console.error('GET /api/v3/banks/recommend error:', err);
    res.status(500).json({
      success: false,
      message: '获取推荐题库失败',
    });
  }
});

export default router;

