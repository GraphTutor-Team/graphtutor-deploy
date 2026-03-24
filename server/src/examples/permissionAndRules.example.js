/**
 * GraphTutor V3.0 - 权限检查和业务规则使用示例
 * 
 * 本文件展示如何使用权限检查和业务规则验证
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, successResponse } from '../utils/errorHandler.js';
import { 
  checkViewBank,
  checkModifyBank,
  checkDeleteBank,
  checkModifyQuestion,
  checkModifyNote,
} from '../middleware/checkPermission.js';
import PermissionService, { checkPermission } from '../services/permissionService.js';
import BusinessRules from '../services/businessRules.js';
import Question from '../models/Question.js';
import QuestionBank from '../models/QuestionBank.js';

const router = express.Router();

/**
 * 示例1: 使用权限检查中间件
 */
router.get('/banks/:id',
  requireAuth,
  checkViewBank, // 自动检查权限并挂载req.bank
  asyncHandler(async (req, res) => {
    // req.bank 已经由中间件加载并验证权限
    res.json(successResponse(req.bank));
  })
);

/**
 * 示例2: 修改题库（权限检查 + 业务规则验证）
 */
router.put('/banks/:id',
  requireAuth,
  checkModifyBank, // 检查修改权限
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // 业务规则验证：检查名称唯一性
    await BusinessRules.validateBankNameUnique(
      name,
      req.user.id,
      req.params.id // 排除当前题库
    );

    // 更新题库
    const bank = await QuestionBank.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );

    res.json(successResponse(bank, '更新成功'));
  })
);

/**
 * 示例3: 删除题库（权限检查 + 业务规则验证）
 */
router.delete('/banks/:id',
  requireAuth,
  checkDeleteBank, // 检查删除权限
  asyncHandler(async (req, res) => {
    // 业务规则验证：检查是否可以删除
    BusinessRules.validateBankDeletion(req.bank);

    await QuestionBank.findByIdAndDelete(req.params.id);
    res.json(successResponse(null, '删除成功'));
  })
);

/**
 * 示例4: 创建题目（业务规则验证）
 */
router.post('/questions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { content, options, answerIndex, difficulty, tags } = req.body;

    // 业务规则验证：选项
    BusinessRules.validateQuestionOptions(options, 2, 10);

    // 业务规则验证：答案索引
    BusinessRules.validateAnswerIndex(answerIndex, options);

    // 业务规则验证：难度
    BusinessRules.validateDifficulty(difficulty, 1, 5);

    // 业务规则验证：标签
    if (tags) {
      BusinessRules.validateTags(tags, 10, 20);
    }

    // 创建题目
    const question = await Question.create({
      content,
      options,
      answerIndex,
      difficulty,
      tags,
      creatorId: req.user.id,
    });

    res.json(successResponse(question, '创建成功'));
  })
);

/**
 * 示例5: 修改题目（权限检查 + 业务规则验证）
 */
router.put('/questions/:id',
  requireAuth,
  checkModifyQuestion, // 检查修改权限
  asyncHandler(async (req, res) => {
    const { content, options, answerIndex, difficulty, tags } = req.body;

    // 业务规则验证
    if (options) {
      BusinessRules.validateQuestionOptions(options, 2, 10);
    }

    if (answerIndex !== undefined && options) {
      BusinessRules.validateAnswerIndex(answerIndex, options);
    }

    if (difficulty !== undefined) {
      BusinessRules.validateDifficulty(difficulty, 1, 5);
    }

    if (tags) {
      BusinessRules.validateTags(tags, 10, 20);
    }

    // 更新题目
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { content, options, answerIndex, difficulty, tags },
      { new: true }
    );

    res.json(successResponse(question, '更新成功'));
  })
);

/**
 * 示例6: 在服务层使用权限检查
 */
router.get('/questions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id).lean();

    // 使用PermissionService检查权限
    const result = await PermissionService.canModifyQuestion(req.user, question);
    
    if (!result.allowed) {
      // 如果没有权限，返回错误
      return res.status(403).json({
        success: false,
        message: result.reason,
      });
    }

    res.json(successResponse(question));
  })
);

/**
 * 示例7: 使用checkPermission便捷函数
 */
router.delete('/questions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id).lean();

    // 检查权限（如果失败会自动抛出ForbiddenError）
    const result = await PermissionService.canModifyQuestion(req.user, question);
    checkPermission(result);

    // 业务规则验证
    const bank = question.bankId 
      ? await QuestionBank.findById(question.bankId).lean()
      : null;
    BusinessRules.validateQuestionDeletion(question, bank);

    // 删除题目
    await Question.findByIdAndDelete(req.params.id);
    res.json(successResponse(null, '删除成功'));
  })
);

/**
 * 示例8: 分页查询（业务规则验证）
 */
router.get('/questions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, sortBy = 'createdAt' } = req.query;

    // 业务规则验证：分页参数
    BusinessRules.validatePagination(
      parseInt(page),
      parseInt(limit),
      100 // 最大每页100条
    );

    // 业务规则验证：排序字段
    BusinessRules.validateSortField(sortBy, [
      'createdAt',
      'updatedAt',
      'difficulty',
      'content',
    ]);

    const questions = await Question.find({})
      .sort({ [sortBy]: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(successResponse(questions));
  })
);

/**
 * 示例9: 日期范围查询（业务规则验证）
 */
router.get('/questions/stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // 业务规则验证：日期范围
    if (startDate && endDate) {
      BusinessRules.validateDateRange(startDate, endDate);
    }

    // 查询统计
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const count = await Question.countDocuments(query);
    res.json(successResponse({ count }));
  })
);

export default router;

