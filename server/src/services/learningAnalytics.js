/**
 * GraphTutor V3.0 - 学习分析服务
 * 
 * 功能：提供用户学习数据的深度分析，包括知识点掌握度、学习趋势等
 */

import Record from '../models/Record.js';
import Question from '../models/Question.js';
import KnowledgeNode from '../models/KnowledgeNode.js';

/**
 * 获取用户知识点掌握度详细分析
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项 { days, subjectCode, minQuestions }
 * @returns {Promise<Object>} 知识点掌握度数据
 */
export async function getKnowledgeMastery(userId, options = {}) {
  try {
    const { days = 30, subjectCode, minQuestions = 3 } = options;
    
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 构建匹配条件
    const match = {
      userId,
      createdAt: { $gte: since },
    };

    // 如果指定了学科，需要通过题目关联查询
    let questionMatch = {};
    if (subjectCode) {
      questionMatch.subjectCode = subjectCode;
    }

    // 按知识点统计
    const nodeStats = await Record.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
      ...(subjectCode ? [{ $match: { 'question.subjectCode': subjectCode } }] : []),
      {
        $group: {
          _id: '$knowledgeNodeId',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          wrong: { $sum: { $cond: ['$isCorrect', 0, 1] } },
          avgTimeSpent: { $avg: '$timeSpentMs' },
          lastPractice: { $max: '$createdAt' },
        },
      },
      {
        $project: {
          _id: 0,
          knowledgeNodeId: '$_id',
          total: 1,
          correct: 1,
          wrong: 1,
          accuracy: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
          avgTimeSpent: { $ifNull: ['$avgTimeSpent', 0] },
          lastPractice: 1,
        },
      },
      { $match: { total: { $gte: minQuestions } } },
      { $sort: { accuracy: 1, total: -1 } }, // 正确率从低到高，找出薄弱点
    ]);

    const nodeKeys = nodeStats.map((node) => node.knowledgeNodeId).filter(Boolean).map(String);
    const namedNodes = nodeKeys.length
      ? await KnowledgeNode.find({ key: { $in: nodeKeys } }).select('key name').lean()
      : [];
    const nameByKey = new Map(namedNodes.map((node) => [String(node.key), node.name || '']));
    const knowledgeNodes = nodeStats.map((node) => ({
      ...node,
      name: nameByKey.get(String(node.knowledgeNodeId || '')) || '',
    }));

    // 按学科统计知识点掌握度
    const subjectStats = await Record.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$question.subjectCode',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          knowledgeNodes: { $addToSet: '$knowledgeNodeId' },
        },
      },
      {
        $project: {
          _id: 0,
          subjectCode: '$_id',
          total: 1,
          correct: 1,
          accuracy: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
          knowledgeNodeCount: { $size: '$knowledgeNodes' },
        },
      },
      { $match: { subjectCode: { $ne: null } } },
      { $sort: { accuracy: 1 } },
    ]);

    // 按难度统计掌握度
    const difficultyStats = await Record.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$question.difficulty',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          difficulty: '$_id',
          total: 1,
          correct: 1,
          accuracy: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $match: { difficulty: { $ne: null } } },
      { $sort: { difficulty: 1 } },
    ]);

    // 按题型统计掌握度
    const typeStats = await Record.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$question.type',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          total: 1,
          correct: 1,
          accuracy: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $match: { type: { $ne: null } } },
      { $sort: { total: -1 } },
    ]);

    // 计算总体统计
    const overallStats = await Record.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          avgTimeSpent: { $avg: '$timeSpentMs' },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          correct: 1,
          wrong: { $subtract: ['$total', '$correct'] },
          accuracy: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
          avgTimeSpent: { $ifNull: ['$avgTimeSpent', 0] },
        },
      },
    ]);

    return {
      overall: overallStats[0] || { total: 0, correct: 0, wrong: 0, accuracy: 0, avgTimeSpent: 0 },
      knowledgeNodes,
      bySubject: subjectStats,
      byDifficulty: difficultyStats,
      byType: typeStats,
      period: `${days}天`,
    };
  } catch (error) {
    console.error('getKnowledgeMastery error:', error);
    throw error;
  }
}

/**
 * 获取学习趋势数据
 * @param {string} userId - 用户ID
 * @param {number} days - 天数（默认30天）
 * @returns {Promise<Array>} 每日学习数据
 */
export async function getLearningTrend(userId, days = 30) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const trend = await Record.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          avgTimeSpent: { $avg: '$timeSpentMs' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          correct: 1,
          wrong: { $subtract: ['$total', '$correct'] },
          accuracy: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
              0,
            ],
          },
          avgTimeSpent: { $ifNull: ['$avgTimeSpent', 0] },
        },
      },
      { $sort: { date: 1 } },
    ]);

    return trend;
  } catch (error) {
    console.error('getLearningTrend error:', error);
    throw error;
  }
}

