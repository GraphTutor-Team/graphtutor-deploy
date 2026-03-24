/**
 * GraphTutor V3.0 - 用户统计服务
 * 
 * 作用：提供用户相关的统计和数据分析功能，包括学习统计、活跃度、排名、批量统计等
 * 关联页面：
 *   - routes/users.js (用户路由，使用此服务)
 *   - client/src/pages/admin/UserManagement.jsx (用户管理页面)
 *   - client/src/pages/admin/components/UserDetailModal.jsx (用户详情模态框)
 * 技术栈：
 *   - MongoDB聚合查询 (Aggregation Pipeline)
 *   - Mongoose ODM
 *   - 数据统计和计算
 *   - 日期范围查询
 */

import User from '../models/User.js';
import Record from '../models/Record.js';
import WrongQuestion from '../models/WrongQuestion.js';
import StudyCheckIn from '../models/StudyCheckIn.js';
import LearningGoal from '../models/LearningGoal.js';
import Note from '../models/Note.js';

/**
 * 获取用户学习统计
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项 { days }
 * @returns {Promise<Object>} 统计信息
 */
export async function getUserLearningStats(userId, options = {}) {
  try {
    const { days = 30 } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 获取用户信息
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('用户不存在');
    }

    // 答题记录统计
    const recordStats = await Record.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          totalTime: { $sum: { $ifNull: ['$timeSpentMs', 0] } },
        },
      },
    ]);

    const recordData = recordStats[0] || { total: 0, correct: 0, totalTime: 0 };
    const accuracy = recordData.total > 0 
      ? (recordData.correct / recordData.total) * 100 
      : 0;

    // 错题统计
    const wrongQuestionStats = await WrongQuestion.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          mastered: { $sum: { $cond: [{ $eq: ['$isMastered', true] }, 1, 0] } },
          unmastered: { $sum: { $cond: [{ $eq: ['$masteryStatus', 'unmastered'] }, 1, 0] } },
        },
      },
    ]);

    const wrongData = wrongQuestionStats[0] || { total: 0, mastered: 0, unmastered: 0 };

    // 打卡统计
    const checkInStats = await StudyCheckIn.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          totalDuration: { $sum: { $ifNull: ['$studyDuration', 0] } },
          totalQuestions: { $sum: { $ifNull: ['$completedQuestions', 0] } },
        },
      },
    ]);

    const checkInData = checkInStats[0] || { totalDays: 0, totalDuration: 0, totalQuestions: 0 };

    // 学习目标统计
    const goalStats = await LearningGoal.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const goalsByStatus = {
      active: 0,
      completed: 0,
      paused: 0,
    };
    goalStats.forEach(stat => {
      if (goalsByStatus.hasOwnProperty(stat._id)) {
        goalsByStatus[stat._id] = stat.count;
      }
    });

    // 笔记统计
    const noteCount = await Note.countDocuments({ userId });

    return {
      userId,
      userName: user.name || user.email,
      period: `${days}天`,
      records: {
        total: recordData.total,
        correct: recordData.correct,
        wrong: recordData.total - recordData.correct,
        accuracy: Math.round(accuracy * 100) / 100,
        totalTimeMinutes: Math.round(recordData.totalTime / 60000),
      },
      wrongQuestions: {
        total: wrongData.total,
        mastered: wrongData.mastered,
        unmastered: wrongData.unmastered,
      },
      checkIn: {
        totalDays: checkInData.totalDays,
        totalDuration: checkInData.totalDuration,
        totalQuestions: checkInData.totalQuestions,
      },
      goals: goalsByStatus,
      notes: noteCount,
    };
  } catch (error) {
    console.error('getUserLearningStats error:', error);
    throw error;
  }
}

/**
 * 获取用户活跃度数据
 * @param {string} userId - 用户ID
 * @param {number} days - 天数（默认30天）
 * @returns {Promise<Array>} 活跃度数据
 */
export async function getUserActivity(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 按日期统计答题记录
    const activity = await Record.aggregate([
      {
        $match: {
          userId,
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
    console.error('getUserActivity error:', error);
    throw error;
  }
}

/**
 * 获取用户排名信息
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 排名信息
 */
export async function getUserRanking(userId) {
  try {
    // 获取用户总答题数
    const userRecordCount = await Record.countDocuments({ userId });

    // 获取所有用户的答题数排名
    const userRankings = await Record.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 找到用户排名
    const userIndex = userRankings.findIndex(
      (r) => r._id.toString() === userId.toString()
    );
    const rank = userIndex >= 0 ? userIndex + 1 : null;
    const totalUsers = userRankings.length;

    return {
      rank,
      totalUsers,
      recordCount: userRecordCount,
    };
  } catch (error) {
    console.error('getUserRanking error:', error);
    throw error;
  }
}

/**
 * 批量获取用户统计信息
 * @param {Array<string>} userIds - 用户ID数组
 * @returns {Promise<Array>} 用户统计信息数组
 */
export async function batchGetUserStats(userIds) {
  try {
    const stats = await Record.aggregate([
      {
        $match: {
          userId: { $in: userIds },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalRecords: { $sum: 1 },
          correctRecords: {
            $sum: {
              $cond: ['$isCorrect', 1, 0],
            },
          },
          lastActivity: { $max: '$createdAt' },
        },
      },
    ]);

    // 转换为Map以便快速查找
    const statsMap = new Map();
    stats.forEach((stat) => {
      const accuracy = stat.totalRecords > 0
        ? (stat.correctRecords / stat.totalRecords) * 100
        : 0;
      statsMap.set(stat._id.toString(), {
        totalRecords: stat.totalRecords,
        correctRecords: stat.correctRecords,
        accuracy: Math.round(accuracy * 100) / 100,
        lastActivity: stat.lastActivity,
      });
    });

    // 为所有用户返回统计（没有数据的返回默认值）
    return userIds.map((userId) => {
      const stat = statsMap.get(userId.toString());
      return stat || {
        totalRecords: 0,
        correctRecords: 0,
        accuracy: 0,
        lastActivity: null,
      };
    });
  } catch (error) {
    console.error('batchGetUserStats error:', error);
    throw error;
  }
}

