/**
 * GraphTutor V3.0 - 题库统计服务
 * 
 * 功能：提供题库相关的统计和数据分析
 */

import QuestionBank from '../models/QuestionBank.js';
import Question from '../models/Question.js';
import Record from '../models/Record.js';

/**
 * 计算题库统计信息
 * @param {string} bankId - 题库ID
 * @returns {Promise<Object>} 统计信息
 */
export async function calculateBankStats(bankId) {
  try {
    const bank = await QuestionBank.findById(bankId).lean();
    if (!bank) {
      throw new Error('题库不存在');
    }

    // 获取题目总数
    const totalQuestions = await Question.countDocuments({ bankId });

    // 按难度统计题目数量
    const difficultyStats = await Question.aggregate([
      { $match: { bankId: bankId } },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 转换为对象格式
    const difficultyDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    difficultyStats.forEach((stat) => {
      difficultyDistribution[stat._id] = stat.count;
    });

    // 按学科统计
    const subjectStats = await Question.aggregate([
      { $match: { bankId: bankId } },
      {
        $group: {
          _id: '$subjectCode',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 按题型统计题目数量
    const typeStats = await Question.aggregate([
      { $match: { bankId: bankId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 转换为对象格式
    const typeDistribution = {
      single: 0,
      multiple: 0,
      judge: 0,
      fill: 0,
      short: 0,
    };

    typeStats.forEach((stat) => {
      if (typeDistribution.hasOwnProperty(stat._id)) {
        typeDistribution[stat._id] = stat.count;
      }
    });

    // 获取最近30天的答题记录统计
    // 注意：Record模型可能没有bankId字段，需要通过questionId关联查询
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 先获取该题库下的所有题目ID
    const questionIds = await Question.find({ bankId }).select('_id').lean();
    const questionIdStrings = questionIds.map(q => q._id.toString());

    // 统计最近30天的答题记录
    const recentRecords = await Record.countDocuments({
      questionId: { $in: questionIdStrings },
      createdAt: { $gte: thirtyDaysAgo },
    });

    // 计算平均正确率
    const accuracyStats = await Record.aggregate([
      { $match: { questionId: { $in: questionIdStrings } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correct: {
            $sum: {
              $cond: ['$isCorrect', 1, 0],
            },
          },
        },
      },
    ]);

    const accuracy =
      accuracyStats.length > 0 && accuracyStats[0].total > 0
        ? (accuracyStats[0].correct / accuracyStats[0].total) * 100
        : 0;

    return {
      bankId,
      bankName: bank.name,
      totalQuestions,
      difficultyDistribution,
      typeDistribution,
      subjectDistribution: subjectStats,
      recentActivity: {
        recordsCount: recentRecords,
        period: '30天',
      },
      accuracy: Math.round(accuracy * 100) / 100,
      lastUpdated: bank.updatedAt,
    };
  } catch (error) {
    console.error('calculateBankStats error:', error);
    throw error;
  }
}

/**
 * 获取题库活跃度数据
 * @param {string} bankId - 题库ID
 * @param {number} days - 天数（默认30天）
 * @returns {Promise<Array>} 活跃度数据
 */
export async function getBankActivity(bankId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 先获取该题库下的所有题目ID
    const questionIds = await Question.find({ bankId }).select('_id').lean();
    const questionIdStrings = questionIds.map(q => q._id.toString());

    if (questionIdStrings.length === 0) {
      return [];
    }

    // 按日期统计答题记录
    const activity = await Record.aggregate([
      {
        $match: {
          questionId: { $in: questionIdStrings },
          createdAt: { $gte: startDate },
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
          count: { $sum: 1 },
          correct: {
            $sum: {
              $cond: ['$isCorrect', 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return activity.map((item) => ({
      date: item._id,
      total: item.count,
      correct: item.correct,
      accuracy: item.count > 0 ? (item.correct / item.count) * 100 : 0,
    }));
  } catch (error) {
    console.error('getBankActivity error:', error);
    throw error;
  }
}

/**
 * 获取题目分布统计
 * @param {string} bankId - 题库ID
 * @returns {Promise<Object>} 分布统计
 */
export async function getQuestionDistribution(bankId) {
  try {
    // 按知识点统计
    const knowledgeNodeStats = await Question.aggregate([
      { $match: { bankId: bankId } },
      {
        $group: {
          _id: '$knowledgeNodeId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 }, // 只返回前10个
    ]);

    // 按来源统计
    const sourceStats = await Question.aggregate([
      { $match: { bankId: bankId } },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 按标签统计（取最常见的标签）
    const allQuestions = await Question.find({ bankId: bankId })
      .select('tags')
      .lean();

    const tagCounts = {};
    allQuestions.forEach((q) => {
      if (q.tags && Array.isArray(q.tags)) {
        q.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // 按题型统计
    const typeStats = await Question.aggregate([
      { $match: { bankId: bankId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return {
      byKnowledgeNode: knowledgeNodeStats,
      bySource: sourceStats,
      byTag: topTags,
      byType: typeStats,
    };
  } catch (error) {
    console.error('getQuestionDistribution error:', error);
    throw error;
  }
}

/**
 * 更新题库的题目数量缓存
 * @param {string} bankId - 题库ID
 */
export async function updateBankQuestionCount(bankId) {
  try {
    const count = await Question.countDocuments({ bankId: bankId });
    await QuestionBank.findByIdAndUpdate(bankId, {
      $set: { questionCount: count },
    });
    return count;
  } catch (error) {
    console.error('updateBankQuestionCount error:', error);
    throw error;
  }
}

/**
 * 批量更新多个题库的题目数量缓存
 * @param {Array<string>} bankIds - 题库ID数组
 */
export async function batchUpdateBankQuestionCounts(bankIds) {
  try {
    const counts = await Question.aggregate([
      { $match: { bankId: { $in: bankIds } } },
      {
        $group: {
          _id: '$bankId',
          count: { $sum: 1 },
        },
      },
    ]);

    const updatePromises = counts.map(({ _id, count }) =>
      QuestionBank.findByIdAndUpdate(_id, {
        $set: { questionCount: count },
      })
    );

    // 对于没有题目的题库，设置为0
    const bankIdsWithCounts = new Set(counts.map(c => c._id.toString()));
    const bankIdsWithoutCounts = bankIds.filter(
      id => !bankIdsWithCounts.has(id.toString())
    );

    const zeroUpdatePromises = bankIdsWithoutCounts.map(bankId =>
      QuestionBank.findByIdAndUpdate(bankId, {
        $set: { questionCount: 0 },
      })
    );

    await Promise.all([...updatePromises, ...zeroUpdatePromises]);

    return counts.length;
  } catch (error) {
    console.error('batchUpdateBankQuestionCounts error:', error);
    throw error;
  }
}

/**
 * 获取题库使用情况统计
 * @param {string} bankId - 题库ID
 * @returns {Promise<Object>} 使用情况统计
 */
export async function getBankUsageStats(bankId) {
  try {
    // 获取该题库下的所有题目ID
    const questionIds = await Question.find({ bankId }).select('_id').lean();
    const questionIdStrings = questionIds.map(q => q._id.toString());

    if (questionIdStrings.length === 0) {
      return {
        totalUsers: 0,
        totalRecords: 0,
        uniqueQuestionsPracticed: 0,
        averageAccuracy: 0,
        topUsers: [],
      };
    }

    // 统计使用该题库的用户数
    const userStats = await Record.aggregate([
      { $match: { questionId: { $in: questionIdStrings } } },
      {
        $group: {
          _id: '$userId',
          recordCount: { $sum: 1 },
          correctCount: {
            $sum: {
              $cond: ['$isCorrect', 1, 0],
            },
          },
        },
      },
      {
        $project: {
          userId: '$_id',
          recordCount: 1,
          accuracy: {
            $cond: [
              { $gt: ['$recordCount', 0] },
              { $multiply: [{ $divide: ['$correctCount', '$recordCount'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { recordCount: -1 } },
      { $limit: 10 },
    ]);

    // 统计被练习过的题目数
    const practicedQuestions = await Record.distinct('questionId', {
      questionId: { $in: questionIdStrings },
    });

    // 计算总体正确率
    const overallStats = await Record.aggregate([
      { $match: { questionId: { $in: questionIdStrings } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correct: {
            $sum: {
              $cond: ['$isCorrect', 1, 0],
            },
          },
        },
      },
    ]);

    const totalRecords = overallStats.length > 0 ? overallStats[0].total : 0;
    const totalCorrect = overallStats.length > 0 ? overallStats[0].correct : 0;
    const averageAccuracy = totalRecords > 0 ? (totalCorrect / totalRecords) * 100 : 0;

    return {
      totalUsers: userStats.length,
      totalRecords,
      uniqueQuestionsPracticed: practicedQuestions.length,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      topUsers: userStats.map(stat => ({
        userId: stat.userId,
        recordCount: stat.recordCount,
        accuracy: Math.round(stat.accuracy * 100) / 100,
      })),
    };
  } catch (error) {
    console.error('getBankUsageStats error:', error);
    throw error;
  }
}

