/**
 * GraphTutor V3.0 - 报表生成服务
 * 
 * 作用：生成系统统计报表数据，包括日报、周报、月报和自定义时间范围报表，提供用户增长、题目统计、学习统计等数据
 * 关联页面：
 *   - routes/admin.js (管理后台路由，使用此服务)
 *   - client/src/pages/admin/Reports.jsx (统计报表页面)
 *   - client/src/api/admin.js (报表API客户端)
 * 技术栈：
 *   - MongoDB聚合查询
 *   - Mongoose ODM
 *   - 日期范围计算
 *   - 数据汇总和统计
 */

import User from '../models/User.js';
import Question from '../models/Question.js';
import QuestionBank from '../models/QuestionBank.js';
import Record from '../models/Record.js';
import UserOperationLog from '../models/UserOperationLog.js';

/**
 * 生成系统统计报表数据
 * @param {Object} options - 报表选项
 * @param {Date} options.startDate - 开始日期
 * @param {Date} options.endDate - 结束日期
 * @param {string} options.type - 报表类型（daily/weekly/monthly/custom）
 * @returns {Promise<Object>} 报表数据
 */
export async function generateSystemReport(options = {}) {
  const {
    startDate,
    endDate,
    type = 'custom',
  } = options;

  // 计算日期范围
  let reportStartDate, reportEndDate;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (type) {
    case 'daily':
      reportStartDate = new Date(today);
      reportEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      reportStartDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      reportEndDate = new Date(today);
      break;
    case 'monthly':
      reportStartDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      reportEndDate = new Date(today);
      break;
    default:
      reportStartDate = startDate ? new Date(startDate) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      reportEndDate = endDate ? new Date(endDate) : new Date(today);
  }

  // 基础统计
  const [
    totalUsers,
    totalQuestions,
    totalBanks,
    adminCount,
    questionManagerCount,
    studentCount,
  ] = await Promise.all([
    User.countDocuments(),
    Question.countDocuments(),
    QuestionBank.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'question_manager' }),
    User.countDocuments({ role: 'student' }),
  ]);

  // 时间范围内的统计
  const [
    newUsersInPeriod,
    activeUsersInPeriod,
    newQuestionsInPeriod,
    newBanksInPeriod,
    totalRecordsInPeriod,
  ] = await Promise.all([
    User.countDocuments({
      createdAt: { $gte: reportStartDate, $lte: reportEndDate },
    }),
    User.countDocuments({
      lastLogin: { $gte: reportStartDate, $lte: reportEndDate },
    }),
    Question.countDocuments({
      createdAt: { $gte: reportStartDate, $lte: reportEndDate },
    }),
    QuestionBank.countDocuments({
      createdAt: { $gte: reportStartDate, $lte: reportEndDate },
    }),
    Record.countDocuments({
      createdAt: { $gte: reportStartDate, $lte: reportEndDate },
    }),
  ]);

  // 题目难度分布
  const difficultyStats = await Question.aggregate([
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 题目类型分布
  const typeStats = await Question.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // 用户增长趋势（按天）
  const userGrowthTrend = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: reportStartDate, $lte: reportEndDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // 操作日志统计
  const operationStats = await UserOperationLog.aggregate([
    {
      $match: {
        createdAt: { $gte: reportStartDate, $lte: reportEndDate },
      },
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        success: {
          $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$result', 'failed'] }, 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // 学习记录统计
  const studyStats = await Record.aggregate([
    {
      $match: {
        createdAt: { $gte: reportStartDate, $lte: reportEndDate },
      },
    },
    {
      $group: {
        _id: null,
        totalAnswered: { $sum: 1 },
        totalCorrect: {
          $sum: { $cond: [{ $eq: ['$isCorrect', true] }, 1, 0] },
        },
        totalWrong: {
          $sum: { $cond: [{ $eq: ['$isCorrect', false] }, 1, 0] },
        },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
  ]);

  const studyData = studyStats[0] || {
    totalAnswered: 0,
    totalCorrect: 0,
    totalWrong: 0,
    uniqueUsers: [],
  };

  const report = {
    metadata: {
      type,
      startDate: reportStartDate.toISOString(),
      endDate: reportEndDate.toISOString(),
      generatedAt: new Date().toISOString(),
      generatedBy: 'system',
    },
    summary: {
      totalUsers,
      totalQuestions,
      totalBanks,
      userRoles: {
        admin: adminCount,
        questionManager: questionManagerCount,
        student: studentCount,
      },
    },
    periodStats: {
      newUsers: newUsersInPeriod,
      activeUsers: activeUsersInPeriod,
      newQuestions: newQuestionsInPeriod,
      newBanks: newBanksInPeriod,
      totalRecords: totalRecordsInPeriod,
    },
    questionStats: {
      difficulty: difficultyStats.map(s => ({
        level: s._id || 0,
        count: s.count,
        label: getDifficultyLabel(s._id || 0),
      })),
      type: typeStats.map(s => ({
        type: s._id || 'unknown',
        count: s.count,
        label: getTypeLabel(s._id || 'unknown'),
      })),
    },
    userGrowth: {
      trend: userGrowthTrend.map(t => ({
        date: t._id,
        count: t.count,
      })),
      total: newUsersInPeriod,
    },
    operations: {
      stats: operationStats.map(s => ({
        action: s._id,
        count: s.count,
        success: s.success,
        failed: s.failed,
        label: getActionLabel(s._id),
      })),
      total: operationStats.reduce((sum, s) => sum + s.count, 0),
    },
    study: {
      totalAnswered: studyData.totalAnswered,
      totalCorrect: studyData.totalCorrect,
      totalWrong: studyData.totalWrong,
      accuracy: studyData.totalAnswered > 0
        ? (studyData.totalCorrect / studyData.totalAnswered).toFixed(2)
        : '0.00',
      activeUsers: studyData.uniqueUsers?.length || 0,
    },
  };

  return report;
}

/**
 * 获取难度标签
 */
function getDifficultyLabel(level) {
  const labels = {
    1: '非常简单',
    2: '简单',
    3: '中等',
    4: '困难',
    5: '非常困难',
  };
  return labels[level] || `难度${level}`;
}

/**
 * 获取题型标签
 */
function getTypeLabel(type) {
  const labels = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
    fill: '填空题',
    short: '简答题',
  };
  return labels[type] || type;
}

/**
 * 获取操作类型标签
 */
function getActionLabel(action) {
  const labels = {
    role_update: '修改角色',
    role_batch_update: '批量修改角色',
    user_delete: '删除用户',
    user_batch_delete: '批量删除用户',
    user_import: '导入用户',
    user_view: '查看用户详情',
    user_export: '导出用户',
    user_create: '创建用户',
  };
  return labels[action] || action;
}

