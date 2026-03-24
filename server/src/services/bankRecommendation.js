/**
 * GraphTutor V3.0 - 题库推荐服务
 * 
 * 功能：基于用户学习行为推荐相关题库
 */

import QuestionBank from '../models/QuestionBank.js';
import Question from '../models/Question.js';
import Record from '../models/Record.js';
import WrongQuestion from '../models/WrongQuestion.js';
import Favorite from '../models/Favorite.js';

/**
 * 基于用户错题推荐题库
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的题库列表
 */
export async function recommendBanksFromWrongQuestions(userId, options = {}) {
  try {
    const { limit = 5 } = options;

    // 获取用户的错题
    const wrongQuestions = await WrongQuestion.find({ userId })
      .populate('questionId', 'bankId subjectCode difficulty')
      .limit(100)
      .lean();

    if (wrongQuestions.length === 0) {
      return [];
    }

    // 统计错题所属的题库
    const bankStats = {};
    for (const wq of wrongQuestions) {
      const question = wq.questionId;
      if (!question || !question.bankId) continue;

      const bankId = question.bankId.toString();
      if (!bankStats[bankId]) {
        bankStats[bankId] = {
          bankId,
          wrongCount: 0,
          avgDifficulty: 0,
          subjectCodes: new Set(),
        };
      }

      bankStats[bankId].wrongCount++;
      if (question.difficulty) {
        bankStats[bankId].avgDifficulty += question.difficulty;
      }
      if (question.subjectCode) {
        bankStats[bankId].subjectCodes.add(question.subjectCode);
      }
    }

    // 计算平均难度并排序
    const bankArray = Object.values(bankStats).map(stat => ({
      ...stat,
      avgDifficulty: stat.wrongCount > 0 ? stat.avgDifficulty / stat.wrongCount : 0,
      subjectCodes: Array.from(stat.subjectCodes),
    }));

    // 按错题数量排序
    bankArray.sort((a, b) => b.wrongCount - a.wrongCount);

    // 获取题库详情
    const bankIds = bankArray.slice(0, limit).map(b => b.bankId);
    const banks = await QuestionBank.find({ _id: { $in: bankIds } })
      .populate('ownerId', 'name email')
      .lean();

    // 合并统计信息
    const bankMap = {};
    for (const bank of banks) {
      bankMap[bank._id.toString()] = bank;
    }

    return bankArray.slice(0, limit).map(stat => ({
      ...bankMap[stat.bankId],
      recommendationReason: `您在该题库中有 ${stat.wrongCount} 道错题`,
      wrongCount: stat.wrongCount,
      avgDifficulty: stat.avgDifficulty,
    }));
  } catch (error) {
    console.error('recommendBanksFromWrongQuestions error:', error);
    return [];
  }
}

/**
 * 基于用户学习历史推荐题库
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的题库列表
 */
export async function recommendBanksFromHistory(userId, options = {}) {
  try {
    const { limit = 5, days = 30 } = options;

    // 获取用户最近的学习记录
    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await Record.find({
      userId,
      createdAt: { $gte: since },
    })
      .populate('questionId', 'bankId subjectCode')
      .limit(500)
      .lean();

    if (records.length === 0) {
      return [];
    }

    // 统计练习过的题库
    const bankStats = {};
    for (const record of records) {
      const question = record.questionId;
      if (!question || !question.bankId) continue;

      const bankId = question.bankId.toString();
      if (!bankStats[bankId]) {
        bankStats[bankId] = {
          bankId,
          practiceCount: 0,
          correctCount: 0,
          subjectCodes: new Set(),
        };
      }

      bankStats[bankId].practiceCount++;
      if (record.isCorrect) {
        bankStats[bankId].correctCount++;
      }
      if (question.subjectCode) {
        bankStats[bankId].subjectCodes.add(question.subjectCode);
      }
    }

    // 计算正确率并排序
    const bankArray = Object.values(bankStats).map(stat => ({
      ...stat,
      accuracy: stat.practiceCount > 0 ? stat.correctCount / stat.practiceCount : 0,
      subjectCodes: Array.from(stat.subjectCodes),
    }));

    // 按练习次数排序，优先推荐练习次数多但正确率低的题库
    bankArray.sort((a, b) => {
      if (a.practiceCount !== b.practiceCount) {
        return b.practiceCount - a.practiceCount;
      }
      return a.accuracy - b.accuracy;
    });

    // 获取题库详情
    const bankIds = bankArray.slice(0, limit).map(b => b.bankId);
    const banks = await QuestionBank.find({ _id: { $in: bankIds } })
      .populate('ownerId', 'name email')
      .lean();

    // 合并统计信息
    const bankMap = {};
    for (const bank of banks) {
      bankMap[bank._id.toString()] = bank;
    }

    return bankArray.slice(0, limit).map(stat => ({
      ...bankMap[stat.bankId],
      recommendationReason: `您最近练习了 ${stat.practiceCount} 道题，正确率 ${(stat.accuracy * 100).toFixed(1)}%`,
      practiceCount: stat.practiceCount,
      accuracy: stat.accuracy,
    }));
  } catch (error) {
    console.error('recommendBanksFromHistory error:', error);
    return [];
  }
}

/**
 * 推荐热门题库
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的题库列表
 */
export async function recommendPopularBanks(options = {}) {
  try {
    const { limit = 10, subjectCode } = options;

    const cond = { isPublic: true };
    if (subjectCode) {
      cond.subjectCode = subjectCode;
    }

    // 获取题目数量最多的题库
    const banks = await QuestionBank.find(cond)
      .sort({ questionCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('ownerId', 'name email')
      .lean();

    return banks.map(bank => ({
      ...bank,
      recommendationReason: `热门题库，包含 ${bank.questionCount || 0} 道题目`,
    }));
  } catch (error) {
    console.error('recommendPopularBanks error:', error);
    return [];
  }
}

/**
 * 推荐相关题库（基于学科和收藏）
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的题库列表
 */
export async function recommendRelatedBanks(userId, options = {}) {
  try {
    const { limit = 5 } = options;

    // 获取用户收藏的题目
    const favorites = await Favorite.find({ userId })
      .populate('questionId', 'bankId subjectCode')
      .limit(100)
      .lean();

    if (favorites.length === 0) {
      return recommendPopularBanks({ limit });
    }

    // 统计收藏题目所属的学科
    const subjectStats = {};
    const bankIds = new Set();

    for (const fav of favorites) {
      const question = fav.questionId;
      if (!question) continue;

      if (question.subjectCode) {
        subjectStats[question.subjectCode] = (subjectStats[question.subjectCode] || 0) + 1;
      }
      if (question.bankId) {
        bankIds.add(question.bankId.toString());
      }
    }

    // 获取最感兴趣的学科
    const topSubjects = Object.entries(subjectStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code]) => code);

    // 推荐同学科的题库（排除已收藏的题库）
    const cond = {
      isPublic: true,
      subjectCode: { $in: topSubjects },
      _id: { $nin: Array.from(bankIds) },
    };

    const banks = await QuestionBank.find(cond)
      .sort({ questionCount: -1 })
      .limit(limit)
      .populate('ownerId', 'name email')
      .lean();

    return banks.map(bank => ({
      ...bank,
      recommendationReason: `基于您的收藏推荐，与您感兴趣的学科相关`,
    }));
  } catch (error) {
    console.error('recommendRelatedBanks error:', error);
    return recommendPopularBanks({ limit: options.limit || 5 });
  }
}

/**
 * 综合推荐题库（组合多种推荐策略）
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 推荐的题库列表
 */
export async function recommendBanks(userId, options = {}) {
  try {
    const { limit = 10 } = options;

    // 并行获取多种推荐
    const [fromWrong, fromHistory, popular, related] = await Promise.all([
      recommendBanksFromWrongQuestions(userId, { limit: Math.ceil(limit * 0.3) }),
      recommendBanksFromHistory(userId, { limit: Math.ceil(limit * 0.3) }),
      recommendPopularBanks({ limit: Math.ceil(limit * 0.2) }),
      recommendRelatedBanks(userId, { limit: Math.ceil(limit * 0.2) }),
    ]);

    // 合并并去重
    const bankMap = new Map();
    
    [...fromWrong, ...fromHistory, ...popular, ...related].forEach(bank => {
      const bankId = bank._id.toString();
      if (!bankMap.has(bankId)) {
        bankMap.set(bankId, bank);
      }
    });

    return Array.from(bankMap.values()).slice(0, limit);
  } catch (error) {
    console.error('recommendBanks error:', error);
    return recommendPopularBanks({ limit });
  }
}

