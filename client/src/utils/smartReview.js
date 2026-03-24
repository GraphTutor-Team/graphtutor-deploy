/**
 * GraphTutor V3.0 - 智能复习系统
 * 
 * 功能：基于遗忘曲线的间隔重复算法
 */

/**
 * 遗忘曲线间隔重复算法
 * 基于SuperMemo 2算法
 */
export class SpacedRepetition {
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
    newEF = Math.max(1.3, newEF); // 最小值为1.3

    // 计算新间隔
    let newInterval;
    if (q < 3) {
      // 回答错误，重置
      newInterval = 1;
      repetitions = 0;
    } else {
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEF);
      }
      repetitions += 1;
    }

    return {
      interval: newInterval,
      repetitions,
      easinessFactor: newEF,
      nextReviewDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * 计算复习优先级
   * @param {Object} wrongQuestion - 错题数据
   * @returns {number} 优先级分数（0-100，越高越紧急）
   */
  static calculatePriority(wrongQuestion) {
    const {
      errorCount = 0,
      lastErrorAt,
      lastReviewAt,
      nextReviewDate,
      mastery = 0,
    } = wrongQuestion;

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
    priority += Math.min(20, (1 - mastery) * 20);

    return Math.min(100, priority);
  }

  /**
   * 生成智能复习计划
   * @param {Array} wrongQuestions - 错题列表
   * @param {Object} options - 选项
   * @returns {Object} 复习计划
   */
  static generateReviewPlan(wrongQuestions, options = {}) {
    const { days = 7, questionsPerDay = 10 } = options;

    // 计算每个错题的优先级
    const questionsWithPriority = wrongQuestions.map(q => ({
      ...q,
      priority: this.calculatePriority(q),
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
          questionId: question.questionId || question._id,
          knowledgeNodeId: question.knowledgeNodeId,
          priority: question.priority,
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
   * 获取今日需要复习的题目
   * @param {Array} wrongQuestions - 错题列表
   * @returns {Array} 今日需要复习的题目
   */
  static getTodayReviewQuestions(wrongQuestions) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return wrongQuestions.filter(q => {
      if (!q.nextReviewDate) return true; // 没有复习计划的需要复习

      const reviewDate = new Date(q.nextReviewDate);
      reviewDate.setHours(0, 0, 0, 0);

      return reviewDate <= today;
    }).sort((a, b) => {
      // 按优先级排序
      return this.calculatePriority(b) - this.calculatePriority(a);
    });
  }
}

/**
 * 获取今日需要复习的题目（独立函数导出）
 * @param {Array} wrongQuestions - 错题列表
 * @returns {Array} 今日需要复习的题目
 */
export function getTodayReviewQuestions(wrongQuestions) {
  return SpacedRepetition.getTodayReviewQuestions(wrongQuestions);
}

/**
 * 更新错题的复习计划
 * @param {Object} wrongQuestion - 错题数据
 * @param {number} quality - 回答质量（0-5）
 * @returns {Object} 更新后的复习计划
 */
export function updateReviewPlan(wrongQuestion, quality) {
  const {
    easinessFactor = 2.5,
    interval = 1,
    repetitions = 0,
  } = wrongQuestion.reviewPlan || {};

  const result = SpacedRepetition.calculateNextReview({
    easinessFactor,
    interval,
    repetitions,
    quality,
  });

  return {
    ...wrongQuestion.reviewPlan,
    easinessFactor: result.easinessFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    lastReviewAt: new Date(),
    nextReviewDate: result.nextReviewDate,
  };
}

// 默认导出（包含所有导出）
export default {
  SpacedRepetition,
  getTodayReviewQuestions,
  updateReviewPlan,
};

