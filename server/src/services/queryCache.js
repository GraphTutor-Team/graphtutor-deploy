/**
 * GraphTutor V3.0 - 数据库查询缓存服务
 * 
 * 功能：缓存数据库查询结果，减少数据库负载
 */

import { generateCacheKey } from '../utils/cache.js';
import { getCache, setCache, deleteCacheByPattern } from '../utils/redisCache.js';
import { info, warn } from '../utils/logger.js';

/**
 * 缓存数据库查询结果
 * @param {Function} queryFn - 查询函数
 * @param {string} cacheKey - 缓存键
 * @param {Object} options - 选项
 * @param {number} options.ttl - 过期时间（毫秒）
 * @param {boolean} options.forceRefresh - 是否强制刷新
 * @returns {Promise<*>} 查询结果
 */
export async function cachedQuery(queryFn, cacheKey, options = {}) {
  const { ttl = 5 * 60 * 1000, forceRefresh = false } = options;

  // 如果不强制刷新，先检查缓存
  if (!forceRefresh) {
    const cached = await getCache(cacheKey);
    if (cached !== null) {
      info(`查询缓存命中: ${cacheKey}`);
      return cached;
    }
  }

  // 执行查询
  try {
    const result = await queryFn();
    
    // 缓存结果
    await setCache(cacheKey, result, ttl);
    info(`查询结果已缓存: ${cacheKey}`);
    
    return result;
  } catch (err) {
    warn(`查询失败: ${cacheKey}`, { error: err.message });
    throw err;
  }
}

/**
 * 缓存Mongoose查询
 * @param {Object} Model - Mongoose模型
 * @param {Object} query - 查询条件
 * @param {Object} options - 选项
 * @param {string} options.cacheKey - 缓存键（可选，自动生成）
 * @param {number} options.ttl - 过期时间（毫秒）
 * @param {boolean} options.forceRefresh - 是否强制刷新
 * @param {Object} options.queryOptions - Mongoose查询选项（select, populate等）
 * @returns {Promise<*>} 查询结果
 */
export async function cachedMongooseQuery(Model, query, options = {}) {
  const {
    cacheKey = null,
    ttl = 5 * 60 * 1000,
    forceRefresh = false,
    queryOptions = {},
  } = options;

  // 生成缓存键
  const key = cacheKey || generateCacheKey(
    `mongoose:${Model.modelName}`,
    { query, options: queryOptions }
  );

  return cachedQuery(async () => {
    let mongooseQuery = Model.find(query);

    // 应用查询选项
    if (queryOptions.select) {
      mongooseQuery = mongooseQuery.select(queryOptions.select);
    }
    if (queryOptions.populate) {
      mongooseQuery = mongooseQuery.populate(queryOptions.populate);
    }
    if (queryOptions.sort) {
      mongooseQuery = mongooseQuery.sort(queryOptions.sort);
    }
    if (queryOptions.skip !== undefined) {
      mongooseQuery = mongooseQuery.skip(queryOptions.skip);
    }
    if (queryOptions.limit !== undefined) {
      mongooseQuery = mongooseQuery.limit(queryOptions.limit);
    }

    return await mongooseQuery.lean();
  }, key, { ttl, forceRefresh });
}

/**
 * 缓存计数查询
 * @param {Object} Model - Mongoose模型
 * @param {Object} query - 查询条件
 * @param {Object} options - 选项
 * @returns {Promise<number>} 计数结果
 */
export async function cachedCount(Model, query, options = {}) {
  const { ttl = 5 * 60 * 1000, forceRefresh = false } = options;
  const cacheKey = generateCacheKey(`count:${Model.modelName}`, { query });

  return cachedQuery(
    () => Model.countDocuments(query),
    cacheKey,
    { ttl, forceRefresh }
  );
}

/**
 * 缓存查找单个文档
 * @param {Object} Model - Mongoose模型
 * @param {Object} query - 查询条件
 * @param {Object} options - 选项
 * @returns {Promise<*>} 文档
 */
export async function cachedFindOne(Model, query, options = {}) {
  const { ttl = 5 * 60 * 1000, forceRefresh = false, populate = null } = options;
  const cacheKey = generateCacheKey(`findOne:${Model.modelName}`, { query, populate });

  return cachedQuery(async () => {
    let mongooseQuery = Model.findOne(query);
    if (populate) {
      mongooseQuery = mongooseQuery.populate(populate);
    }
    return await mongooseQuery.lean();
  }, cacheKey, { ttl, forceRefresh });
}

/**
 * 缓存查找ID
 * @param {Object} Model - Mongoose模型
 * @param {string} id - 文档ID
 * @param {Object} options - 选项
 * @returns {Promise<*>} 文档
 */
export async function cachedFindById(Model, id, options = {}) {
  const { ttl = 5 * 60 * 1000, forceRefresh = false, populate = null } = options;
  const cacheKey = generateCacheKey(`findById:${Model.modelName}`, { id, populate });

  return cachedQuery(async () => {
    let mongooseQuery = Model.findById(id);
    if (populate) {
      mongooseQuery = mongooseQuery.populate(populate);
    }
    return await mongooseQuery.lean();
  }, cacheKey, { ttl, forceRefresh });
}

/**
 * 使模型相关缓存失效
 * @param {string} modelName - 模型名称
 */
export async function invalidateModelCache(modelName) {
  const patterns = [
    `mongoose:${modelName}:*`,
    `count:${modelName}:*`,
    `findOne:${modelName}:*`,
    `findById:${modelName}:*`,
  ];

  let totalDeleted = 0;
  for (const pattern of patterns) {
    const deleted = await deleteCacheByPattern(pattern);
    totalDeleted += deleted;
  }

  info(`模型缓存已失效: ${modelName}，删除了 ${totalDeleted} 项`);
  return totalDeleted;
}

/**
 * 使特定文档缓存失效
 * @param {string} modelName - 模型名称
 * @param {string} id - 文档ID
 */
export async function invalidateDocumentCache(modelName, id) {
  const patterns = [
    `findById:${modelName}:*id="${id}"*`,
    `findOne:${modelName}:*`,
    `mongoose:${modelName}:*`,
  ];

  let totalDeleted = 0;
  for (const pattern of patterns) {
    const deleted = await deleteCacheByPattern(pattern);
    totalDeleted += deleted;
  }

  info(`文档缓存已失效: ${modelName}:${id}，删除了 ${totalDeleted} 项`);
  return totalDeleted;
}

