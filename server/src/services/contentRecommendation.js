/**
 * GraphTutor V3.0 - 内容推荐服务
 * 
 * 功能：基于用户行为和内容特征提供智能推荐
 */

import Question from '../models/Question.js';
import Note from '../models/Note.js';
import Discussion from '../models/Discussion.js';
import Record from '../models/Record.js';
import WrongQuestion from '../models/WrongQuestion.js';
import { info } from '../utils/logger.js';

/**
 * 推荐选项
 */
export class RecommendationOptions {
  constructor(options = {}) {
    this.userId = options.userId || null;
    this.type = options.type || 'question'; // question, note, discussion
    this.limit = options.limit || 10;
    this.filters = options.filters || {};
  }
}

/**
 * 基于用户错题推荐相似题目
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的题目
 */
export async function recommendQuestionsFromWrong(userId, options = {}) {
  const { limit = 10 } = options;

  try {
    // 获取用户的错题
    const wrongQuestions = await WrongQuestion.find({ userId })
      .sort({ wrongCount: -1 })
      .limit(20)
      .lean();

    if (wrongQuestions.length === 0) {
      return [];
    }

    const questionIds = wrongQuestions.map(wq => wq.questionId);
    const wrongQuestionsData = await Question.find({
      _id: { $in: questionIds },
    }).lean();

    // 提取知识点和标签
    const knowledgeNodes = new Set();
    const tags = new Set();
    const difficulties = [];

    wrongQuestionsData.forEach(q => {
      if (q.knowledgeNodeId) knowledgeNodes.add(q.knowledgeNodeId);
      if (q.tags) q.tags.forEach(t => tags.add(t));
      if (q.difficulty) difficulties.push(q.difficulty);
    });

    // 计算平均难度
    const avgDifficulty = difficulties.length > 0
      ? Math.round(difficulties.reduce((a, b) => a + b, 0) / difficulties.length)
      : 3;

    // 查找相似题目（排除已做错的）
    const recommendations = await Question.find({
      _id: { $nin: questionIds },
      $or: [
        { knowledgeNodeId: { $in: Array.from(knowledgeNodes) } },
        { tags: { $in: Array.from(tags) } },
        { difficulty: { $gte: avgDifficulty - 1, $lte: avgDifficulty + 1 } },
      ],
    })
      .limit(limit * 2)
      .lean();

    // 按相关性排序
    const scored = recommendations.map(q => {
      let score = 0;
      if (q.knowledgeNodeId && knowledgeNodes.has(q.knowledgeNodeId)) score += 3;
      if (q.tags && q.tags.some(t => tags.has(t))) score += 2;
      if (Math.abs(q.difficulty - avgDifficulty) <= 1) score += 1;
      return { ...q, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    const result = scored.slice(0, limit).map(({ _score, ...rest }) => rest);

    info('基于错题推荐题目', {
      userId,
      wrongCount: wrongQuestions.length,
      recommendedCount: result.length,
    });

    return result;
  } catch (err) {
    console.error('推荐题目失败:', err);
    return [];
  }
}

/**
 * 基于学习记录推荐题目
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的题目
 */
export async function recommendQuestionsFromHistory(userId, options = {}) {
  const { limit = 10 } = options;

  try {
    // 获取用户最近的学习记录
    const recentRecords = await Record.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (recentRecords.length === 0) {
      return [];
    }

    const questionIds = recentRecords.map(r => r.questionId);
    const recentQuestions = await Question.find({
      _id: { $in: questionIds },
    }).lean();

    // 提取知识点
    const knowledgeNodes = new Set();
    recentQuestions.forEach(q => {
      if (q.knowledgeNodeId) knowledgeNodes.add(q.knowledgeNodeId);
    });

    // 推荐相同知识点的其他题目
    const recommendations = await Question.find({
      _id: { $nin: questionIds },
      knowledgeNodeId: { $in: Array.from(knowledgeNodes) },
    })
      .limit(limit)
      .lean();

    info('基于学习历史推荐题目', {
      userId,
      recordCount: recentRecords.length,
      recommendedCount: recommendations.length,
    });

    return recommendations;
  } catch (err) {
    console.error('推荐题目失败:', err);
    return [];
  }
}

/**
 * 推荐热门内容
 * @param {string} type - 内容类型
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的内容
 */
export async function recommendPopularContent(type, options = {}) {
  const { limit = 10, filters = {} } = options;

  try {
    let Model;
    let sortField;

    switch (type) {
      case 'question':
        Model = Question;
        sortField = { createdAt: -1 }; // 可以改为基于答题次数
        break;
      case 'note':
        Model = Note;
        sortField = { viewCount: -1, updatedAt: -1 };
        break;
      case 'discussion':
        Model = Discussion;
        sortField = { likeCount: -1, replyCount: -1, createdAt: -1 };
        break;
      default:
        return [];
    }

    const query = {};
    if (filters.subjectCode) query.subjectCode = filters.subjectCode;
    if (filters.bankId) query.bankId = filters.bankId;
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    const items = await Model.find(query)
      .sort(sortField)
      .limit(limit)
      .lean();

    info('推荐热门内容', {
      type,
      count: items.length,
    });

    return items;
  } catch (err) {
    console.error('推荐热门内容失败:', err);
    return [];
  }
}

/**
 * 推荐相关笔记
 * @param {string} noteId - 笔记ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的笔记
 */
export async function recommendRelatedNotes(noteId, options = {}) {
  const { limit = 5, userId = null } = options;

  try {
    const note = await Note.findById(noteId).lean();
    if (!note) {
      return [];
    }

    const query = {
      _id: { $ne: noteId },
    };

    // 用户只能看到自己的笔记或公开笔记
    if (userId) {
      query.$or = [
        { userId },
        { isPublic: true },
      ];
    } else {
      query.isPublic = true;
    }

    // 基于标签和类型推荐
    const orConditions = [];
    if (note.tags && note.tags.length > 0) {
      orConditions.push({ tags: { $in: note.tags } });
    }
    if (note.type) {
      orConditions.push({ type: note.type });
    }
    if (note.questionId) {
      orConditions.push({ questionId: note.questionId });
    }
    if (note.knowledgeNodeId) {
      orConditions.push({ knowledgeNodeId: note.knowledgeNodeId });
    }

    if (orConditions.length > 0) {
      query.$or = query.$or 
        ? [...query.$or, ...orConditions]
        : [{ $or: orConditions }];
    }

    const notes = await Note.find(query)
      .limit(limit * 2)
      .lean();

    // 按相关性排序
    const scored = notes.map(n => {
      let score = 0;
      if (n.tags && note.tags && n.tags.some(t => note.tags.includes(t))) score += 2;
      if (n.type === note.type) score += 1;
      if (n.questionId === note.questionId) score += 3;
      if (n.knowledgeNodeId === note.knowledgeNodeId) score += 2;
      return { ...n, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    return scored.slice(0, limit).map(({ _score, ...rest }) => rest);
  } catch (err) {
    console.error('推荐相关笔记失败:', err);
    return [];
  }
}

/**
 * 统一推荐接口
 * @param {RecommendationOptions} options - 推荐选项
 * @returns {Promise<Array>} 推荐结果
 */
export async function unifiedRecommendation(options) {
  const recOptions = options instanceof RecommendationOptions
    ? options
    : new RecommendationOptions(options);

  switch (recOptions.type) {
    case 'question':
      if (recOptions.userId) {
        // 优先基于错题推荐
        const wrongBased = await recommendQuestionsFromWrong(
          recOptions.userId,
          { limit: recOptions.limit }
        );
        if (wrongBased.length >= recOptions.limit) {
          return wrongBased;
        }
        // 补充基于历史推荐
        const historyBased = await recommendQuestionsFromHistory(
          recOptions.userId,
          { limit: recOptions.limit - wrongBased.length }
        );
        return [...wrongBased, ...historyBased];
      } else {
        return recommendPopularContent('question', {
          limit: recOptions.limit,
          filters: recOptions.filters,
        });
      }

    case 'note':
      if (recOptions.filters.noteId) {
        return recommendRelatedNotes(recOptions.filters.noteId, {
          limit: recOptions.limit,
          userId: recOptions.userId,
        });
      } else {
        return recommendPopularContent('note', {
          limit: recOptions.limit,
          filters: recOptions.filters,
        });
      }

    case 'discussion':
      return recommendPopularContent('discussion', {
        limit: recOptions.limit,
        filters: recOptions.filters,
      });

    default:
      return [];
  }
}

