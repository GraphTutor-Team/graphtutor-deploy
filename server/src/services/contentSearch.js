/**
 * GraphTutor V3.0 - 统一内容搜索服务
 * 
 * 功能：提供统一的内容搜索接口，支持题目、笔记、讨论等
 */

import Question from '../models/Question.js';
import Note from '../models/Note.js';
import Discussion from '../models/Discussion.js';
import { sanitizeString } from '../middleware/validation.js';
import { info, warn } from '../utils/logger.js';
import { 
  unifiedFullTextSearch,
  fullTextSearchQuestions,
  fullTextSearchNotes,
  fullTextSearchDiscussions,
} from './fullTextSearch.js';

/**
 * 搜索选项
 */
export class SearchOptions {
  constructor(options = {}) {
    this.query = options.query || '';
    this.types = options.types || ['question', 'note', 'discussion'];
    this.page = options.page || 1;
    this.limit = options.limit || 20;
    this.sort = options.sort || 'relevance'; // relevance, date, popularity
    this.filters = options.filters || {};
    this.userId = options.userId || null;
  }
}

/**
 * 搜索结果
 */
export class SearchResult {
  constructor() {
    this.items = [];
    this.total = 0;
    this.page = 1;
    this.limit = 20;
    this.totalPages = 1;
    this.types = {
      question: { count: 0, items: [] },
      note: { count: 0, items: [] },
      discussion: { count: 0, items: [] },
    };
  }

  addItem(item, type) {
    this.items.push({ ...item, _searchType: type });
    if (this.types[type]) {
      this.types[type].items.push(item);
      this.types[type].count++;
    }
    this.total++;
  }

  finalize() {
    this.totalPages = Math.ceil(this.total / this.limit);
    // 按相关性排序
    this.items.sort((a, b) => {
      const scoreA = a._relevanceScore || 0;
      const scoreB = b._relevanceScore || 0;
      return scoreB - scoreA;
    });
    // 移除内部字段
    this.items = this.items.map(item => {
      const { _relevanceScore, _searchType, ...rest } = item;
      return rest;
    });
  }
}

/**
 * 计算文本相关性分数
 * @param {string} text - 文本内容
 * @param {string} query - 搜索关键词
 * @returns {number} 相关性分数
 */
function calculateRelevanceScore(text, query) {
  if (!text || !query) return 0;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

  let score = 0;

  // 完全匹配
  if (textLower.includes(queryLower)) {
    score += 100;
  }

  // 单词匹配
  for (const word of queryWords) {
    const wordCount = (textLower.match(new RegExp(word, 'g')) || []).length;
    score += wordCount * 10;
  }

  // 位置权重（标题中的匹配权重更高）
  if (textLower.startsWith(queryLower)) {
    score += 50;
  }

  return score;
}

/**
 * 搜索题目（优先使用全文搜索）
 * @param {string} query - 搜索关键词
 * @param {Object} filters - 筛选条件
 * @param {Object} options - 选项
 * @param {boolean} useFullText - 是否使用全文搜索（默认true）
 * @returns {Promise<Array>} 搜索结果
 */
async function searchQuestions(query, filters = {}, options = {}, useFullText = true) {
  // 优先使用全文搜索
  if (useFullText && query && query.trim().length > 0) {
    try {
      return await fullTextSearchQuestions(query, filters, options);
    } catch (err) {
      warn('全文搜索失败，降级到正则搜索', { error: err.message });
    }
  }
  
  // 降级到正则搜索
  const { page = 1, limit = 20, userId = null } = options;
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
        { qid: { $regex: searchRegex.join('|'), $options: 'i' } },
        { tags: { $in: searchRegex } },
      ];
    }
  }

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

  const questions = await Question.find(searchCond)
    .skip(skip)
    .limit(limit)
    .lean();

  // 计算相关性分数
  return questions.map(q => ({
    ...q,
    _relevanceScore: calculateRelevanceScore(
      `${q.content} ${q.explain || ''} ${(q.tags || []).join(' ')}`,
      query
    ),
  }));
}

/**
 * 搜索笔记（优先使用全文搜索）
 * @param {string} query - 搜索关键词
 * @param {Object} filters - 筛选条件
 * @param {Object} options - 选项
 * @param {boolean} useFullText - 是否使用全文搜索（默认true）
 * @returns {Promise<Array>} 搜索结果
 */
async function searchNotes(query, filters = {}, options = {}, useFullText = true) {
  // 优先使用全文搜索
  if (useFullText && query && query.trim().length > 0) {
    try {
      return await fullTextSearchNotes(query, filters, options);
    } catch (err) {
      warn('全文搜索失败，降级到正则搜索', { error: err.message });
    }
  }
  
  // 降级到正则搜索
  const { page = 1, limit = 20, userId = null } = options;
  const skip = (page - 1) * limit;

  const searchCond = {};

  // 用户只能搜索自己的笔记或公开笔记
  if (userId) {
    searchCond.$or = [
      { userId },
      { isPublic: true },
    ];
  } else {
    searchCond.isPublic = true;
  }

  const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);

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

  const notes = await Note.find(searchCond)
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 })
    .lean();

  // 计算相关性分数
  return notes.map(n => ({
    ...n,
    _relevanceScore: calculateRelevanceScore(
      `${n.title} ${n.content}`,
      query
    ),
  }));
}

/**
 * 搜索讨论（优先使用全文搜索）
 * @param {string} query - 搜索关键词
 * @param {Object} filters - 筛选条件
 * @param {Object} options - 选项
 * @param {boolean} useFullText - 是否使用全文搜索（默认true）
 * @returns {Promise<Array>} 搜索结果
 */
async function searchDiscussions(query, filters = {}, options = {}, useFullText = true) {
  // 优先使用全文搜索
  if (useFullText && query && query.trim().length > 0) {
    try {
      return await fullTextSearchDiscussions(query, filters, options);
    } catch (err) {
      warn('全文搜索失败，降级到正则搜索', { error: err.message });
    }
  }
  
  // 降级到正则搜索
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

  const discussions = await Discussion.find(searchCond)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  // 计算相关性分数（考虑点赞数和回复数）
  return discussions.map(d => ({
    ...d,
    _relevanceScore: calculateRelevanceScore(
      `${d.title} ${d.content}`,
      query
    ) + (d.likeCount || 0) * 0.1 + (d.replyCount || 0) * 0.05,
  }));
}

/**
 * 统一搜索接口（支持全文搜索）
 * @param {SearchOptions} options - 搜索选项
 * @param {boolean} useFullText - 是否使用全文搜索（默认true）
 * @returns {Promise<SearchResult>} 搜索结果
 */
export async function unifiedSearch(options, useFullText = true) {
  const searchOptions = options instanceof SearchOptions ? options : new SearchOptions(options);
  
  // 如果启用全文搜索且有搜索关键词，使用全文搜索
  if (useFullText && searchOptions.query && searchOptions.query.trim().length > 0) {
    try {
      const fullTextResult = await unifiedFullTextSearch(
        searchOptions.query,
        searchOptions.types,
        searchOptions.filters,
        {
          page: searchOptions.page,
          limit: searchOptions.limit,
          userId: searchOptions.userId,
        }
      );

      // 转换为SearchResult格式
      const result = new SearchResult();
      result.page = fullTextResult.page;
      result.limit = fullTextResult.limit;
      result.total = fullTextResult.total;
      result.types = fullTextResult.types;
      result.items = fullTextResult.items.map(item => ({
        ...item,
        _relevanceScore: item._relevanceScore || 0,
      }));
      result.finalize();
      return result;
    } catch (err) {
      warn('全文搜索失败，降级到正则搜索', { error: err.message });
    }
  }

  // 降级到正则搜索
  const result = new SearchResult();
  result.page = searchOptions.page;
  result.limit = searchOptions.limit;

  const searchPromises = [];

  // 搜索题目
  if (searchOptions.types.includes('question')) {
    searchPromises.push(
      searchQuestions(searchOptions.query, searchOptions.filters, {
        page: searchOptions.page,
        limit: searchOptions.limit,
        userId: searchOptions.userId,
      }, useFullText).then(items => {
        items.forEach(item => result.addItem(item, 'question'));
      })
    );
  }

  // 搜索笔记
  if (searchOptions.types.includes('note')) {
    searchPromises.push(
      searchNotes(searchOptions.query, searchOptions.filters, {
        page: searchOptions.page,
        limit: searchOptions.limit,
        userId: searchOptions.userId,
      }, useFullText).then(items => {
        items.forEach(item => result.addItem(item, 'note'));
      })
    );
  }

  // 搜索讨论
  if (searchOptions.types.includes('discussion')) {
    searchPromises.push(
      searchDiscussions(searchOptions.query, searchOptions.filters, {
        page: searchOptions.page,
        limit: searchOptions.limit,
      }, useFullText).then(items => {
        items.forEach(item => result.addItem(item, 'discussion'));
      })
    );
  }

  await Promise.all(searchPromises);

  result.finalize();

  info('统一搜索完成', {
    query: searchOptions.query,
    types: searchOptions.types,
    total: result.total,
  });

  return result;
}

/**
 * 高级搜索（支持复杂查询）
 * @param {Object} query - 查询对象
 * @param {Object} options - 选项
 * @returns {Promise<SearchResult>} 搜索结果
 */
export async function advancedSearch(query, options = {}) {
  const {
    text = '',
    types = ['question', 'note', 'discussion'],
    filters = {},
    page = 1,
    limit = 20,
    sort = 'relevance',
    userId = null,
  } = query;

  const searchOptions = new SearchOptions({
    query: text,
    types,
    filters,
    page,
    limit,
    sort,
    userId,
  });

  return unifiedSearch(searchOptions);
}

/**
 * 快速搜索（返回前N个结果）
 * @param {string} query - 搜索关键词
 * @param {Object} options - 选项
 * @returns {Promise<Object>} 快速搜索结果
 */
export async function quickSearch(query, options = {}) {
  const {
    limit = 5,
    types = ['question', 'note', 'discussion'],
    userId = null,
  } = options;

  const searchOptions = new SearchOptions({
    query,
    types,
    page: 1,
    limit,
    userId,
  });

  const result = await unifiedSearch(searchOptions);

  return {
    query,
    total: result.total,
    items: result.items.slice(0, limit),
    types: result.types,
  };
}

