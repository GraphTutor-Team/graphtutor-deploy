/**
 * GraphTutor V3.0 - 题目查询服务
 * 
 * 功能：提供高级题目查询和筛选功能，集成缓存优化性能
 */

import Question from '../models/Question.js';
import { attachSubjectNames } from './subjectNames.js';
import { sanitizeString, validateInt } from '../middleware/validation.js';
import { cachedQuery, cachedCount, cachedMongooseQuery, invalidateModelCache, invalidateDocumentCache } from './queryCache.js';
import { generateCacheKey } from '../utils/cache.js';

/**
 * 构建题目查询条件
 * @param {Object} params - 查询参数
 * @returns {Object} MongoDB查询条件
 */
export function buildQuestionQuery(params) {
  const {
    subjectCode,
    bankId,
    difficulty,
    knowledgeNodeId,
    status,
    search,
    managerId,
    tags,
    source,
    type,
    groupId,
  } = params;

  const cond = {};

  // 学科代码筛选
  if (subjectCode) {
    cond.subjectCode = subjectCode;
  }

  // 题库筛选
  if (bankId) {
    cond.bankId = bankId;
  }

  // 难度筛选（支持单个值或范围）
  if (difficulty !== undefined) {
    if (Array.isArray(difficulty) && difficulty.length === 2) {
      // 范围：[1, 5]
      cond.difficulty = {
        $gte: difficulty[0],
        $lte: difficulty[1],
      };
    } else {
      // 单个值
      const diffNum = validateInt(difficulty, {
        min: 1,
        max: 5,
        defaultValue: null,
      });
      if (diffNum !== null) {
        cond.difficulty = diffNum;
      }
    }
  }

  // 知识点筛选
  if (knowledgeNodeId) {
    cond.knowledgeNodeId = sanitizeString(knowledgeNodeId, {
      maxLength: 100,
    });
  }

  // 状态筛选（如果有状态字段）
  if (status) {
    cond.status = status;
  }

  // 负责人筛选
  if (managerId) {
    cond.managerId = managerId;
  }

  // 题型筛选
  if (type) {
    cond.type = type;
  }

  // 标签筛选（支持多个标签，逗号分隔或数组）
  if (tags) {
    let tagArray = [];
    if (Array.isArray(tags)) {
      tagArray = tags;
    } else if (typeof tags === 'string') {
      tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
    }
    if (tagArray.length > 0) {
      cond.tags = { $in: tagArray };
    }
  }

  // 来源筛选
  if (source) {
    cond.source = source;
  }

  // 群组筛选
  if (groupId) {
    cond.groupId = groupId;
  }

  // 关键词搜索（题干内容、解析、标签、题目ID）
  if (search) {
    const searchRegex = new RegExp(
      sanitizeString(search, { maxLength: 100 }),
      'i'
    );
    cond.$or = [
      ...(cond.$or || []),
      { content: searchRegex },
      { explain: searchRegex },
      { qid: searchRegex },
      { id: searchRegex },
      { tags: { $in: [searchRegex] } },
    ];
  }

  return cond;
}

/**
 * 查询题目列表（带缓存优化）
 * @param {Object} params - 查询参数
 * @param {Object} options - 选项（分页、排序等）
 * @param {boolean} options.useCache - 是否使用缓存（默认true）
 * @param {number} options.cacheTTL - 缓存过期时间（毫秒，默认5分钟）
 * @param {boolean} options.forceRefresh - 是否强制刷新缓存（默认false）
 * @returns {Promise<Object>} 查询结果
 */
export async function queryQuestions(params = {}, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt', // 默认按创建时间倒序
      populate = true,
      useCache = true,
      cacheTTL = 5 * 60 * 1000, // 默认5分钟
      forceRefresh = false,
    } = options;

    // 构建查询条件
    const cond = buildQuestionQuery(params);

    // 分页参数
    const pageNum = validateInt(page, { min: 1, defaultValue: 1 });
    const limitNum = validateInt(limit, { min: 1, max: 100, defaultValue: 20 });
    const skip = (pageNum - 1) * limitNum;

    // 构建排序
    let sortObj = {};
    if (sort) {
      const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      sortObj[sortField] = sortOrder;
    }

    // 生成缓存键
    const cacheKey = generateCacheKey('questions:query', {
      cond,
      page: pageNum,
      limit: limitNum,
      sort: sortObj,
      populate,
    });

    // 如果使用缓存，先检查缓存
    if (useCache && !forceRefresh) {
      const cached = await cachedQuery(
        async () => {
          // 构建查询
          let query = Question.find(cond).sort(sortObj).skip(skip).limit(limitNum);

          // 是否填充关联字段
          if (populate) {
            query = query
              .populate('bankId', 'name subjectCode')
              .populate('managerId', 'name email');
          }

          // 执行查询
          const [rawItems, total] = await Promise.all([
            query.lean(),
            Question.countDocuments(cond),
          ]);
          const items = populate ? await attachSubjectNames(rawItems) : rawItems;

          return {
            items,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          };
        },
        cacheKey,
        { ttl: cacheTTL, forceRefresh: false }
      );

      if (cached) {
        return cached;
      }
    }

    // 构建查询（不使用缓存或缓存未命中）
    let query = Question.find(cond).sort(sortObj).skip(skip).limit(limitNum);

    // 优化：只选择需要的字段
    query = query.select('content options answer difficulty type tags explain knowledgeNodeId subjectCode bankId managerId qid id createdAt');

    // 是否填充关联字段
    if (populate) {
      query = query
        .populate('bankId', 'name subjectCode')
        .populate('managerId', 'name email');
    }

    // 执行查询（使用并行查询优化）
    const [rawItems, total] = await Promise.all([
      query.lean(),
      // 优化：使用缓存的计数查询
      useCache
        ? cachedCount(Question, cond, { ttl: cacheTTL, forceRefresh })
        : Question.countDocuments(cond),
    ]);

    const items = populate ? await attachSubjectNames(rawItems) : rawItems;
    const result = {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };

    // 缓存结果
    if (useCache) {
      const { setCache } = await import('../utils/cache.js');
      setCache(cacheKey, result, cacheTTL);
    }

    return result;
  } catch (error) {
    console.error('queryQuestions error:', error);
    throw error;
  }
}

/**
 * 获取题目统计信息（带缓存优化）
 * @param {Object} params - 查询参数（用于筛选）
 * @param {Object} options - 选项
 * @param {boolean} options.useCache - 是否使用缓存（默认true）
 * @param {number} options.cacheTTL - 缓存过期时间（毫秒，默认10分钟）
 * @param {boolean} options.forceRefresh - 是否强制刷新缓存（默认false）
 * @returns {Promise<Object>} 统计信息
 */
export async function getQuestionStats(params = {}, options = {}) {
  try {
    const {
      useCache = true,
      cacheTTL = 10 * 60 * 1000, // 默认10分钟（统计数据变化较慢）
      forceRefresh = false,
    } = options;

    const cond = buildQuestionQuery(params);

    // 生成缓存键
    const cacheKey = generateCacheKey('questions:stats', { cond });

    // 如果使用缓存，先检查缓存
    if (useCache && !forceRefresh) {
      const cached = await cachedQuery(
        async () => {
          // 按难度统计（使用并行查询优化）
          const [difficultyStats, subjectStats, sourceStats, total] = await Promise.all([
            Question.aggregate([
              { $match: cond },
              {
                $group: {
                  _id: '$difficulty',
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ]),
            Question.aggregate([
              { $match: { ...cond, subjectCode: { $exists: true, $ne: null } } },
              {
                $group: {
                  _id: '$subjectCode',
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
            ]),
            Question.aggregate([
              { $match: cond },
              {
                $group: {
                  _id: '$source',
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
            ]),
            Question.countDocuments(cond),
          ]);

          return {
            total,
            byDifficulty: difficultyStats.map((s) => ({
              difficulty: s._id,
              count: s.count,
            })),
            bySubject: subjectStats.map((s) => ({
              subjectCode: s._id,
              count: s.count,
            })),
            bySource: sourceStats.map((s) => ({
              source: s._id,
              count: s.count,
            })),
          };
        },
        cacheKey,
        { ttl: cacheTTL, forceRefresh: false }
      );

      if (cached) {
        return cached;
      }
    }

    // 执行统计查询（使用并行查询优化）
    const [difficultyStats, subjectStats, sourceStats, total] = await Promise.all([
      Question.aggregate([
        { $match: cond },
        {
          $group: {
            _id: '$difficulty',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Question.aggregate([
        { $match: { ...cond, subjectCode: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$subjectCode',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Question.aggregate([
        { $match: cond },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Question.countDocuments(cond),
    ]);

    const result = {
      total,
      byDifficulty: difficultyStats.map((s) => ({
        difficulty: s._id,
        count: s.count,
      })),
      bySubject: subjectStats.map((s) => ({
        subjectCode: s._id,
        count: s.count,
      })),
      bySource: sourceStats.map((s) => ({
        source: s._id,
        count: s.count,
      })),
    };

    // 缓存结果
    if (useCache) {
      const { setCache } = await import('../utils/cache.js');
      setCache(cacheKey, result, cacheTTL);
    }

    return result;
  } catch (error) {
    console.error('getQuestionStats error:', error);
    throw error;
  }
}

/**
 * 查找相似题目（带缓存优化）
 * @param {string} questionId - 题目ID
 * @param {Object} options - 选项
 * @param {boolean} options.useCache - 是否使用缓存（默认true）
 * @param {number} options.cacheTTL - 缓存过期时间（毫秒，默认5分钟）
 * @returns {Promise<Array>} 相似题目列表
 */
export async function findSimilarQuestions(questionId, options = {}) {
  try {
    const {
      limit = 5,
      useCache = true,
      cacheTTL = 5 * 60 * 1000,
    } = options;

    // 生成缓存键
    const cacheKey = generateCacheKey('questions:similar', { questionId, limit });

    // 如果使用缓存，先检查缓存
    if (useCache) {
      const cached = await cachedQuery(
        async () => {
          // 获取原题目
          const question = await Question.findById(questionId).lean();
          if (!question) {
            throw new Error('题目不存在');
          }

          // 构建相似度查询条件
          const cond = {
            _id: { $ne: questionId }, // 排除自己
          };

          // 相同学科
          if (question.subjectCode) {
            cond.subjectCode = question.subjectCode;
          }

          // 相同知识点
          if (question.knowledgeNodeId) {
            cond.knowledgeNodeId = question.knowledgeNodeId;
          }

          // 相似难度（±1）
          if (question.difficulty) {
            cond.difficulty = {
              $gte: Math.max(1, question.difficulty - 1),
              $lte: Math.min(5, question.difficulty + 1),
            };
          }

          // 查询相似题目（优化：只选择需要的字段）
          const similar = await Question.find(cond)
            .limit(limit)
            .select('content difficulty subjectCode tags qid id')
            .lean();

          return similar;
        },
        cacheKey,
        { ttl: cacheTTL, forceRefresh: false }
      );

      if (cached) {
        return cached;
      }
    }

    // 获取原题目
    const question = await Question.findById(questionId).lean();
    if (!question) {
      throw new Error('题目不存在');
    }

    // 构建相似度查询条件
    const cond = {
      _id: { $ne: questionId }, // 排除自己
    };

    // 相同学科
    if (question.subjectCode) {
      cond.subjectCode = question.subjectCode;
    }

    // 相同知识点
    if (question.knowledgeNodeId) {
      cond.knowledgeNodeId = question.knowledgeNodeId;
    }

    // 相似难度（±1）
    if (question.difficulty) {
      cond.difficulty = {
        $gte: Math.max(1, question.difficulty - 1),
        $lte: Math.min(5, question.difficulty + 1),
      };
    }

    // 查询相似题目（优化：只选择需要的字段）
    const similar = await Question.find(cond)
      .limit(limit)
      .select('content difficulty subjectCode tags qid id')
      .lean();

    // 缓存结果
    if (useCache) {
      const { setCache } = await import('../utils/cache.js');
      setCache(cacheKey, similar, cacheTTL);
    }

    return similar;
  } catch (error) {
    console.error('findSimilarQuestions error:', error);
    throw error;
  }
}

/**
 * 使题目查询缓存失效
 * @param {string} questionId - 题目ID（可选，如果提供则只失效该题目的缓存）
 */
export async function invalidateQuestionCache(questionId = null) {
  const { deleteCacheByPattern } = await import('../utils/cache.js');
  
  if (questionId) {
    // 失效特定题目的缓存
    invalidateDocumentCache('Question', questionId);
    // 失效相似题目缓存
    deleteCacheByPattern(`questions:similar:*questionId="${questionId}"*`);
  } else {
    // 失效所有题目查询缓存
    invalidateModelCache('Question');
    deleteCacheByPattern('questions:*');
  }
}

