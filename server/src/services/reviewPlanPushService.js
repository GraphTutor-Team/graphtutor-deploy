/**
 * GraphTutor V3.0 - 复习计划推送服务
 *
 * 功能：按周/月为活跃用户生成复习建议摘要，并写入通知中心（自动按周/月推送复习计划）
 */

import Record from '../models/Record.js';
import { getPathRecommendations, getExamPrediction } from './enhancedLearningAnalytics.js';
import { createNotification } from './notificationService.js';

/**
 * 获取近期有作答记录的活跃用户 ID 列表
 * @param {number} days - 统计最近多少天内有记录
 * @returns {Promise<string[]>}
 */
export async function getActiveUserIds(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const ids = await Record.distinct('userId', { createdAt: { $gte: since } });
  return ids.filter(Boolean);
}

/**
 * 为单个用户生成并推送「本周复习计划」通知
 * @param {string} userId
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export async function pushWeeklyReviewPlanToUser(userId) {
  try {
    const pathList = await getPathRecommendations(userId, { days: 7, maxRecommendations: 5 });
    const parts = ['本周复习建议：'];
    if (pathList && pathList.length > 0) {
      pathList.slice(0, 5).forEach((p, i) => {
        parts.push(`${i + 1}. ${p.name || p.key}：${p.reason || '建议巩固'}`);
      });
      parts.push('前往「学习分析」查看完整路径推荐与考前预测。');
    } else {
      parts.push('暂无推荐，多做练习后即可获得个性化路径推荐。');
    }
    const content = parts.join('\n');
    await createNotification({
      userId,
      type: 'reminder',
      title: '本周复习计划',
      content,
      link: '/analytics',
      relatedType: null,
      relatedId: null,
      priority: 4,
    });
    return { sent: true };
  } catch (err) {
    console.error('pushWeeklyReviewPlanToUser error:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/**
 * 为单个用户生成并推送「本月学习建议」通知
 * @param {string} userId
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export async function pushMonthlyReviewPlanToUser(userId) {
  try {
    const [pathList, exam] = await Promise.all([
      getPathRecommendations(userId, { days: 30, maxRecommendations: 5 }),
      getExamPrediction(userId, { days: 30, totalQuestions: 20 }),
    ]);
    const parts = ['本月学习建议：'];
    if (pathList && pathList.length > 0) {
      parts.push('推荐下一步学习：');
      pathList.slice(0, 5).forEach((p, i) => {
        parts.push(`· ${p.name || p.key}：${p.reason || '建议巩固'}`);
      });
    }
    if (exam?.nodes?.length > 0) {
      parts.push(`考前预测：${exam.nodes.length} 个薄弱知识点建议重点复习，可到学习分析页生成预测卷。`);
    }
    if (pathList?.length === 0 && (!exam?.nodes || exam.nodes.length === 0)) {
      parts.push('保持练习，系统将根据学习数据为你生成更精准的建议。');
    }
    parts.push('详情请前往「学习分析」。');
    const content = parts.join('\n');
    await createNotification({
      userId,
      type: 'reminder',
      title: '本月学习建议',
      content,
      link: '/analytics',
      relatedType: null,
      relatedId: null,
      priority: 4,
    });
    return { sent: true };
  } catch (err) {
    console.error('pushMonthlyReviewPlanToUser error:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/**
 * 为所有近期活跃用户推送本周复习计划（供定时任务调用）
 * @param {number} activeDays - 视为活跃的天数
 * @returns {Promise<{ total: number, sent: number, failed: number }>}
 */
export async function runWeeklyPush(activeDays = 30) {
  const userIds = await getActiveUserIds(activeDays);
  let sent = 0;
  let failed = 0;
  for (const uid of userIds) {
    const result = await pushWeeklyReviewPlanToUser(uid);
    if (result.sent) sent++;
    else failed++;
  }
  return { total: userIds.length, sent, failed };
}

/**
 * 为所有近期活跃用户推送本月学习建议（供定时任务调用）
 * @param {number} activeDays - 视为活跃的天数
 * @returns {Promise<{ total: number, sent: number, failed: number }>}
 */
export async function runMonthlyPush(activeDays = 30) {
  const userIds = await getActiveUserIds(activeDays);
  let sent = 0;
  let failed = 0;
  for (const uid of userIds) {
    const result = await pushMonthlyReviewPlanToUser(uid);
    if (result.sent) sent++;
    else failed++;
  }
  return { total: userIds.length, sent, failed };
}
