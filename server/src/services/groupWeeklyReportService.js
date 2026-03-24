/**
 * GraphTutor V3.0 - 小组周报推送服务
 *
 * 每周为各小组生成「本周学习排名与贡献度」摘要，并推送给组内成员
 */

import Group from '../models/Group.js';
import Record from '../models/Record.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';

/**
 * 获取小组过去一周成员答题统计（用于周报）
 * @param {string} groupId
 * @param {number} days
 * @returns {Promise<Array<{ userId, totalQuestions, correctQuestions, accuracy }>>}
 */
async function getGroupMemberStats(groupId, days = 7) {
  const group = await Group.findById(groupId).lean();
  if (!group) return [];
  const memberIds = (group.members || [])
    .filter((m) => m.status === 'active')
    .map((m) => (m.userId && m.userId._id ? m.userId._id.toString() : m.userId?.toString?.() || m.userId));
  if (memberIds.length === 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);
  const pipeline = [
    { $match: { userId: { $in: memberIds }, createdAt: { $gte: since } } },
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
          },
        },
      },
    },
    { $sort: { totalQuestions: -1, accuracy: -1 } },
  ];
  return Record.aggregate(pipeline);
}

/**
 * 为单个小组生成周报并推送给所有成员
 * @param {string} groupId
 * @returns {Promise<{ sent: number, memberCount: number }>}
 */
export async function pushGroupWeeklyReport(groupId) {
  const group = await Group.findById(groupId).select('name members').lean();
  if (!group) return { sent: 0, memberCount: 0 };
  const memberIds = (group.members || [])
    .filter((m) => m.status === 'active')
    .map((m) => (m.userId && m.userId._id ? m.userId._id.toString() : m.userId?.toString?.() || m.userId));
  if (memberIds.length === 0) return { sent: 0, memberCount: 0 };

  const stats = await getGroupMemberStats(groupId, 7);
  const userIds = stats.map((s) => s.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('name').lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const top3 = stats.slice(0, 3).map((s, i) => {
    const name = userMap.get(s.userId)?.name || `用户${String(s.userId).slice(-4)}`;
    return `${i + 1}. ${name}：${s.totalQuestions || 0} 题，正确率 ${Math.round((s.accuracy || 0) * 10) / 10}%`;
  });
  const content = top3.length > 0
    ? `本周小组学习排名：\n${top3.join('\n')}\n\n点击查看完整排行榜。`
    : '本周暂无答题记录，一起加油！';

  let sent = 0;
  for (const uid of memberIds) {
    try {
      await createNotification({
        userId: uid,
        type: 'reminder',
        title: `【${group.name}】本周学习周报`,
        content,
        link: `/groups`,
        relatedId: groupId.toString(),
        relatedType: null,
        priority: 3,
      });
      sent++;
    } catch (err) {
      console.error('pushGroupWeeklyReport createNotification error:', err?.message);
    }
  }
  return { sent, memberCount: memberIds.length };
}

/**
 * 为所有活跃小组推送周报（过去 7 天内有成员答题的小组）
 */
export async function runGroupWeeklyReportPush() {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const activeUserIds = await Record.distinct('userId', { createdAt: { $gte: since } });
  if (activeUserIds.length === 0) return { groupCount: 0, totalSent: 0 };
  const groups = await Group.find({
    status: 'active',
    'members.status': 'active',
    'members.userId': { $in: activeUserIds },
  }).select('_id').lean();
  const groupIds = groups.map((g) => g._id.toString());
  let totalSent = 0;
  for (const gid of groupIds) {
    try {
      const result = await pushGroupWeeklyReport(gid);
      totalSent += result.sent;
    } catch (err) {
      console.error('runGroupWeeklyReportPush group error:', err?.message);
    }
  }
  return { groupCount: groupIds.length, totalSent };
}
