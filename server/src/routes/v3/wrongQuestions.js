/**
 * GraphTutor V3.0 - 错题本API路由
 * 
 * 路径：/api/v3/wrong-questions
 * 功能：提供错题本的CRUD操作
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  getWrongQuestions,
  updateCategory,
  updateTags,
  markAsMastered,
  unmarkAsMastered,
  deleteWrongQuestion,
  getWrongQuestionStats,
  getCategories,
  getTags,
  batchUpdateCategory,
  batchUpdateTags,
  batchMarkAsMastered,
  batchDeleteWrongQuestions,
  exportWrongQuestions,
} from '../../services/wrongQuestionService.js';
import { validateInt } from '../../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/v3/wrong-questions
 * 获取错题列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      category,
      tags,
      masteryStatus,
      subjectCode,
      searchKeyword,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const options = {
      category,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      masteryStatus,
      subjectCode,
      searchKeyword,
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      sortBy: sortBy || 'lastErrorAt',
      sortOrder: sortOrder || 'desc',
    };

    const result = await getWrongQuestions(userId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/wrong-questions error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取错题列表失败',
    });
  }
});

/**
 * GET /api/v3/wrong-questions/stats
 * 获取错题统计
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getWrongQuestionStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/wrong-questions/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取统计失败',
    });
  }
});

/**
 * GET /api/v3/wrong-questions/categories
 * 获取分类列表
 */
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const categories = await getCategories(userId);

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error('GET /api/v3/wrong-questions/categories error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取分类失败',
    });
  }
});

/**
 * GET /api/v3/wrong-questions/tags
 * 获取标签列表
 */
router.get('/tags', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const tags = await getTags(userId);

    res.json({
      success: true,
      data: tags,
    });
  } catch (err) {
    console.error('GET /api/v3/wrong-questions/tags error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取标签失败',
    });
  }
});

/**
 * PUT /api/v3/wrong-questions/:questionId/category
 * 更新错题分类
 */
router.put('/:questionId/category', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: '分类不能为空',
      });
    }

    const wrongQuestion = await updateCategory(userId, questionId, category);

    res.json({
      success: true,
      data: wrongQuestion,
    });
  } catch (err) {
    console.error('PUT /api/v3/wrong-questions/:questionId/category error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新分类失败',
    });
  }
});

/**
 * PUT /api/v3/wrong-questions/:questionId/tags
 * 更新错题标签
 */
router.put('/:questionId/tags', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;
    const { tags } = req.body;

    const wrongQuestion = await updateTags(userId, questionId, tags || []);

    res.json({
      success: true,
      data: wrongQuestion,
    });
  } catch (err) {
    console.error('PUT /api/v3/wrong-questions/:questionId/tags error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新标签失败',
    });
  }
});

/**
 * PUT /api/v3/wrong-questions/:questionId/mastered
 * 标记为已掌握
 */
router.put('/:questionId/mastered', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;

    const wrongQuestion = await markAsMastered(userId, questionId);

    res.json({
      success: true,
      data: wrongQuestion,
    });
  } catch (err) {
    console.error('PUT /api/v3/wrong-questions/:questionId/mastered error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '标记失败',
    });
  }
});

/**
 * DELETE /api/v3/wrong-questions/:questionId/mastered
 * 取消掌握标记
 */
router.delete('/:questionId/mastered', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;

    const wrongQuestion = await unmarkAsMastered(userId, questionId);

    res.json({
      success: true,
      data: wrongQuestion,
    });
  } catch (err) {
    console.error('DELETE /api/v3/wrong-questions/:questionId/mastered error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '取消标记失败',
    });
  }
});

/**
 * DELETE /api/v3/wrong-questions/:questionId
 * 删除错题
 */
router.delete('/:questionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;

    const deleted = await deleteWrongQuestion(userId, questionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '错题不存在',
      });
    }

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/wrong-questions/:questionId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除失败',
    });
  }
});

/**
 * POST /api/v3/wrong-questions/batch/category
 * 批量更新分类
 */
router.post('/batch/category', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionIds, category } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: '分类不能为空',
      });
    }

    const count = await batchUpdateCategory(userId, questionIds, category);

    res.json({
      success: true,
      data: { modifiedCount: count },
    });
  } catch (err) {
    console.error('POST /api/v3/wrong-questions/batch/category error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量更新失败',
    });
  }
});

/**
 * POST /api/v3/wrong-questions/batch/tags
 * 批量更新标签
 */
router.post('/batch/tags', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionIds, tags } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    const count = await batchUpdateTags(userId, questionIds, tags || []);

    res.json({
      success: true,
      data: { modifiedCount: count },
    });
  } catch (err) {
    console.error('POST /api/v3/wrong-questions/batch/tags error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量更新失败',
    });
  }
});

/**
 * POST /api/v3/wrong-questions/batch/mastered
 * 批量标记为已掌握
 */
router.post('/batch/mastered', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    const count = await batchMarkAsMastered(userId, questionIds);

    res.json({
      success: true,
      data: { modifiedCount: count },
    });
  } catch (err) {
    console.error('POST /api/v3/wrong-questions/batch/mastered error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量标记失败',
    });
  }
});

/**
 * POST /api/v3/wrong-questions/batch/delete
 * 批量删除错题
 */
router.post('/batch/delete', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    const count = await batchDeleteWrongQuestions(userId, questionIds);

    res.json({
      success: true,
      data: { deletedCount: count },
      message: `成功删除 ${count} 道错题`,
    });
  } catch (err) {
    console.error('POST /api/v3/wrong-questions/batch/delete error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量删除失败',
    });
  }
});

/**
 * GET /api/v3/wrong-questions/export
 * 导出错题
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      category,
      tags,
      masteryStatus,
      subjectCode,
    } = req.query;

    const options = {
      category,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      masteryStatus,
      subjectCode,
    };

    const data = await exportWrongQuestions(userId, options);

    res.json({
      success: true,
      data: {
        version: '3.0',
        exportDate: new Date().toISOString(),
        count: data.length,
        wrongQuestions: data,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/wrong-questions/export error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '导出失败',
    });
  }
});

export default router;

