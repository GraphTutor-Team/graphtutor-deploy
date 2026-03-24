/**
 * GraphTutor V3.0 - 学科管理API路由
 * 
 * 功能：提供学科分类的增删改查接口
 * 路径：/api/v3/subjects
 */

import express from 'express';
import Subject from '../models/Subject.js';
import { requireAuth, requireAdmin, requireQuestionManager, requireRole } from '../middleware/auth.js';
import { sanitizeString, validateInt } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/subjects
 * 获取学科列表
 * - 支持树形结构返回
 * - 支持按层级过滤
 * - 支持按负责人过滤
 * 
 * 查询参数：
 * - tree: true/false - 是否返回树形结构（默认false）
 * - level: 1/2/3 - 按层级过滤
 * - managerId: ObjectId - 按负责人过滤
 * - enabled: true/false - 是否启用
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { tree, level, managerId, enabled } = req.query;

    // 如果请求树形结构
    if (tree === 'true') {
      const treeData = await Subject.getTree();
      return res.json({
        success: true,
        data: treeData,
      });
    }

    // 构建查询条件
    const cond = {};

    // 按层级过滤
    if (level) {
      const levelNum = validateInt(level, { min: 1, max: 5, defaultValue: null });
      if (levelNum !== null) {
        cond.level = levelNum;
      }
    }

    // 按负责人过滤
    if (managerId) {
      cond.managers = managerId;
    }

    // 按启用状态过滤
    if (enabled !== undefined) {
      cond.enabled = enabled === 'true';
    }

    // 查询学科列表
    const subjects = await Subject.find(cond)
      .populate('managers', 'name email')
      .populate('parentId', 'code name')
      .sort({ level: 1, order: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: subjects,
      total: subjects.length,
    });
  } catch (err) {
    console.error('GET /api/v3/subjects error:', err);
    res.status(500).json({
      success: false,
      message: '获取学科列表失败',
    });
  }
});

/**
 * GET /api/v3/subjects/:code
 * 获取单个学科详情
 */
router.get('/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;

    const subject = await Subject.findOne({ code })
      .populate('managers', 'name email role')
      .populate('parentId', 'code name level')
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: '学科不存在',
      });
    }

    // 获取子学科数量
    const childrenCount = await Subject.countDocuments({ parentId: subject._id });

    res.json({
      success: true,
      data: {
        ...subject,
        childrenCount,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/subjects/:code error:', err);
    res.status(500).json({
      success: false,
      message: '获取学科详情失败',
    });
  }
});

/**
 * POST /api/v3/subjects
 * 创建学科（需要管理员或出题负责人权限）
 * 
 * body: {
 *   code: string (必填),
 *   name: string (必填),
 *   level: number (必填),
 *   parentId: ObjectId (可选),
 *   description: string (可选),
 *   color: string (可选),
 *   icon: string (可选),
 *   order: number (可选),
 *   managers: [ObjectId] (可选)
 * }
 */
router.post('/', requireAuth, requireRole(['admin', 'question_manager']), async (req, res) => {
  try {
    const {
      code,
      name,
      level,
      parentId,
      description,
      color,
      icon,
      order,
      managers,
    } = req.body;

    // 验证必填字段
    if (!code || !name || level === undefined) {
      return res.status(400).json({
        success: false,
        message: '学科代码、名称和层级为必填项',
      });
    }

    // 验证学科代码格式
    if (!/^[A-Z0-9-]+$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: '学科代码只能包含大写字母、数字和连字符',
      });
    }

    // 验证层级
    const levelNum = validateInt(level, { min: 1, max: 5, defaultValue: null });
    if (levelNum === null) {
      return res.status(400).json({
        success: false,
        message: '层级必须在 1-5 之间',
      });
    }

    // 如果有父学科，验证父学科是否存在
    if (parentId) {
      const parent = await Subject.findById(parentId);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: '父学科不存在',
        });
      }
      // 验证层级关系：子学科的层级应该比父学科大1
      if (levelNum !== parent.level + 1) {
        return res.status(400).json({
          success: false,
          message: `子学科的层级应该是 ${parent.level + 1}，而不是 ${levelNum}`,
        });
      }
    } else if (levelNum !== 1) {
      // 如果没有父学科，层级必须是1
      return res.status(400).json({
        success: false,
        message: '一级学科不能有父学科',
      });
    }

    // 如果不是管理员，只能将自己添加为负责人
    const finalManagers = req.user.role === 'admin' 
      ? (managers || [])
      : [req.user.id, ...(managers || [])].filter(Boolean);

    // 创建学科
    const subject = await Subject.create({
      code: code.trim().toUpperCase(),
      name: sanitizeString(name, { maxLength: 100 }),
      level: levelNum,
      parentId: parentId || null,
      description: sanitizeString(description || '', { maxLength: 500, allowEmpty: true }),
      color: color || '#3B82F6',
      icon: icon || '📚',
      order: order || 0,
      managers: finalManagers,
      enabled: true,
    });

    res.status(201).json({
      success: true,
      data: subject,
    });
  } catch (err) {
    console.error('POST /api/v3/subjects error:', err);
    
    // 处理唯一键冲突
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '学科代码已存在',
      });
    }

    res.status(500).json({
      success: false,
      message: '创建学科失败',
    });
  }
});

/**
 * PUT /api/v3/subjects/:code
 * 更新学科（需要管理员或该学科的负责人权限）
 */
router.put('/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const {
      name,
      description,
      color,
      icon,
      order,
      managers,
      enabled,
    } = req.body;

    // 查找学科
    const subject = await Subject.findOne({ code });
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: '学科不存在',
      });
    }

    // 权限检查：管理员或该学科的负责人
    const isAdmin = req.user.role === 'admin';
    const isManager = subject.managers.some(
      (m) => m.toString() === req.user.id
    );

    if (!isAdmin && !isManager) {
      return res.status(403).json({
        success: false,
        message: '无权修改该学科',
      });
    }

    // 构建更新对象
    const updates = {};

    if (name !== undefined) {
      updates.name = sanitizeString(name, { maxLength: 100 });
    }
    if (description !== undefined) {
      updates.description = sanitizeString(description, { maxLength: 500, allowEmpty: true });
    }
    if (color !== undefined) {
      updates.color = color;
    }
    if (icon !== undefined) {
      updates.icon = icon;
    }
    if (order !== undefined) {
      updates.order = order;
    }
    if (enabled !== undefined && isAdmin) {
      // 只有管理员可以修改启用状态
      updates.enabled = enabled;
    }
    if (managers !== undefined && isAdmin) {
      // 只有管理员可以修改负责人列表
      updates.managers = managers;
    }

    // 更新学科
    const updated = await Subject.findByIdAndUpdate(
      subject._id,
      { $set: updates },
      { new: true }
    ).lean();

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('PUT /api/v3/subjects/:code error:', err);
    res.status(500).json({
      success: false,
      message: '更新学科失败',
    });
  }
});

/**
 * DELETE /api/v3/subjects/:code
 * 删除学科（仅管理员，且不能删除有子学科或题目的学科）
 */
router.delete('/:code', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;

    const subject = await Subject.findOne({ code });
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: '学科不存在',
      });
    }

    // 检查是否有子学科
    const childrenCount = await Subject.countDocuments({ parentId: subject._id });
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该学科下有 ${childrenCount} 个子学科，无法删除`,
      });
    }

    // 检查是否有题目关联（需要导入Question模型）
    const Question = (await import('../models/Question.js')).default;
    const questionCount = await Question.countDocuments({ subjectCode: code });
    if (questionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该学科下有 ${questionCount} 道题目，无法删除`,
      });
    }

    // 检查是否有题库关联
    const QuestionBank = (await import('../models/QuestionBank.js')).default;
    const bankCount = await QuestionBank.countDocuments({ subjectCode: code });
    if (bankCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该学科下有 ${bankCount} 个题库，无法删除`,
      });
    }

    // 删除学科
    await Subject.findByIdAndDelete(subject._id);

    res.json({
      success: true,
      message: '学科删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/subjects/:code error:', err);
    res.status(500).json({
      success: false,
      message: '删除学科失败',
    });
  }
});

/**
 * PUT /api/v3/subjects/:code/managers
 * 分配学科负责人（管理员权限）
 */
router.put('/:code/managers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const { managers } = req.body;

    if (!Array.isArray(managers)) {
      return res.status(400).json({
        success: false,
        message: 'managers 必须是数组',
      });
    }

    const subject = await Subject.findOne({ code });
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: '学科不存在',
      });
    }

    subject.managers = managers;
    await subject.save();

    res.json({
      success: true,
      data: subject,
    });
  } catch (err) {
    console.error('PUT /api/v3/subjects/:code/managers error:', err);
    res.status(500).json({
      success: false,
      message: '分配负责人失败',
    });
  }
});

export default router;

