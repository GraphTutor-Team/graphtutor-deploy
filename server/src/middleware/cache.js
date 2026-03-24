/**
 * GraphTutor V3.0 - API响应缓存中间件
 * 
 * 功能：为API响应添加缓存功能，减少数据库查询
 */

import { generateCacheKey } from '../utils/cache.js';
import { getCache, setCache, deleteCacheByPattern } from '../utils/redisCache.js';
import { info, warn } from '../utils/logger.js';

/**
 * 缓存选项
 */
export class CacheOptions {
  constructor(options = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 默认5分钟
    this.keyGenerator = options.keyGenerator || null;
    this.condition = options.condition || null; // 缓存条件函数
    this.varyBy = options.varyBy || []; // 根据哪些请求参数变化
    this.skipCache = options.skipCache || false; // 是否跳过缓存
  }
}

/**
 * API响应缓存中间件
 * @param {CacheOptions|Object} options - 缓存选项
 * @returns {Function} Express中间件
 */
export function cacheResponse(options = {}) {
  const cacheOpts = options instanceof CacheOptions ? options : new CacheOptions(options);

  return async (req, res, next) => {
    // 如果跳过缓存，直接继续
    if (cacheOpts.skipCache) {
      return next();
    }

    // 检查缓存条件
    if (cacheOpts.condition && !cacheOpts.condition(req)) {
      return next();
    }

    // 生成缓存键
    let cacheKey;
    if (cacheOpts.keyGenerator) {
      cacheKey = cacheOpts.keyGenerator(req);
    } else {
      const params = {
        method: req.method,
        path: req.path,
        query: req.query,
      };

      // 根据varyBy参数添加变化因素
      for (const field of cacheOpts.varyBy) {
        if (req[field]) {
          params[field] = req[field];
        }
      }

      cacheKey = generateCacheKey(`api:${req.method}:${req.path}`, params);
    }

    // 检查缓存（异步）
    const cached = await getCache(cacheKey);
    if (cached !== null) {
      info(`缓存命中: ${cacheKey}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // 保存原始json方法
    const originalJson = res.json.bind(res);

    // 重写json方法以缓存响应
    res.json = function(data) {
      // 只缓存成功的响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(cacheKey, data, cacheOpts.ttl).catch(err => {
          warn(`缓存设置失败: ${cacheKey}`, { error: err.message });
        });
        info(`缓存设置: ${cacheKey}`);
        res.setHeader('X-Cache', 'MISS');
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * 短时间缓存（1分钟）
 */
export const shortCache = cacheResponse({ ttl: 60 * 1000 });

/**
 * 中等时间缓存（5分钟）
 */
export const mediumCache = cacheResponse({ ttl: 5 * 60 * 1000 });

/**
 * 长时间缓存（30分钟）
 */
export const longCache = cacheResponse({ ttl: 30 * 60 * 1000 });

/**
 * 用户相关缓存（根据用户ID变化）
 */
export function userCache(options = {}) {
  return cacheResponse({
    ...options,
    varyBy: ['user'],
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      const params = {
        method: req.method,
        path: req.path,
        query: req.query,
        userId,
      };
      return generateCacheKey(`api:user:${userId}:${req.method}:${req.path}`, params);
    },
  });
}

/**
 * 条件缓存（根据条件决定是否缓存）
 */
export function conditionalCache(condition, options = {}) {
  return cacheResponse({
    ...options,
    condition,
  });
}

/**
 * 清除相关缓存
 * @param {string} pattern - 缓存键模式
 */
export function clearCacheByPattern(pattern) {
  const deleted = deleteCacheByPattern(pattern);
  info(`清除缓存: ${pattern}，删除了 ${deleted} 项`);
  return deleted;
}

