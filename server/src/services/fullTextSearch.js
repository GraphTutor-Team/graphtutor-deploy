/**
 * GraphTutor V3.0 - MongoDB全文搜索服务
 * 
 * 功能：使用MongoDB文本索引实现全文搜索
 */

import Question from '../models/Question.js';
import Note from '../models/Note.js';
import Discussion from '../models/Discussion.js';
import { sanitizeString } from '../middleware/validation.js';
import { info, warn } from '../utils/logger.js';

/**
 * 使用MongoDB文本搜索搜索题目
 * @param {string} query - 搜索关键词
 * @param {Object} filters - 筛选条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 搜索结果
 */
export async function fullTextSearchQuestions(query, filters = {}, options = {}) {
  const { page = 1, limit = 20, sort = 'relevance' } = options;
  const skip = (page - 1) * limit;

  // 清理搜索关键词
  const cleanQuery = sanitizeString(query, { maxLength: 100 });
  if (!cleanQuery || cleanQuery.trim().length === 0) {
    return [];
  }

  // 构建查询条件
  const searchCond = {
    $text: { $search: cleanQuery },
  };

  // 应用筛选条件
  if (filters.difficulty) {
    searchCond.difficulty = filters.difficulty;
  }
  if (filters.subjectCode) {
    searchCond.subjectCode = filters.subjectCode;
  }
  if (filters.bankId) {
    searchCond.bankId = filters.bankId;
  }
  if (filters.type) {
    searchCond.type = filters.type;
  }
  if (filters.tags && filters.tags.length > 0) {
    searchCond.tags = { $in: filters.tags };
  }

  try {
    // 使用文本搜索，按相关性排序
    const questions = await Question.find(searchCond, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();

    // 添加相关性分数
    return questions.map(q => ({
      ...q,
      _relevanceScore: q.score || 0,
    }));
  } catch (err) {
    // 如果文本索引不存在，降级到正则搜索
    if (err.code === 27 || err.message?.includes('text index')) {
      warn('文本索引不存在，使用正则搜索', { query: cleanQuery });
      return fallbackSearchQuestions(query, filters, options);
    }
    throw err;
  }
}

/**
 * 降级搜索（当文本索引不可用时）
 */
async function fallbackSearchQuestions(query, filters, options) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const searchCond = {};
  const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);

  if (queryWords.length > 0) {
    const searchRegex = queryWords.map(w => 
      sanitizeString(w, { maxLength: 50 })
    ).filter(Boolean);

    if (searchRegex.length > 0) {
      searchCond.$or = [
        { content: { $regex: searchRegex.join('|'), $options: 'i' } },
        { explain: { $regex: searchRegex.join('|'), $options: 'i' } },
        { tags: { $in: searchRegex } },
      ];
    }
  }

  // 应用筛选条件
  Object.assign(searchCond, filters);

  const questions = await Question.find(searchCond)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  return questions.map(q => ({
    ...q,
    _relevanceScore: 1,
  }));
}

/**
 * 使用MongoDB文本搜索搜索笔记
 * @param {string} query - 搜索关键词
 * @param {Object} filters - 筛选条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 搜索结果
 */
export async function fullTextSearchNotes(query, filters = {}, options = {}) {
  const { page = 1, limit = 20, userId = null } = options;
  const skip = (page - 1) * limit;

  const cleanQuery = sanitizeString(query, { maxLength: 100 });
  if (!cleanQuery || cleanQuery.trim().length === 0) {
    return [];
  }

  const searchCond = {
    $text: { $search: cleanQuery },
  };

  // 用户只能搜索自己的笔记或公开笔记
  if (userId) {
    searchCond.$or = [
      { userId },
      { isPublic: true },
    ];
  } else {
    searchCond.isPublic = true;
  }

  // 应用筛选条件
  if (filters.type) {
    searchCond.type = filters.type;
  }
  if (filters.tags && filters.tags.length > 0) {
    searchCond.tags = { $in: filters.tags };
  }
  if (filters.questionId) {
    searchCond.questionId = filters.questionId;
  }

  try {
    const notes = await Note.find(searchCond, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();

    return notes.map(n => ({
      ...n,
      _relevanceScore: n.score || 0,
    }));
  } catch (err) {
    if (err.code === 27 || err.message?.includes('text index')) {
      warn('文本索引不存在，使用正则搜索', { query: cleanQuery });
      return fallbackSearchNotes(query, filters, options);
    }
    throw err;
  }
}

/**
 * 降级搜索笔记
 */
async function fallbackSearchNotes(query, filters, options) {
  const { page = 1, limit = 20, userId = null } = options;
  const skip = (page - 1) * limit;

  const searchCond = {};
  const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);

  if (userId) {
    searchCond.$or = [
      { userId },
      { isPublic: true },
    ];
  } else {
    searchCond.isPublic = true;
  }

  if (queryWords.length > 0) {
    const searchRegex = queryWords.map(w => 
      sanitizeString(w, { maxLength: 50 })
    ).filter(Boolean);

    if (searchRegex.length > 0) {
      const textSearch = {
        $or: [
          { title: { $regex: searchRegex.join('|'), $options: 'i' } },
          { content: { $regex: searchRegex.join('|'), $options: 'i' } },
          { tags: { $in: searchRegex } },
        ],
      };

      if (searchCond.$or) {
        searchCond.$and = [
          { $or: searchCond.$or },
          textSearch,
        ];
        delete searchCond.$or;
      } else {
        Object.assign(searchCond, textSearch);
      }
    }
  }

  Object.assign(searchCond, filters);

  const notes = await Note.find(searchCond)
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

  return notes.map(n => ({
    ...n,
    _relevanceScore: 1,
  }));
}

/**
 * 使用MongoDB文本搜索搜索讨论
 * @param {string} query - 搜索关键词
 * @param {Object} filters - 筛选条件
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 搜索结果
 */
export async function fullTextSearchDiscussions(query, filters = {}, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const cleanQuery = sanitizeString(query, { maxLength: 100 });
  if (!cleanQuery || cleanQuery.trim().length === 0) {
    return [];
  }

  const searchCond = {
    $text: { $search: cleanQuery },
  };

  // 应用筛选条件
  if (filters.type) {
    searchCond.type = filters.type;
  }
  if (filters.tags && filters.tags.length > 0) {
    searchCond.tags = { $in: filters.tags };
  }
  if (filters.questionId) {
    searchCond.questionId = filters.questionId;
  }
  if (filters.isResolved !== undefined) {
    searchCond.isResolved = filters.isResolved;
  }

  try {
    const discussions = await Discussion.find(searchCond, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();

    return discussions.map(d => ({
      ...d,
      _relevanceScore: (d.score || 0) + (d.likeCount || 0) * 0.1 + (d.replyCount || 0) * 0.05,
    }));
  } catch (err) {
    if (err.code === 27 || err.message?.includes('text index')) {
      warn('文本索引不存在，使用正则搜索', { query: cleanQuery });
      return fallbackSearchDiscussions(query, filters, options);
    }
    throw err;
  }
}

/**
 * 降级搜索讨论
 */
async function fallbackSearchDiscussions(query, filters, options) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const searchCond = {};
  const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);

  if (queryWords.length > 0) {
    const searchRegex = queryWords.map(w => 
      sanitizeString(w, { maxLength: 50 })
    ).filter(Boolean);

    if (searchRegex.length > 0) {
      searchCond.$or = [
        { title: { $regex: searchRegex.join('|'), $options: 'i' } },
        { content: { $regex: searchRegex.join('|'), $options: 'i' } },
        { tags: { $in: searchRegex } },
      ];
    }
  }

  Object.assign(searchCond, filters);

  const discussions = await Discussion.find(searchCond)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  return discussions.map(d => ({
    ...d,
    _relevanceScore: 1,
  }));
}

/**
 * 统一全文搜索接口
 * @param {string} query - 搜索关键词
 * @param {Array<string>} types - 内容类型
 * @param {Object} filters - 筛选条件
 * @param {Object} options - 选项
 * @returns {Promise<Object>} 搜索结果
 */
export async function unifiedFullTextSearch(query, types = ['question', 'note', 'discussion'], filters = {}, options = {}) {
  const { page = 1, limit = 20, userId = null } = options;

  const results = {
    items: [],
    total: 0,
    page,
    limit,
    types: {
      question: { count: 0, items: [] },
      note: { count: 0, items: [] },
      discussion: { count: 0, items: [] },
    },
  };

  const searchPromises = [];

  // 搜索题目
  if (types.includes('question')) {
    searchPromises.push(
      fullTextSearchQuestions(query, filters, { page, limit, userId })
        .then(items => {
          results.types.question.items = items;
          results.types.question.count = items.length;
          items.forEach(item => {
            results.items.push({ ...item, _searchType: 'question' });
          });
        })
    );
  }

  // 搜索笔记
  if (types.includes('note')) {
    searchPromises.push(
      fullTextSearchNotes(query, filters, { page, limit, userId })
        .then(items => {
          results.types.note.items = items;
          results.types.note.count = items.length;
          items.forEach(item => {
            results.items.push({ ...item, _searchType: 'note' });
          });
        })
    );
  }

  // 搜索讨论
  if (types.includes('discussion')) {
    searchPromises.push(
      fullTextSearchDiscussions(query, filters, { page, limit })
        .then(items => {
          results.types.discussion.items = items;
          results.types.discussion.count = items.length;
          items.forEach(item => {
            results.items.push({ ...item, _searchType: 'discussion' });
          });
        })
    );
  }

  await Promise.all(searchPromises);

  // 按相关性排序
  results.items.sort((a, b) => {
    const scoreA = a._relevanceScore || 0;
    const scoreB = b._relevanceScore || 0;
    return scoreB - scoreA;
  });

  // 移除内部字段
  results.items = results.items.map(item => {
    const { _relevanceScore, _searchType, score, ...rest } = item;
    return rest;
  });

  results.total = results.items.length;

  info('全文搜索完成', {
    query,
    types,
    total: results.total,
  });

  return results;
}

/**
 * 检查文本索引是否存在
 * @param {string} modelName - 模型名称
 * @returns {Promise<boolean>} 是否存在文本索引
 */
export async function checkTextIndexExists(modelName) {
  try {
    let Model;
    switch (modelName) {
      case 'Question':
        Model = Question;
        break;
      case 'Note':
        Model = Note;
        break;
      case 'Discussion':
        Model = Discussion;
        break;
      default:
        return false;
    }

    const indexes = await Model.collection.getIndexes();
    return Object.values(indexes).some(index => 
      index.textIndexVersion !== undefined
    );
  } catch (err) {
    warn('检查文本索引失败', { modelName, error: err.message });
    return false;
  }
}

/**
 * 创建文本索引（如果不存在）
 * @param {string} modelName - 模型名称
 * @returns {Promise<boolean>} 是否成功创建
 */
export async function ensureTextIndex(modelName) {
  try {
    let Model;
    let indexDefinition;

    switch (modelName) {
      case 'Question':
        Model = Question;
        indexDefinition = {
          content: 'text',
          explain: 'text',
          tags: 'text',
          qid: 'text',
          id: 'text',
        };
        break;
      case 'Note':
        Model = Note;
        indexDefinition = {
          title: 'text',
          content: 'text',
          tags: 'text',
        };
        break;
      case 'Discussion':
        Model = Discussion;
        indexDefinition = {
          title: 'text',
          content: 'text',
          tags: 'text',
        };
        break;
      default:
        return false;
    }

    const exists = await checkTextIndexExists(modelName);
    if (exists) {
      info(`文本索引已存在: ${modelName}`);
      return true;
    }

    await Model.collection.createIndex(indexDefinition, {
      name: `${modelName.toLowerCase()}_text_index`,
    });

    info(`文本索引创建成功: ${modelName}`);
    return true;
  } catch (err) {
    warn('创建文本索引失败', { modelName, error: err.message });
    return false;
  }
}

