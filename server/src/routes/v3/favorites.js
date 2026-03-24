/**
 * GraphTutor V3.0 - 收藏API路由
 * 
 * 路径：/api/v3/favorites
 * 功能：提供收藏和收藏夹的CRUD操作
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import FavoriteFolder from '../../models/FavoriteFolder.js';
import {
  addFavorite,
  removeFavorite,
  isFavorite,
  getFavorites,
  moveFavorite,
  copyFavorite,
  updateFavorite,
  getFavoriteStats,
  batchRemoveFavorites,
  batchMoveFavorites,
} from '../../services/favoriteService.js';
import { validateInt } from '../../middleware/validation.js';
import { sanitizeString } from '../../middleware/validation.js';

const router = express.Router();

// ========== 收藏夹相关 ==========

/**
 * GET /api/v3/favorites/folders
 * 获取收藏夹列表
 */
router.get('/folders', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const folders = await FavoriteFolder.find({ userId })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.json({
      success: true,
      data: folders,
    });
  } catch (err) {
    console.error('GET /api/v3/favorites/folders error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取收藏夹列表失败',
    });
  }
});

/**
 * POST /api/v3/favorites/folders
 * 创建收藏夹
 */
router.post('/folders', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, color, icon, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '收藏夹名称不能为空',
      });
    }

    const folder = await FavoriteFolder.create({
      userId,
      name: sanitizeString(name, { maxLength: 100 }),
      description: sanitizeString(description || '', { maxLength: 500, allowEmpty: true }),
      color: color || '#3B82F6',
      icon: icon || '⭐',
      order: order || 0,
    });

    res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (err) {
    console.error('POST /api/v3/favorites/folders error:', err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '收藏夹名称已存在',
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || '创建收藏夹失败',
    });
  }
});

/**
 * PUT /api/v3/favorites/folders/:id
 * 更新收藏夹
 */
router.put('/folders/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, color, icon, order } = req.body;

    const folder = await FavoriteFolder.findOne({ _id: id, userId });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: '收藏夹不存在',
      });
    }

    if (name !== undefined) {
      folder.name = sanitizeString(name, { maxLength: 100 });
    }
    if (description !== undefined) {
      folder.description = sanitizeString(description, { maxLength: 500, allowEmpty: true });
    }
    if (color !== undefined) {
      folder.color = color;
    }
    if (icon !== undefined) {
      folder.icon = icon;
    }
    if (order !== undefined) {
      folder.order = order;
    }

    await folder.save();

    res.json({
      success: true,
      data: folder,
    });
  } catch (err) {
    console.error('PUT /api/v3/favorites/folders/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新收藏夹失败',
    });
  }
});

/**
 * DELETE /api/v3/favorites/folders/:id
 * 删除收藏夹
 */
router.delete('/folders/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const folder = await FavoriteFolder.findOne({ _id: id, userId });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: '收藏夹不存在',
      });
    }

    if (folder.isDefault) {
      return res.status(400).json({
        success: false,
        message: '不能删除默认收藏夹',
      });
    }

    // 删除收藏夹中的所有收藏
    const Favorite = (await import('../../models/Favorite.js')).default;
    await Favorite.deleteMany({ userId, folderId: id });

    // 删除收藏夹
    await FavoriteFolder.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/favorites/folders/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除收藏夹失败',
    });
  }
});

// ========== 收藏相关 ==========

/**
 * GET /api/v3/favorites
 * 获取收藏列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      folderId,
      tags,
      searchKeyword,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const options = {
      folderId,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      searchKeyword,
      page: validateInt(page, { min: 1, defaultValue: 1 }),
      limit: validateInt(limit, { min: 1, max: 100, defaultValue: 20 }),
      sortBy: sortBy || 'favoritedAt',
      sortOrder: sortOrder || 'desc',
    };

    const result = await getFavorites(userId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('GET /api/v3/favorites error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取收藏列表失败',
    });
  }
});

/**
 * GET /api/v3/favorites/stats
 * 获取收藏统计
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getFavoriteStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/favorites/stats error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取统计失败',
    });
  }
});

/**
 * GET /api/v3/favorites/check/:questionId
 * 检查题目是否已收藏
 */
router.get('/check/:questionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;

    const folders = await isFavorite(userId, questionId);

    res.json({
      success: true,
      data: {
        isFavorite: folders.length > 0,
        folders,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/favorites/check/:questionId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '检查失败',
    });
  }
});

/**
 * POST /api/v3/favorites
 * 添加收藏
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId, folderId, notes, tags } = req.body;

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: '题目ID不能为空',
      });
    }

    // 如果没有指定收藏夹，使用默认收藏夹
    let targetFolderId = folderId;
    if (!targetFolderId) {
      const defaultFolder = await FavoriteFolder.getOrCreateDefault(userId);
      targetFolderId = defaultFolder._id;
    }

    const favorite = await addFavorite(
      userId,
      questionId,
      targetFolderId,
      notes || '',
      tags || []
    );

    res.status(201).json({
      success: true,
      data: favorite,
    });
  } catch (err) {
    console.error('POST /api/v3/favorites error:', err);
    if (err.message === '题目已在此收藏夹中') {
      return res.status(409).json({
        success: false,
        message: err.message,
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || '添加收藏失败',
    });
  }
});

/**
 * DELETE /api/v3/favorites/:questionId/:folderId
 * 移除收藏
 */
router.delete('/:questionId/:folderId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId, folderId } = req.params;

    await removeFavorite(userId, questionId, folderId);

    res.json({
      success: true,
      message: '已取消收藏',
    });
  } catch (err) {
    console.error('DELETE /api/v3/favorites/:questionId/:folderId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '取消收藏失败',
    });
  }
});

/**
 * PUT /api/v3/favorites/:questionId/:folderId
 * 更新收藏（备注、标签）
 */
router.put('/:questionId/:folderId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId, folderId } = req.params;
    const { notes, tags } = req.body;

    const favorite = await updateFavorite(userId, questionId, folderId, {
      notes,
      tags,
    });

    res.json({
      success: true,
      data: favorite,
    });
  } catch (err) {
    console.error('PUT /api/v3/favorites/:questionId/:folderId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新收藏失败',
    });
  }
});

/**
 * POST /api/v3/favorites/move
 * 移动收藏到其他收藏夹
 */
router.post('/move', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId, fromFolderId, toFolderId } = req.body;

    if (!questionId || !fromFolderId || !toFolderId) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
      });
    }

    const favorite = await moveFavorite(userId, questionId, fromFolderId, toFolderId);

    res.json({
      success: true,
      data: favorite,
    });
  } catch (err) {
    console.error('POST /api/v3/favorites/move error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '移动收藏失败',
    });
  }
});

/**
 * POST /api/v3/favorites/copy
 * 复制收藏到其他收藏夹
 */
router.post('/copy', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId, fromFolderId, toFolderId } = req.body;

    if (!questionId || !fromFolderId || !toFolderId) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
      });
    }

    const favorite = await copyFavorite(userId, questionId, fromFolderId, toFolderId);

    res.json({
      success: true,
      data: favorite,
    });
  } catch (err) {
    console.error('POST /api/v3/favorites/copy error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '复制收藏失败',
    });
  }
});

/**
 * POST /api/v3/favorites/batch/remove
 * 批量删除收藏
 */
router.post('/batch/remove', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionIds, folderId } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: '收藏夹ID不能为空',
      });
    }

    const count = await batchRemoveFavorites(userId, questionIds, folderId);

    res.json({
      success: true,
      data: { deletedCount: count },
    });
  } catch (err) {
    console.error('POST /api/v3/favorites/batch/remove error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量删除失败',
    });
  }
});

/**
 * POST /api/v3/favorites/batch/move
 * 批量移动收藏
 */
router.post('/batch/move', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionIds, fromFolderId, toFolderId } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    if (!fromFolderId || !toFolderId) {
      return res.status(400).json({
        success: false,
        message: '收藏夹ID不能为空',
      });
    }

    const count = await batchMoveFavorites(userId, questionIds, fromFolderId, toFolderId);

    res.json({
      success: true,
      data: { modifiedCount: count },
    });
  } catch (err) {
    console.error('POST /api/v3/favorites/batch/move error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量移动失败',
    });
  }
});

export default router;

