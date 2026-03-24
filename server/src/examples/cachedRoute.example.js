/**
 * GraphTutor V3.0 - 缓存路由使用示例
 * 
 * 本文件展示如何在路由中使用缓存功能
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, successResponse } from '../utils/errorHandler.js';
import { 
  cacheResponse, 
  shortCache, 
  mediumCache, 
  longCache,
  userCache,
} from '../middleware/cache.js';
import { 
  cachedMongooseQuery, 
  cachedFindById,
  cachedCount,
  invalidateDocumentCache,
} from '../services/queryCache.js';
import Question from '../models/Question.js';

const router = express.Router();

/**
 * 示例1: 使用预定义的缓存中间件
 */
router.get('/questions',
  requireAuth,
  mediumCache, // 5分钟缓存
  asyncHandler(async (req, res) => {
    const questions = await Question.find({}).limit(20);
    res.json(successResponse(questions));
  })
);

/**
 * 示例2: 使用自定义缓存选项
 */
router.get('/questions/:id',
  requireAuth,
  cacheResponse({
    ttl: 10 * 60 * 1000, // 10分钟
    varyBy: ['user'], // 根据用户变化
  }),
  asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);
    res.json(successResponse(question));
  })
);

/**
 * 示例3: 使用用户相关缓存
 */
router.get('/my-questions',
  requireAuth,
  userCache({ ttl: 5 * 60 * 1000 }),
  asyncHandler(async (req, res) => {
    const questions = await Question.find({ 
      createdBy: req.user.id 
    });
    res.json(successResponse(questions));
  })
);

/**
 * 示例4: 使用查询缓存服务
 */
router.get('/questions-cached',
  requireAuth,
  asyncHandler(async (req, res) => {
    const questions = await cachedMongooseQuery(
      Question,
      {},
      {
        ttl: 5 * 60 * 1000,
        queryOptions: {
          limit: 20,
          sort: { createdAt: -1 },
        },
      }
    );
    res.json(successResponse(questions));
  })
);

/**
 * 示例5: 缓存单个文档查询
 */
router.get('/question/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = await cachedFindById(
      Question,
      req.params.id,
      {
        ttl: 10 * 60 * 1000,
        populate: 'createdBy',
      }
    );
    res.json(successResponse(question));
  })
);

/**
 * 示例6: 更新时清除缓存
 */
router.put('/question/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // 清除相关缓存
    invalidateDocumentCache('Question', req.params.id);
    invalidateModelCache('Question');

    res.json(successResponse(question, '更新成功'));
  })
);

/**
 * 示例7: 条件缓存（只缓存GET请求）
 */
router.get('/stats',
  requireAuth,
  conditionalCache(
    (req) => req.method === 'GET', // 只缓存GET请求
    { ttl: 1 * 60 * 1000 } // 1分钟缓存
  ),
  asyncHandler(async (req, res) => {
    const count = await cachedCount(Question, {});
    res.json(successResponse({ count }));
  })
);

export default router;

