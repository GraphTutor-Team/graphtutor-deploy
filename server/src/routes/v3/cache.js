/**
 * GraphTutor V3.0 - 缓存管理API
 * 
 * 功能：提供缓存管理接口（查看统计、清除缓存等）
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { asyncHandler, successResponse } from '../../utils/errorHandler.js';
import { 
  getCacheStats, 
  clearCache, 
  deleteCacheByPattern,
} from '../../utils/redisCache.js';
import { invalidateModelCache, invalidateDocumentCache } from '../../services/queryCache.js';

const router = express.Router();

/**
 * GET /api/v3/cache/stats
 * 获取缓存统计信息（仅管理员）
 */
router.get('/stats',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const stats = await getCacheStats();
    res.json(successResponse(stats, '获取缓存统计成功'));
  })
);

/**
 * DELETE /api/v3/cache
 * 清除所有缓存（仅管理员）
 */
router.delete('/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await clearCache();
    res.json(successResponse(null, '所有缓存已清除'));
  })
);

/**
 * DELETE /api/v3/cache/pattern/:pattern
 * 按模式清除缓存（仅管理员）
 */
router.delete('/pattern/:pattern',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { pattern } = req.params;
    const deleted = await deleteCacheByPattern(decodeURIComponent(pattern));
    res.json(successResponse({ deleted }, `清除了 ${deleted} 项缓存`));
  })
);

/**
 * DELETE /api/v3/cache/model/:modelName
 * 清除模型相关缓存（仅管理员）
 */
router.delete('/model/:modelName',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { modelName } = req.params;
    const deleted = invalidateModelCache(modelName);
    res.json(successResponse({ deleted }, `模型 ${modelName} 的缓存已清除`));
  })
);

/**
 * DELETE /api/v3/cache/document/:modelName/:id
 * 清除文档相关缓存（仅管理员）
 */
router.delete('/document/:modelName/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { modelName, id } = req.params;
    const deleted = invalidateDocumentCache(modelName, id);
    res.json(successResponse({ deleted }, `文档 ${modelName}:${id} 的缓存已清除`));
  })
);

export default router;

