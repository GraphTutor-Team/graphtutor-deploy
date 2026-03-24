/**
 * GraphTutor V3.0 - 统一搜索API
 * 
 * 功能：提供统一的内容搜索接口
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler, successResponse, paginatedResponse } from '../../utils/errorHandler.js';
import { unifiedSearch, advancedSearch, quickSearch } from '../../services/contentSearch.js';
import { unifiedFullTextSearch } from '../../services/fullTextSearch.js';
import { unifiedRecommendation } from '../../services/contentRecommendation.js';
import { validateQuery, ValidationRules } from '../../middleware/validateRequest.js';

const router = express.Router();

/**
 * GET /api/v3/search
 * 统一搜索接口
 * 
 * 查询参数：
 * - q: 搜索关键词
 * - types: 内容类型（question,note,discussion），逗号分隔
 * - page: 页码
 * - limit: 每页数量
 * - sort: 排序方式（relevance, date, popularity）
 * - difficulty: 难度筛选（1-5）
 * - subjectCode: 学科代码
 * - bankId: 题库ID
 * - tags: 标签筛选，逗号分隔
 */
router.get('/',
  requireAuth,
  validateQuery({
    q: [
      ValidationRules.string.maxLength(100, '搜索关键词不能超过100个字符'),
    ],
    types: [
      ValidationRules.string.maxLength(50),
    ],
    page: ValidationRules.number.min(1, '页码必须大于0'),
    limit: ValidationRules.number.range(1, 100, '每页数量必须在1-100之间'),
  }),
  asyncHandler(async (req, res) => {
    const {
      q = '',
      types = 'question,note,discussion',
      page = 1,
      limit = 20,
      sort = 'relevance',
      difficulty,
      subjectCode,
      bankId,
      tags,
      type, // 单个类型筛选
      questionId,
      isResolved,
      useFullText = 'true', // 是否使用全文搜索（默认true）
    } = req.query;

    const typeArray = types.split(',').map(t => t.trim()).filter(Boolean);
    
    const filters = {};
    if (difficulty) filters.difficulty = Number(difficulty);
    if (subjectCode) filters.subjectCode = subjectCode;
    if (bankId) filters.bankId = bankId;
    if (tags) filters.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (type) filters.type = type;
    if (questionId) filters.questionId = questionId;
    if (isResolved !== undefined) filters.isResolved = isResolved === 'true';

    // 使用全文搜索（如果启用）
    const useFullTextSearch = useFullText === 'true' || useFullText === true;

    const result = await unifiedSearch({
      query: q,
      types: typeArray,
      page: Number(page),
      limit: Number(limit),
      sort,
      filters,
      userId: req.user.id,
    }, useFullTextSearch);

    res.json({
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        types: result.types,
      },
    });
  })
);

/**
 * GET /api/v3/search/quick
 * 快速搜索（返回前N个结果）
 */
router.get('/quick',
  requireAuth,
  validateQuery({
    q: [
      ValidationRules.string.required('搜索关键词不能为空'),
      ValidationRules.string.maxLength(100),
    ],
    limit: ValidationRules.number.range(1, 20, '数量必须在1-20之间'),
  }),
  asyncHandler(async (req, res) => {
    const { q, limit = 5, types = 'question,note,discussion' } = req.query;

    const typeArray = types.split(',').map(t => t.trim()).filter(Boolean);

    const result = await quickSearch(q, {
      limit: Number(limit),
      types: typeArray,
      userId: req.user.id,
    });

    res.json(successResponse(result, '搜索成功'));
  })
);

/**
 * POST /api/v3/search/advanced
 * 高级搜索
 */
router.post('/advanced',
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      text = '',
      types = ['question', 'note', 'discussion'],
      filters = {},
      page = 1,
      limit = 20,
      sort = 'relevance',
    } = req.body;

    const result = await advancedSearch({
      text,
      types,
      filters,
      page,
      limit,
      sort,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        types: result.types,
      },
    });
  })
);

/**
 * GET /api/v3/search/recommend
 * 内容推荐
 */
router.get('/recommend',
  requireAuth,
  validateQuery({
    type: [
      ValidationRules.enum(['question', 'note', 'discussion'], '类型必须是question、note或discussion'),
    ],
    limit: ValidationRules.number.range(1, 50, '数量必须在1-50之间'),
  }),
  asyncHandler(async (req, res) => {
    const {
      type = 'question',
      limit = 10,
      subjectCode,
      bankId,
      tags,
      noteId, // 用于推荐相关笔记
    } = req.query;

    const filters = {};
    if (subjectCode) filters.subjectCode = subjectCode;
    if (bankId) filters.bankId = bankId;
    if (tags) filters.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (noteId) filters.noteId = noteId;

    const recommendations = await unifiedRecommendation({
      userId: req.user.id,
      type,
      limit: Number(limit),
      filters,
    });

    res.json(successResponse(recommendations, '推荐成功'));
  })
);

export default router;

