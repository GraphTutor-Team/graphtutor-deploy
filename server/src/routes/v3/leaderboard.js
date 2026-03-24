/**
 * GraphTutor V3.0 - 排行榜API
 * 
 * 路径：/api/v3/leaderboard
 * 功能：提供多维度排行榜数据
 */

import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import Record from '../../models/Record.js';
import User from '../../models/User.js';
import Achievement from '../../models/Achievement.js';
import Group from '../../models/Group.js';

const router = express.Router();

/**
 * GET /api/v3/leaderboard
 * 获取排行榜
 * 参数：type (total/questions/accuracy/streak/weekly/monthly), period (week/month/all)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type = 'total', period = 'all', limit = 50 } = req.query;
    const currentUserId = req.user.id;

    let leaderboard = [];

    switch (type) {
      case 'questions':
        leaderboard = await getQuestionsLeaderboard(period, parseInt(limit, 10));
        break;
      case 'accuracy':
        leaderboard = await getAccuracyLeaderboard(period, parseInt(limit, 10));
        break;
      case 'streak':
        leaderboard = await getStreakLeaderboard(parseInt(limit, 10));
        break;
      case 'weekly':
        leaderboard = await getWeeklyLeaderboard(parseInt(limit, 10));
        break;
      case 'monthly':
        leaderboard = await getMonthlyLeaderboard(parseInt(limit, 10));
        break;
      case 'total':
      default:
        leaderboard = await getTotalLeaderboard(period, parseInt(limit, 10));
        break;
    }

    // 标记当前用户
    leaderboard = leaderboard.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isMe: item.userId === currentUserId,
    }));

    res.json({
      success: true,
      data: {
        type,
        period,
        items: leaderboard,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/leaderboard error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取排行榜失败',
    });
  }
});

/**
 * 总排行榜（综合得分）
 */
async function getTotalLeaderboard(period, limit) {
  const dateFilter = getDateFilter(period);

  const pipeline = [
    {
      $match: {
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$userId',
        totalQuestions: { $sum: 1 },
        correctQuestions: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        totalScore: {
          $sum: {
            $cond: ['$isCorrect', 10, -2], // 答对+10分，答错-2分
          },
        },
      },
    },
    {
      $project: {
        userId: '$_id',
        totalQuestions: 1,
        correctQuestions: 1,
        accuracy: {
          $cond: [
            { $gt: ['$totalQuestions', 0] },
            { $multiply: [{ $divide: ['$correctQuestions', '$totalQuestions'] }, 100] },
            0,
          ],
        },
        score: '$totalScore',
      },
    },
    { $sort: { score: -1, accuracy: -1 } },
    { $limit: limit },
  ];

  const results = await Record.aggregate(pipeline);

  // 获取用户信息
  const userIds = results.map(r => r.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id, u]));

  return results.map(r => ({
    userId: r.userId,
    name: userMap.get(r.userId)?.name || `用户${r.userId.slice(-4)}`,
    score: r.score || 0,
    totalQuestions: r.totalQuestions || 0,
    accuracy: r.accuracy || 0,
  }));
}

/**
 * 答题量排行榜
 */
async function getQuestionsLeaderboard(period, limit) {
  const dateFilter = getDateFilter(period);

  const pipeline = [
    {
      $match: {
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
  ];

  const results = await Record.aggregate(pipeline);
  const userIds = results.map(r => r._id);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id, u]));

  return results.map(r => ({
    userId: r._id,
    name: userMap.get(r._id)?.name || `用户${r._id.slice(-4)}`,
    score: r.total || 0,
  }));
}

/**
 * 正确率排行榜
 */
async function getAccuracyLeaderboard(period, limit) {
  const dateFilter = getDateFilter(period);

  const pipeline = [
    {
      $match: {
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    {
      $project: {
        userId: '$_id',
        accuracy: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
            0,
          ],
        },
        total: 1,
      },
    },
    { $match: { total: { $gte: 20 } } }, // 至少20题
    { $sort: { accuracy: -1, total: -1 } },
    { $limit: limit },
  ];

  const results = await Record.aggregate(pipeline);
  const userIds = results.map(r => r.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id, u]));

  return results.map(r => ({
    userId: r.userId,
    name: userMap.get(r.userId)?.name || `用户${r.userId.slice(-4)}`,
    score: Math.round(r.accuracy * 100) / 100,
    total: r.total,
  }));
}

/**
 * 连续学习排行榜
 */
async function getStreakLeaderboard(limit) {
  // 简化实现：基于最近30天的学习记录
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$_id.userId',
        days: { $sum: 1 },
      },
    },
    { $sort: { days: -1 } },
    { $limit: limit },
  ];

  const results = await Record.aggregate(pipeline);
  const userIds = results.map(r => r._id);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id, u]));

  return results.map(r => ({
    userId: r._id,
    name: userMap.get(r._id)?.name || `用户${r._id.slice(-4)}`,
    score: r.days || 0,
  }));
}

/**
 * 本周排行榜
 */
async function getWeeklyLeaderboard(limit) {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const dateFilter = { createdAt: { $gte: startOfWeek } };
  return getTotalLeaderboard(dateFilter, limit);
}

/**
 * 本月排行榜
 */
async function getMonthlyLeaderboard(limit) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const dateFilter = { createdAt: { $gte: startOfMonth } };
  return getTotalLeaderboard(dateFilter, limit);
}

/**
 * 获取日期过滤器
 */
function getDateFilter(period) {
  if (period === 'week') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return { createdAt: { $gte: startOfWeek } };
  }
  if (period === 'month') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return { createdAt: { $gte: startOfMonth } };
  }
  return {}; // all
}

/**
 * GET /api/v3/leaderboard/league
 * 学科联赛：按学科、按月的排行榜，带段位（黄金/白银/青铜/参与）
 * 参数：subjectCode（必填）, season（可选，默认当月 YYYY-MM）
 */
router.get('/league', requireAuth, async (req, res) => {
  try {
    const { subjectCode, season } = req.query;
    const currentUserId = req.user?.id;

    if (!subjectCode || !String(subjectCode).trim()) {
      return res.status(400).json({
        success: false,
        message: '请提供学科代码 subjectCode',
      });
    }

    const [year, month] = parseSeason(season);
    const { start, end } = getSeasonRange(year, month);

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $lookup: {
          from: 'questions',
          let: { qid: '$questionId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: [{ $toString: '$_id' }, '$$qid'] },
                    { $eq: ['$id', '$$qid'] },
                  ],
                },
              },
            },
            { $project: { subjectCode: 1 } },
          ],
          as: 'q',
        },
      },
      { $unwind: { path: '$q', preserveNullAndEmptyArrays: false } },
      { $match: { 'q.subjectCode': String(subjectCode).trim() } },
      {
        $group: {
          _id: '$userId',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      {
        $project: {
          userId: '$_id',
          total: 1,
          correct: 1,
          score: {
            $add: [
              { $multiply: ['$correct', 10] },
              { $multiply: [{ $subtract: ['$total', '$correct'] }, -2] },
            ],
          },
        },
      },
      { $sort: { score: -1, correct: -1 } },
      { $limit: 500 },
    ];

    const results = await Record.aggregate(pipeline);
    const userIds = results.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name doubleExpiresAt').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const now = new Date();

    let items = results.map((r) => {
      const u = userMap.get(r.userId?.toString());
      let score = r.score;
      if (u?.doubleExpiresAt && new Date(u.doubleExpiresAt) > now) score *= 2;
      return {
        userId: r.userId,
        name: u?.name || `用户${String(r.userId).slice(-4)}`,
        score,
        correct: r.correct,
        total: r.total,
        tier: '',
        isMe: r.userId === currentUserId,
      };
    });
    items.sort((a, b) => b.score - a.score || b.correct - a.correct);
    const total = items.length;
    const tierThresholds = {
      gold: Math.max(1, Math.floor(total * 0.1)),
      silver: Math.max(1, Math.floor(total * 0.3)),
      bronze: Math.max(1, Math.floor(total * 0.6)),
    };
    items = items.map((r, idx) => {
      const rank = idx + 1;
      let tier = '参与';
      if (rank <= tierThresholds.gold) tier = '黄金';
      else if (rank <= tierThresholds.silver) tier = '白银';
      else if (rank <= tierThresholds.bronze) tier = '青铜';
      return { ...r, rank, tier };
    });

    const seasonStr = `${year}-${String(month).padStart(2, '0')}`;
    res.json({
      success: true,
      data: {
        subjectCode: String(subjectCode).trim(),
        season: seasonStr,
        start: start.toISOString(),
        end: end.toISOString(),
        items,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/leaderboard/league error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取学科联赛排行失败',
    });
  }
});

/**
 * GET /api/v3/leaderboard/teams
 * 战队赛：当前用户加入的群组按周期（本周/本月）汇总答题量、正确率、综合得分并排名
 * 参数：period（week | month，默认 week）
 */
router.get('/teams', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const period = req.query.period === 'month' ? 'month' : 'week';

    let dateFilter = {};
    if (period === 'week') {
      const start = new Date();
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: start } };
    } else {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: start } };
    }

    const groups = await Group.find({
      status: 'active',
      $or: [
        { ownerId: userId },
        { 'members.userId': userId, 'members.status': 'active' },
      ],
    })
      .select('_id name ownerId members')
      .lean();

    if (groups.length === 0) {
      return res.json({
        success: true,
        data: { period, items: [], message: '你尚未加入任何群组，加入群组后即可参与战队赛' },
      });
    }

    const groupIdStrs = groups.map((g) => g._id.toString());
    const memberIdsByGroup = new Map();
    groups.forEach((g) => {
      const ownerStr = g.ownerId && (g.ownerId._id ? g.ownerId._id.toString() : g.ownerId.toString());
      const fromMembers = (g.members || [])
        .filter((m) => m.status === 'active')
        .map((m) => (m.userId && m.userId.toString ? m.userId.toString() : String(m.userId)));
      const ids = [...new Set([ownerStr, ...fromMembers].filter(Boolean))];
      memberIdsByGroup.set(g._id.toString(), ids);
    });

    const allMemberIds = [...new Set(memberIdsByGroup.values().flat())];
    if (allMemberIds.length === 0) {
      return res.json({
        success: true,
        data: { period, items: groups.map((g, i) => ({ rank: i + 1, groupId: g._id, name: g.name, memberCount: 0, total: 0, correct: 0, accuracy: 0, score: 0 })), message: null },
      });
    }

    const pipeline = [
      { $match: { userId: { $in: allMemberIds }, ...dateFilter } },
      {
        $group: {
          _id: '$userId',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      {
        $project: {
          userId: '$_id',
          total: 1,
          correct: 1,
          score: {
            $add: [
              { $multiply: ['$correct', 10] },
              { $multiply: [{ $subtract: ['$total', '$correct'] }, -2] },
            ],
          },
        },
      },
    ];
    const userStats = await Record.aggregate(pipeline);
    const userScoreMap = new Map(userStats.map((u) => [u.userId, { total: u.total, correct: u.correct, score: u.score }]));

    const teamScores = groupIdStrs.map((gid) => {
      const memberIds = memberIdsByGroup.get(gid) || [];
      let total = 0;
      let correct = 0;
      let score = 0;
      memberIds.forEach((uid) => {
        const s = userScoreMap.get(uid);
        if (s) {
          total += s.total;
          correct += s.correct;
          score += s.score;
        }
      });
      const g = groups.find((x) => x._id.toString() === gid);
      return {
        groupId: gid,
        name: g?.name || '未命名战队',
        memberCount: memberIds.length,
        total,
        correct,
        accuracy: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
        score,
      };
    });

    teamScores.sort((a, b) => b.score - a.score || b.correct - a.correct);

    const items = teamScores.map((t, idx) => ({
      rank: idx + 1,
      groupId: t.groupId,
      name: t.name,
      memberCount: t.memberCount,
      total: t.total,
      correct: t.correct,
      accuracy: t.accuracy,
      score: t.score,
    }));

    res.json({
      success: true,
      data: { period, items },
    });
  } catch (err) {
    console.error('GET /api/v3/leaderboard/teams error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取战队赛排行失败',
    });
  }
});

/**
 * 解析 season 为年月，默认当月
 */
function parseSeason(season) {
  if (season && /^\d{4}-\d{2}$/.test(String(season).trim())) {
    const [y, m] = String(season).trim().split('-').map(Number);
    return [y, m];
  }
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1];
}

/**
 * 获取赛季起止时间（当月 0 点 ~ 下月 0 点）
 */
function getSeasonRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

export default router;

