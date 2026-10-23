/**
 * GraphTutor V3.0 - 群组管理API
 * 
 * 路径：/api/v3/groups
 * 功能：提供群组的CRUD功能、成员管理、题库和题目关联
 */

import express from 'express';
import Group from '../../models/Group.js';
import QuestionBank from '../../models/QuestionBank.js';
import Question from '../../models/Question.js';
import { assertBankQuestionAccess, assertQuestionBanksAccessible } from '../../services/contentAccess.js';
import Record from '../../models/Record.js';
import User from '../../models/User.js';
import WrongQuestion from '../../models/WrongQuestion.js';
import GroupPracticeSession from '../../models/GroupPracticeSession.js';
import GroupAssignment from '../../models/GroupAssignment.js';
import AssignmentSubmission from '../../models/AssignmentSubmission.js';
import GroupStudyRoomPresence from '../../models/GroupStudyRoomPresence.js';
import GroupSharedQuestion from '../../models/GroupSharedQuestion.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { sanitizeString, validateInt } from '../../middleware/validation.js';

const router = express.Router();

/** 获取群组并校验成员权限 */
async function getGroupAndCheckMember(req, res, next) {
  const group = await Group.findById(req.params.id)
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email role');
  if (!group) {
    return res.status(404).json({ success: false, message: '群组不存在' });
  }
  const userId = req.user.id;
  const isMember = group.isMember(userId);
  const isOwner = group.ownerId._id.toString() === userId || group.ownerId.toString() === userId;
  if (!isMember && !isOwner) {
    return res.status(403).json({ success: false, message: '无权访问此群组' });
  }
  req.groupInstance = group;
  req.isGroupTeacher = group.isTeacher(userId);
  return next();
}

/**
 * GET /api/v3/groups
 * 获取群组列表
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status = 'active' } = req.query;

    const query = {
      $or: [
        { ownerId: userId },
        { 'members.userId': userId, 'members.status': 'active' },
      ],
      status,
    };

    if (type) {
      query.type = type;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      Group.find(query)
        .populate('ownerId', 'name email')
        .populate('members.userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Group.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: groups,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET /api/v3/groups error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取群组列表失败',
    });
  }
});

/**
 * GET /api/v3/groups/:id/leaderboard
 * 群组内排行榜（按答题量/正确率）
 */
router.get('/:id/leaderboard', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const group = req.groupInstance;
    const memberIds = group.members
      .filter((m) => m.status === 'active')
      .map((m) => m.userId.toString());
    if (memberIds.length === 0) {
      return res.json({ success: true, data: { items: [], period: req.query.period || 'all' } });
    }

    const period = req.query.period || 'all';
    let dateFilter = {};
    if (period === 'week') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      dateFilter = { createdAt: { $gte: start } };
    } else if (period === 'month') {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      dateFilter = { createdAt: { $gte: start } };
    }

    const pipeline = [
      { $match: { userId: { $in: memberIds }, ...dateFilter } },
      {
        $group: {
          _id: '$userId',
          totalQuestions: { $sum: 1 },
          correctQuestions: { $sum: { $cond: ['$isCorrect', 1, 0] } },
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
        },
      },
      { $sort: { totalQuestions: -1, accuracy: -1 } },
      { $limit: 50 },
    ];

    const results = await Record.aggregate(pipeline);
    const userIds = results.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const items = results.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      name: userMap.get(r.userId)?.name || userMap.get(r.userId)?.email || `用户${String(r.userId).slice(-4)}`,
      totalQuestions: r.totalQuestions || 0,
      correctQuestions: r.correctQuestions || 0,
      accuracy: Math.round((r.accuracy || 0) * 10) / 10,
    }));

    res.json({
      success: true,
      data: { items, period },
    });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/leaderboard error:', err);
    res.status(500).json({ success: false, message: err.message || '获取排行榜失败' });
  }
});

const STUDY_ROOM_STALE_MS = 5 * 60 * 1000; // 5 分钟无心跳视为离开自习室

/**
 * GET /api/v3/groups/:id/study-room/presence
 * 自习室在线成员列表（lastSeenAt 在 5 分钟内视为在线）
 */
router.get('/:id/study-room/presence', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const since = new Date(Date.now() - STUDY_ROOM_STALE_MS);
    const list = await GroupStudyRoomPresence.find({
      groupId,
      lastSeenAt: { $gte: since },
    })
      .sort({ lastSeenAt: -1 })
      .lean();
    const userIds = [...new Set(list.map((p) => p.userId))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const data = list.map((p) => ({
      userId: p.userId,
      name: userMap.get(p.userId)?.name || userMap.get(p.userId)?.email || p.userId?.slice(-6),
      todayGoal: p.todayGoal || '',
      lastSeenAt: p.lastSeenAt,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/study-room/presence error:', err);
    res.status(500).json({ success: false, message: err.message || '获取自习室在线列表失败' });
  }
});

/**
 * POST /api/v3/groups/:id/study-room/enter
 * 进入自习室（可选传 todayGoal）
 */
router.post('/:id/study-room/enter', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const userId = req.user.id;
    const todayGoal = sanitizeString(req.body?.todayGoal, { maxLength: 200 }) || '';
    await GroupStudyRoomPresence.findOneAndUpdate(
      { groupId, userId },
      { $set: { todayGoal, enteredAt: new Date(), lastSeenAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: '已进入自习室' });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/study-room/enter error:', err);
    res.status(500).json({ success: false, message: err.message || '进入自习室失败' });
  }
});

/**
 * POST /api/v3/groups/:id/study-room/leave
 * 离开自习室
 */
router.post('/:id/study-room/leave', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const userId = req.user.id;
    await GroupStudyRoomPresence.deleteOne({ groupId, userId });
    res.json({ success: true, message: '已离开自习室' });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/study-room/leave error:', err);
    res.status(500).json({ success: false, message: err.message || '离开自习室失败' });
  }
});

/**
 * POST /api/v3/groups/:id/study-room/heartbeat
 * 心跳（刷新 lastSeenAt，保持在线状态）
 */
router.post('/:id/study-room/heartbeat', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const userId = req.user.id;
    const updated = await GroupStudyRoomPresence.findOneAndUpdate(
      { groupId, userId },
      { $set: { lastSeenAt: new Date() } },
      { new: true }
    );
    if (!updated) {
      return res.status(400).json({ success: false, message: '请先进入自习室' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/study-room/heartbeat error:', err);
    res.status(500).json({ success: false, message: err.message || '心跳失败' });
  }
});

/**
 * PUT /api/v3/groups/:id/study-room/status
 * 更新今日学习目标
 */
router.put('/:id/study-room/status', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const userId = req.user.id;
    const todayGoal = sanitizeString(req.body?.todayGoal, { maxLength: 200 }) || '';
    const updated = await GroupStudyRoomPresence.findOneAndUpdate(
      { groupId, userId },
      { $set: { todayGoal, lastSeenAt: new Date() } },
      { new: true }
    );
    if (!updated) {
      return res.status(400).json({ success: false, message: '请先进入自习室' });
    }
    res.json({ success: true, data: { todayGoal } });
  } catch (err) {
    console.error('PUT /api/v3/groups/:id/study-room/status error:', err);
    res.status(500).json({ success: false, message: err.message || '更新状态失败' });
  }
});

/**
 * GET /api/v3/groups/:id/shared-questions
 * 小组题库：组内共享的错题/好题列表
 */
router.get('/:id/shared-questions', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const list = await GroupSharedQuestion.find({ groupId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const questionIds = [...new Set(list.map((q) => q.questionId))];
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('content type difficulty')
      .lean();
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));
    const userIds = [...new Set(list.map((q) => q.addedBy))];
    const users = await User.find({ _id: { $in: userIds } }).select('name').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const data = list.map((q) => ({
      _id: q._id,
      questionId: q.questionId,
      type: q.type,
      note: q.note || '',
      addedBy: q.addedBy,
      addedByName: userMap.get(q.addedBy)?.name || q.addedBy?.slice(-6),
      createdAt: q.createdAt,
      content: questionMap.get(q.questionId)?.content?.replace(/<[^>]+>/g, '').slice(0, 100) || '',
      difficulty: questionMap.get(q.questionId)?.difficulty,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/shared-questions error:', err);
    res.status(500).json({ success: false, message: err.message || '获取小组题库失败' });
  }
});

/**
 * POST /api/v3/groups/:id/shared-questions
 * 添加题目到小组题库（从我的错题/收藏选）
 */
router.post('/:id/shared-questions', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const userId = req.user.id;
    const { questionId, type = 'good', note = '' } = req.body || {};
    if (!questionId) {
      return res.status(400).json({ success: false, message: '请提供 questionId' });
    }
    const qType = type === 'wrong' ? 'wrong' : 'good';
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    try {
      await assertQuestionBanksAccessible(userId, [question]);
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ success: false, message: err.message, pricePoints: err.pricePoints });
      }
      throw err;
    }
    const existing = await GroupSharedQuestion.findOne({ groupId, questionId });
    if (existing) {
      return res.status(400).json({ success: false, message: '该题已在小组题库中' });
    }
    const doc = await GroupSharedQuestion.create({
      groupId,
      questionId: String(questionId),
      addedBy: userId,
      type: qType,
      note: sanitizeString(note, { maxLength: 300 }) || '',
    });
    res.status(201).json({
      success: true,
      data: doc,
      message: '已加入小组题库',
    });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/shared-questions error:', err);
    res.status(500).json({ success: false, message: err.message || '添加失败' });
  }
});

/**
 * DELETE /api/v3/groups/:id/shared-questions/:questionId
 * 从小组题库移除（仅添加者或老师可删）
 */
router.delete('/:id/shared-questions/:questionId', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const groupId = req.groupInstance._id;
    const userId = req.user.id;
    const { questionId } = req.params;
    const doc = await GroupSharedQuestion.findOne({ groupId, questionId });
    if (!doc) {
      return res.status(404).json({ success: false, message: '该题不在小组题库中' });
    }
    const isTeacher = req.isGroupTeacher;
    const isAdder = doc.addedBy.toString() === userId;
    if (!isAdder && !isTeacher) {
      return res.status(403).json({ success: false, message: '仅添加者或老师可移除' });
    }
    await GroupSharedQuestion.deleteOne({ groupId, questionId });
    res.json({ success: true, message: '已移除' });
  } catch (err) {
    console.error('DELETE /api/v3/groups/:id/shared-questions/:questionId error:', err);
    res.status(500).json({ success: false, message: err.message || '移除失败' });
  }
});

/**
 * GET /api/v3/groups/:id/practices
 * 群组内共同练习列表（进行中的）
 */
router.get('/:id/practices', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const list = await GroupPracticeSession.find({
      groupId: req.params.id,
      status: 'active',
    })
      .populate('createdBy', 'name')
      .populate('bankId', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/practices error:', err);
    res.status(500).json({ success: false, message: err.message || '获取练习列表失败' });
  }
});

/**
 * POST /api/v3/groups/:id/practice
 * 发起共同练习（仅老师）
 */
router.post('/:id/practice', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    if (!req.isGroupTeacher) {
      return res.status(403).json({ success: false, message: '仅老师可发起共同练习' });
    }
    const { bankId, questionCount = 10, title = '共同练习' } = req.body;
    if (!bankId) {
      return res.status(400).json({ success: false, message: '请选择题库' });
    }
    const count = Math.min(100, Math.max(1, parseInt(questionCount, 10) || 10));

    const bank = await QuestionBank.findById(bankId);
    if (!bank) {
      return res.status(404).json({ success: false, message: '题库不存在' });
    }
    try {
      await assertBankQuestionAccess(req.user.id, bankId);
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ success: false, message: err.message, pricePoints: err.pricePoints });
      }
      throw err;
    }

    const questionIds = await Question.aggregate([
      { $match: { bankId: bank._id } },
      { $sample: { size: count } },
      { $project: { _id: 1 } },
    ]);
    const ids = questionIds.map((q) => q._id);

    const session = await GroupPracticeSession.create({
      groupId: req.params.id,
      createdBy: req.user.id,
      bankId,
      questionCount: ids.length,
      questionIds: ids,
      title: sanitizeString(title, { maxLength: 100 }) || '共同练习',
      status: 'active',
    });

    const populated = await GroupPracticeSession.findById(session._id)
      .populate('bankId', 'name')
      .lean();

    res.status(201).json({
      success: true,
      data: populated,
      message: '共同练习已创建，可分享给成员参与',
    });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/practice error:', err);
    res.status(500).json({ success: false, message: err.message || '发起练习失败' });
  }
});

/**
 * GET /api/v3/groups/:id/practice/:sessionId
 * 获取共同练习详情（含题目 ID 列表，用于开始答题）
 */
router.get('/:id/practice/:sessionId', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const session = await GroupPracticeSession.findOne({
      _id: req.params.sessionId,
      groupId: req.params.id,
      status: 'active',
    })
      .populate('bankId', 'name')
      .lean();

    if (!session) {
      return res.status(404).json({ success: false, message: '练习不存在或已结束' });
    }

    res.json({
      success: true,
      data: {
        ...session,
        questionIds: (session.questionIds || []).map((id) => id.toString?.() || id),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/practice/:sessionId error:', err);
    res.status(500).json({ success: false, message: err.message || '获取练习失败' });
  }
});

/**
 * GET /api/v3/groups/:id/wrong-summary
 * 群组错题集锦（仅老师可见）
 */
router.get('/:id/wrong-summary', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    if (!req.isGroupTeacher) {
      return res.status(403).json({ success: false, message: '仅老师可查看群组错题集锦' });
    }

    const group = req.groupInstance;
    const memberIds = group.members
      .filter((m) => m.status === 'active')
      .map((m) => m.userId.toString());
    if (memberIds.length === 0) {
      return res.json({ success: true, data: { items: [] } });
    }

    const agg = await WrongQuestion.aggregate([
      { $match: { userId: { $in: memberIds } } },
      {
        $group: {
          _id: '$questionId',
          userIds: { $addToSet: '$userId' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);

    const userIds = [...new Set(agg.flatMap((a) => a.userIds))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const questionIds = agg.map((a) => a._id);
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('content type difficulty')
      .lean();
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const items = agg.map((item) => ({
      questionId: item._id,
      content: questionMap.get(item._id)?.content?.replace(/<[^>]+>/g, '').slice(0, 80) || '',
      type: questionMap.get(item._id)?.type,
      wrongCount: item.count,
      wrongUserIds: item.userIds,
      wrongUserNames: item.userIds.map(
        (uid) => userMap.get(uid)?.name || userMap.get(uid)?.email || uid?.slice(-4)
      ),
    }));

    res.json({ success: true, data: { items } });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/wrong-summary error:', err);
    res.status(500).json({ success: false, message: err.message || '获取错题集锦失败' });
  }
});

/**
 * GET /api/v3/groups/:id/assignments
 * 群组作业列表（成员可见）
 */
router.get('/:id/assignments', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const group = req.groupInstance;
    const list = await GroupAssignment.find({ groupId: group._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('bankId', 'name')
      .populate('createdBy', 'name email')
      .lean();
    const submissionCounts = await AssignmentSubmission.aggregate([
      { $match: { assignmentId: { $in: list.map((a) => a._id) } } },
      { $group: { _id: '$assignmentId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(submissionCounts.map((c) => [c._id.toString(), c.count]));
    const data = list.map((a) => ({
      ...a,
      submissionCount: countMap.get(a._id.toString()) || 0,
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/assignments error:', err);
    res.status(500).json({ success: false, message: err.message || '获取作业列表失败' });
  }
});

/**
 * POST /api/v3/groups/:id/assignments
 * 布置作业（仅老师/群主）
 */
router.post('/:id/assignments', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    if (!req.isGroupTeacher) {
      return res.status(403).json({ success: false, message: '仅老师或群主可布置作业' });
    }
    const group = req.groupInstance;
    const { bankId, questionCount, dueAt, title } = req.body || {};
    if (!bankId || !questionCount || questionCount < 1 || questionCount > 200) {
      return res.status(400).json({ success: false, message: '请提供有效题库与题数（1-200）' });
    }
    const dueDate = dueAt ? new Date(dueAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ success: false, message: '截止时间格式无效' });
    }
    try {
      await assertBankQuestionAccess(req.user.id, bankId);
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ success: false, message: err.message, pricePoints: err.pricePoints });
      }
      throw err;
    }
    const assignment = await GroupAssignment.create({
      groupId: group._id,
      createdBy: req.user.id,
      bankId,
      questionCount: Math.min(200, Math.max(1, parseInt(questionCount, 10))),
      title: sanitizeString(title || '作业', { maxLength: 200 }) || '作业',
      dueAt: dueDate,
      status: 'active',
    });
    const populated = await GroupAssignment.findById(assignment._id)
      .populate('bankId', 'name')
      .populate('createdBy', 'name email')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/assignments error:', err);
    res.status(500).json({ success: false, message: err.message || '布置作业失败' });
  }
});

/**
 * GET /api/v3/groups/:id/assignments/:assignmentId
 * 作业详情（成员可见）
 */
router.get('/:id/assignments/:assignmentId', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await GroupAssignment.findOne({
      _id: assignmentId,
      groupId: req.groupInstance._id,
    })
      .populate('bankId', 'name')
      .populate('createdBy', 'name email')
      .lean();
    if (!assignment) {
      return res.status(404).json({ success: false, message: '作业不存在' });
    }
    res.json({ success: true, data: assignment });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/assignments/:assignmentId error:', err);
    res.status(500).json({ success: false, message: err.message || '获取作业详情失败' });
  }
});

/**
 * GET /api/v3/groups/:id/assignments/:assignmentId/completion
 * 完成情况（仅老师/群主）
 */
router.get('/:id/assignments/:assignmentId/completion', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    if (!req.isGroupTeacher) {
      return res.status(403).json({ success: false, message: '仅老师或群主可查看完成情况' });
    }
    const group = req.groupInstance;
    const { assignmentId } = req.params;
    const assignment = await GroupAssignment.findOne({
      _id: assignmentId,
      groupId: group._id,
    }).lean();
    if (!assignment) {
      return res.status(404).json({ success: false, message: '作业不存在' });
    }
    const memberIds = group.members
      .filter((m) => m.status === 'active')
      .map((m) => m.userId.toString?.() || m.userId._id?.toString?.());
    const submissions = await AssignmentSubmission.find({ assignmentId })
      .sort({ submittedAt: -1 })
      .lean();
    const submittedUserIds = new Set(submissions.map((s) => s.userId));
    const userMap = await User.find({ _id: { $in: [...submittedUserIds, ...memberIds] } })
      .select('name email')
      .lean()
      .then((users) => new Map(users.map((u) => [u._id.toString(), u])));
    const submitted = submissions.map((s) => ({
      userId: s.userId,
      name: userMap.get(s.userId)?.name || userMap.get(s.userId)?.email || s.userId,
      submittedAt: s.submittedAt,
      totalQuestions: s.totalQuestions,
      totalCorrect: s.totalCorrect,
      score: s.score != null ? s.score : (s.totalQuestions ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : null),
    }));
    const notSubmitted = memberIds
      .filter((id) => !submittedUserIds.has(id))
      .map((userId) => ({
        userId,
        name: userMap.get(userId)?.name || userMap.get(userId)?.email || userId,
      }));
    res.json({
      success: true,
      data: {
        assignment: { _id: assignment._id, title: assignment.title, dueAt: assignment.dueAt, questionCount: assignment.questionCount },
        submitted,
        notSubmitted,
        totalMembers: memberIds.length,
        submittedCount: submitted.length,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/groups/:id/assignments/:assignmentId/completion error:', err);
    res.status(500).json({ success: false, message: err.message || '获取完成情况失败' });
  }
});

/**
 * POST /api/v3/groups/:id/assignments/:assignmentId/submit
 * 学生提交作业（交卷时调用）
 */
router.post('/:id/assignments/:assignmentId/submit', requireAuth, getGroupAndCheckMember, async (req, res) => {
  try {
    const userId = req.user.id;
    const { assignmentId } = req.params;
    const assignment = await GroupAssignment.findOne({
      _id: assignmentId,
      groupId: req.groupInstance._id,
    }).lean();
    if (!assignment) {
      return res.status(404).json({ success: false, message: '作业不存在' });
    }
    const { totalQuestions, totalCorrect } = req.body || {};
    if (totalQuestions == null || totalCorrect == null || totalQuestions < 0) {
      return res.status(400).json({ success: false, message: '请提供 totalQuestions 与 totalCorrect' });
    }
    const score = totalQuestions > 0 ? Math.round((Number(totalCorrect) / Number(totalQuestions)) * 100) : 0;
    const payload = {
      totalQuestions: Number(totalQuestions),
      totalCorrect: Number(totalCorrect),
      score,
      submittedAt: new Date(),
    };
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignmentId, userId },
      payload,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: submission });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/assignments/:assignmentId/submit error:', err);
    res.status(500).json({ success: false, message: err.message || '提交作业失败' });
  }
});

/**
 * GET /api/v3/groups/:id
 * 获取群组详情
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const groupInstance = await Group.findById(id);
    if (!groupInstance) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 检查权限（使用实例方法）
    const isOwner = groupInstance.ownerId.toString() === userId;
    const isMember = groupInstance.isMember(userId);
    if (!isOwner && !isMember) {
      return res.status(403).json({
        success: false,
        message: '无权访问此群组',
      });
    }

    // 获取填充后的数据
    const group = await Group.findById(id)
      .populate('ownerId', 'name email')
      .populate('members.userId', 'name email role')
      .populate('bankIds', 'name description')
      .populate('questionIds', 'content type')
      .lean();

    res.json({
      success: true,
      data: group,
    });
  } catch (err) {
    console.error('GET /api/v3/groups/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取群组详情失败',
    });
  }
});

/**
 * POST /api/v3/groups
 * 创建群组
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      type = 'custom',
      settings = {},
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '群组名称不能为空',
      });
    }

    // 生成群组代码
    const code = await Group.generateCode();

    const group = await Group.create({
      name: sanitizeString(name, { maxLength: 200 }),
      description: sanitizeString(description, { maxLength: 1000 }),
      code,
      ownerId: userId,
      type,
      settings: {
        allowStudentInvite: settings.allowStudentInvite || false,
        isPublic: settings.isPublic || false,
        requireApproval: settings.requireApproval || false,
        maxMembers: validateInt(settings.maxMembers, {
          min: 1,
          max: 1000,
          defaultValue: 100,
        }),
      },
      members: [
        {
          userId,
          role: 'teacher',
          status: 'active',
          joinedAt: new Date(),
        },
      ],
    });

    const populated = await Group.findById(group._id)
      .populate('ownerId', 'name email')
      .populate('members.userId', 'name email role')
      .lean();

    res.status(201).json({
      success: true,
      data: populated,
      message: '群组创建成功',
    });
  } catch (err) {
    console.error('POST /api/v3/groups error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '创建群组失败',
    });
  }
});

/**
 * POST /api/v3/groups/join
 * 通过群组代码加入群组（与前端「加入群组」按钮对应）
 */
router.post('/join', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: '请输入群组代码',
      });
    }

    const group = await Group.findOne({
      code: String(code).trim().toUpperCase(),
      status: 'active',
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组代码无效',
      });
    }

    if (group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: '已经是群组成员',
      });
    }

    const activeMembers = group.members.filter((m) => m.status === 'active');
    if (activeMembers.length >= (group.settings?.maxMembers || 100)) {
      return res.status(400).json({
        success: false,
        message: '群组已满',
      });
    }

    const status = group.settings?.requireApproval ? 'pending' : 'active';
    group.addMember(userId, 'student', status);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('members.userId', 'name email role')
      .lean();

    res.json({
      success: true,
      data: populated,
      message: status === 'pending' ? '已申请加入，等待审核' : '成功加入群组',
    });
  } catch (err) {
    console.error('POST /api/v3/groups/join error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '加入群组失败',
    });
  }
});

/**
 * PUT /api/v3/groups/:id
 * 更新群组信息（仅群主和老师）
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, settings } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 检查权限：只有群主或老师可以修改
    if (!group.isTeacher(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权修改此群组',
      });
    }

    if (name) {
      group.name = sanitizeString(name, { maxLength: 200 });
    }
    if (description !== undefined) {
      group.description = sanitizeString(description, { maxLength: 1000 });
    }
    if (settings) {
      if (settings.allowStudentInvite !== undefined) {
        group.settings.allowStudentInvite = settings.allowStudentInvite;
      }
      if (settings.isPublic !== undefined) {
        group.settings.isPublic = settings.isPublic;
      }
      if (settings.requireApproval !== undefined) {
        group.settings.requireApproval = settings.requireApproval;
      }
      if (settings.maxMembers !== undefined) {
        group.settings.maxMembers = validateInt(settings.maxMembers, {
          min: 1,
          max: 1000,
          defaultValue: 100,
        });
      }
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate('ownerId', 'name email')
      .populate('members.userId', 'name email role')
      .lean();

    res.json({
      success: true,
      data: populated,
      message: '群组更新成功',
    });
  } catch (err) {
    console.error('PUT /api/v3/groups/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '更新群组失败',
    });
  }
});

/**
 * DELETE /api/v3/groups/:id
 * 删除群组（仅群主）
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 只有群主可以删除
    if (group.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权删除此群组',
      });
    }

    group.status = 'deleted';
    await group.save();

    res.json({
      success: true,
      message: '群组删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/groups/:id error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '删除群组失败',
    });
  }
});

/**
 * POST /api/v3/groups/:id/members
 * 添加成员（加入群组）
 */
router.post('/:id/members', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { memberUserId, role = 'student' } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 检查是否已经是成员
    if (group.isMember(memberUserId || userId)) {
      return res.status(400).json({
        success: false,
        message: '已经是群组成员',
      });
    }

    // 检查成员数限制
    const activeMembers = group.members.filter((m) => m.status === 'active');
    if (activeMembers.length >= group.settings.maxMembers) {
      return res.status(400).json({
        success: false,
        message: '群组已满',
      });
    }

    // 检查权限
    const targetUserId = memberUserId || userId;
    if (memberUserId && !group.isTeacher(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权添加其他成员',
      });
    }

    // 检查是否需要审核
    const status = group.settings.requireApproval && !group.isTeacher(userId)
      ? 'pending'
      : 'active';

    group.addMember(targetUserId, role, status);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('members.userId', 'name email role')
      .lean();

    res.json({
      success: true,
      data: populated,
      message: status === 'pending' ? '已申请加入，等待审核' : '成功加入群组',
    });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/members error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '添加成员失败',
    });
  }
});

/**
 * POST /api/v3/groups/:id/join
 * 通过代码加入群组
 */
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '请输入群组代码',
      });
    }

    const group = await Group.findOne({
      code: code.toUpperCase(),
      status: 'active',
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组代码无效',
      });
    }

    // 检查是否已经是成员
    if (group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: '已经是群组成员',
      });
    }

    // 检查成员数限制
    const activeMembers = group.members.filter((m) => m.status === 'active');
    if (activeMembers.length >= group.settings.maxMembers) {
      return res.status(400).json({
        success: false,
        message: '群组已满',
      });
    }

    // 检查是否需要审核
    const status = group.settings.requireApproval ? 'pending' : 'active';

    group.addMember(userId, 'student', status);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate('members.userId', 'name email role')
      .lean();

    res.json({
      success: true,
      data: populated,
      message: status === 'pending' ? '已申请加入，等待审核' : '成功加入群组',
    });
  } catch (err) {
    console.error('POST /api/v3/groups/join error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '加入群组失败',
    });
  }
});

/**
 * DELETE /api/v3/groups/:id/members/:memberId
 * 移除成员（退出群组或老师移除成员）
 */
router.delete('/:id/members/:memberId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, memberId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 检查权限：只能移除自己，或老师可以移除学生
    const isRemovingSelf = memberId === userId;
    const isTeacher = group.isTeacher(userId);
    const targetMember = group.members.find(
      (m) => m.userId.toString() === memberId
    );

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: '成员不存在',
      });
    }

    if (!isRemovingSelf && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: '无权移除此成员',
      });
    }

    // 不能移除群主
    if (group.ownerId.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: '不能移除群主',
      });
    }

    group.removeMember(memberId);
    await group.save();

    res.json({
      success: true,
      message: '成员移除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/groups/:id/members/:memberId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '移除成员失败',
    });
  }
});

/**
 * PUT /api/v3/groups/:id/members/:memberId/role
 * 修改成员角色（仅群主）
 */
router.put('/:id/members/:memberId/role', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, memberId } = req.params;
    const { role } = req.body;

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色',
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 只有群主可以修改角色
    if (group.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权修改成员角色',
      });
    }

    const member = group.members.find(
      (m) => m.userId.toString() === memberId
    );
    if (!member) {
      return res.status(404).json({
        success: false,
        message: '成员不存在',
      });
    }

    member.role = role;
    await group.save();

    res.json({
      success: true,
      message: '成员角色修改成功',
    });
  } catch (err) {
    console.error('PUT /api/v3/groups/:id/members/:memberId/role error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '修改成员角色失败',
    });
  }
});

/**
 * POST /api/v3/groups/:id/banks
 * 关联题库到群组（仅老师）
 */
router.post('/:id/banks', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { bankId } = req.body;

    if (!bankId) {
      return res.status(400).json({
        success: false,
        message: '请提供题库ID',
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 检查权限：只有老师可以关联题库
    if (!group.isTeacher(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权关联题库',
      });
    }

    // 检查题库是否存在
    const bank = await QuestionBank.findById(bankId);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 添加到关联列表（去重）
    if (!group.bankIds.includes(bankId)) {
      group.bankIds.push(bankId);
      await group.save();
    }

    res.json({
      success: true,
      message: '题库关联成功',
    });
  } catch (err) {
    console.error('POST /api/v3/groups/:id/banks error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '关联题库失败',
    });
  }
});

/**
 * DELETE /api/v3/groups/:id/banks/:bankId
 * 取消题库关联（仅老师）
 */
router.delete('/:id/banks/:bankId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, bankId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在',
      });
    }

    // 检查权限
    if (!group.isTeacher(userId)) {
      return res.status(403).json({
        success: false,
        message: '无权取消关联',
      });
    }

    group.bankIds = group.bankIds.filter(
      (id) => id.toString() !== bankId
    );
    await group.save();

    res.json({
      success: true,
      message: '取消关联成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/groups/:id/banks/:bankId error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '取消关联失败',
    });
  }
});

export default router;

