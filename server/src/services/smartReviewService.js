/**
 * GraphTutor V3.0 - 智能复习服务
 * 
 * 功能：提供基于SuperMemo算法的智能复习功能
 */

import WrongQuestion from '../models/WrongQuestion.js';
import Question from '../models/Question.js';
import { createRealtimeNotification } from './realtimeNotificationService.js';

/**
 * SuperMemo 2算法实现
 */
class SuperMemo2 {
  /**
   * 计算下次复习时间
   * @param {Object} params - 参数
   * @param {number} params.easinessFactor - 简易因子（默认2.5）
   * @param {number} params.interval - 当前间隔（天数）
   * @param {number} params.repetitions - 重复次数
   * @param {number} params.quality - 回答质量（0-5，5最好）
   * @returns {Object} 新的间隔和重复次数
   */
  static calculateNextReview({ easinessFactor = 2.5, interval = 1, repetitions = 0, quality }) {
    // 质量转换为0-5范围
    const q = Math.max(0, Math.min(5, quality));

    // 更新简易因子
    let newEF = easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    newEF = Math.max(1.3, Math.min(2.5, newEF)); // 限制在1.3-2.5之间

    // 计算新间隔
    let newInterval;
    let newRepetitions = repetitions;

    if (q < 3) {
      // 回答错误，重置
      newInterval = 1;
      newRepetitions = 0;
    } else {
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEF);
      }
      newRepetitions += 1;
    }

    return {
      interval: newInterval,
      repetitions: newRepetitions,
      easinessFactor: newEF,
      nextReviewDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * 获取今日需要复习的题目
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @param {number} options.limit - 最大数量
 * @param {boolean} options.includeMastered - 是否包含已掌握的题目
 * @returns {Promise<Array>} 今日需要复习的题目列表
 */
export async function getTodayReviewQuestions(userId, options = {}) {
  try {
    const {
      limit = 50,
      includeMastered = false,
    } = options;

    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    const query = {
      userId: String(userId),
      $or: [
        { 'reviewPlan.nextReviewDate': { $lte: tomorrow } },
        { nextReviewAt: { $lte: tomorrow } },
        {
          $and: [
            { $or: [{ 'reviewPlan.nextReviewDate': { $exists: false } }, { 'reviewPlan.nextReviewDate': null }] },
            { $or: [{ nextReviewAt: { $exists: false } }, { nextReviewAt: null }] },
          ],
        },
      ],
    };

    if (!includeMastered) {
      query.masteryStatus = { $ne: 'mastered' };
    }

    const wrongQuestions = await WrongQuestion.find(query)
      .sort({
        'reviewPlan.nextReviewDate': 1,
        nextReviewAt: 1,
        errorCount: -1,
        mastery: 1,
      })
      .limit(Math.min(limit, 100))
      .lean();

    const questionsWithPriority = wrongQuestions.map((q) => ({
      ...q,
      priority: calculatePriority(q),
    }));

    questionsWithPriority.sort((a, b) => b.priority - a.priority);
    return questionsWithPriority;
  } catch (error) {
    console.error('getTodayReviewQuestions error:', error);
    return [];
  }
}

/**
 * 计算复习优先级
 * @param {Object} wrongQuestion - 错题数据
 * @returns {number} 优先级分数（0-100，越高越紧急）
 */
function calculatePriority(wrongQuestion) {
  const {
    errorCount = 0,
    lastErrorAt,
    lastReviewAt,
    mastery = 0,
  } = wrongQuestion;

  const nextReviewDate = wrongQuestion.reviewPlan?.nextReviewDate || wrongQuestion.nextReviewAt;

  let priority = 0;

  // 1. 错误次数越多，优先级越高（0-30分）
  priority += Math.min(30, errorCount * 5);

  // 2. 距离上次错误时间越长，优先级越高（0-20分）
  if (lastErrorAt) {
    const daysSinceError = Math.floor((Date.now() - new Date(lastErrorAt)) / (24 * 60 * 60 * 1000));
    priority += Math.min(20, daysSinceError * 2);
  }

  // 3. 如果到了复习时间，优先级很高（0-30分）
  if (nextReviewDate) {
    const daysUntilReview = Math.floor((new Date(nextReviewDate) - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntilReview <= 0) {
      priority += 30; // 已过期，高优先级
    } else if (daysUntilReview <= 3) {
      priority += 20; // 即将到期
    }
  } else {
    // 没有复习计划，需要安排
    priority += 25;
  }

  // 4. 掌握度越低，优先级越高（0-20分）
  priority += Math.min(20, (1 - mastery / 100) * 20);

  return Math.min(100, priority);
}

/**
 * 更新错题的复习计划（基于回答质量）
 * @param {string} wrongQuestionId - 错题ID
 * @param {number} quality - 回答质量（0-5，5最好）
 * @returns {Promise<Object>} 更新后的错题
 */
export async function updateReviewPlan(wrongQuestionId, quality) {
  const wrongQuestion = await WrongQuestion.findById(wrongQuestionId);
  if (!wrongQuestion) {
    throw new Error('错题不存在');
  }

  // 使用SuperMemo算法计算新的复习计划
  const reviewPlan = wrongQuestion.reviewPlan || {
    easinessFactor: 2.5,
    interval: 1,
    repetitions: 0,
  };

  const result = SuperMemo2.calculateNextReview({
    easinessFactor: reviewPlan.easinessFactor,
    interval: reviewPlan.interval,
    repetitions: reviewPlan.repetitions,
    quality,
  });

  // 更新复习计划
  wrongQuestion.reviewPlan = {
    easinessFactor: result.easinessFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    nextReviewDate: result.nextReviewDate,
  };

  // 更新nextReviewAt（向后兼容）
  wrongQuestion.nextReviewAt = result.nextReviewDate;
  wrongQuestion.lastReviewAt = new Date();

  // 更新掌握度
  if (quality >= 3) {
    wrongQuestion.mastery = Math.min(100, wrongQuestion.mastery + (quality - 2) * 10);
    wrongQuestion.reviewCount += 1;
  } else {
    wrongQuestion.mastery = Math.max(0, wrongQuestion.mastery - 10);
    wrongQuestion.errorCount += 1;
  }

  await wrongQuestion.save();

  return wrongQuestion;
}

/**
 * 生成智能复习计划
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @param {number} options.days - 计划天数（默认7）
 * @param {number} options.questionsPerDay - 每天题目数（默认10）
 * @returns {Promise<Object>} 复习计划
 */
export async function generateReviewPlan(userId, options = {}) {
  const {
    days = 7,
    questionsPerDay = 10,
  } = options;

  // 获取所有未掌握的错题
  const wrongQuestions = await WrongQuestion.find({
    userId,
    isMastered: false,
  })
    .populate('questionId')
    .lean();

  // 计算每个错题的优先级
  const questionsWithPriority = wrongQuestions.map(q => ({
    ...q,
    priority: calculatePriority(q),
  }));

  // 按优先级排序
  questionsWithPriority.sort((a, b) => b.priority - a.priority);

  // 生成每日计划
  const plan = [];
  let questionIndex = 0;

  for (let day = 1; day <= days; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day - 1);
    date.setHours(0, 0, 0, 0);

    const dayQuestions = [];
    const targetCount = Math.ceil(questionsPerDay * (1 + Math.random() * 0.2 - 0.1)); // 允许10%波动

    for (let i = 0; i < targetCount && questionIndex < questionsWithPriority.length; i++) {
      const question = questionsWithPriority[questionIndex];
      dayQuestions.push({
        wrongQuestionId: question._id.toString(),
        questionId: question.questionId?._id || question.questionId,
        knowledgeNodeId: question.knowledgeNodeId,
        priority: question.priority,
        mastery: question.mastery,
      });
      questionIndex++;
    }

    plan.push({
      day,
      date: date.toISOString().split('T')[0],
      questions: dayQuestions,
      count: dayQuestions.length,
    });
  }

  return {
    plan,
    totalQuestions: questionIndex,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
}

/**
 * 检查并发送复习提醒
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} 发送的提醒数量
 */
export async function checkAndSendReviewReminders(userId) {
  const todayQuestions = await getTodayReviewQuestions(userId, { limit: 100 });

  if (todayQuestions.length === 0) {
    return 0;
  }

  // 发送实时通知
  try {
    await createRealtimeNotification({
      userId,
      type: 'review_reminder',
      title: '今日复习提醒',
      content: `您有 ${todayQuestions.length} 道题目需要复习`,
      data: {
        questionCount: todayQuestions.length,
        questions: todayQuestions.slice(0, 10).map(q => ({
          wrongQuestionId: q._id,
          questionId: q.questionId?._id || q.questionId,
        })),
      },
    });
  } catch (err) {
    console.error('发送复习提醒失败:', err);
  }

  return todayQuestions.length;
}

/**
 * 批量初始化复习计划（为没有复习计划的错题创建计划）
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} 初始化的数量
 */
export async function initializeReviewPlans(userId) {
  const wrongQuestions = await WrongQuestion.find({
    userId,
    $or: [
      { 'reviewPlan.nextReviewDate': { $exists: false } },
      { nextReviewAt: { $exists: false } },
    ],
  });

  let count = 0;
  for (const wrongQuestion of wrongQuestions) {
    // 根据掌握度估算quality
    let quality = 2;
    if (wrongQuestion.mastery >= 80) {
      quality = 5;
    } else if (wrongQuestion.mastery >= 50) {
      quality = 4;
    }

    wrongQuestion.calculateNextReview(quality);
    await wrongQuestion.save();
    count++;
  }

  return count;
}

export { SuperMemo2 };

