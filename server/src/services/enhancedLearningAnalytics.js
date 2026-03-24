/**
 * GraphTutor V3.0 - 增强学习分析服务
 * 
 * 功能：提供深度学习数据分析，包括学习效率、学习习惯、AI建议等
 */

import Record from '../models/Record.js';
import WrongQuestion from '../models/WrongQuestion.js';
import Question from '../models/Question.js';
import LearningGoal from '../models/LearningGoal.js';
import KnowledgeNode from '../models/KnowledgeNode.js';
import User from '../models/User.js';
import { getKnowledgeMastery, getLearningTrend } from './learningAnalytics.js';

/**
 * 分析学习效率
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项 { days }
 * @returns {Promise<Object>} 学习效率分析结果
 */
export async function analyzeStudyEfficiency(userId, options = {}) {
  try {
    const { days = 30 } = options;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 获取学习记录
    const records = await Record.find({
      userId,
      createdAt: { $gte: since },
    }).lean();

    // 获取错题数据
    const wrongQuestions = await WrongQuestion.find({ userId }).lean();

    // 计算基础指标
    const totalQuestions = records.length;
    const totalCorrect = records.filter(r => r.isCorrect).length;
    const totalWrong = totalQuestions - totalCorrect;
    const totalDuration = records.reduce((sum, r) => sum + (r.timeSpentMs || 0), 0) / 1000 / 60; // 转换为分钟

    // 计算效率指标
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;
    const avgTimePerQuestion = totalQuestions > 0 ? totalDuration / totalQuestions : 0;
    const questionsPerHour = totalDuration > 0 ? (totalQuestions / totalDuration) * 60 : 0;
    const correctPerHour = totalDuration > 0 ? (totalCorrect / totalDuration) * 60 : 0;

    // 学习强度分析
    const studyDays = new Set(records.map(r => r.createdAt.toISOString().split('T')[0])).size;
    const avgQuestionsPerDay = studyDays > 0 ? totalQuestions / studyDays : 0;
    const intensity = calculateIntensity(avgQuestionsPerDay, avgTimePerQuestion);

    // 学习效果分析
    const effectiveness = calculateEffectiveness(accuracy, avgTimePerQuestion, questionsPerHour);

    // 知识点掌握效率
    const mastery = await getKnowledgeMastery(userId, { days });
    const knowledgeEfficiency = calculateKnowledgeEfficiency(mastery.knowledgeNodes);

    // 错题处理效率
    const wrongQuestionEfficiency = calculateWrongQuestionEfficiency(wrongQuestions, records);

    // 生成效率评分（0-100）
    const efficiencyScore = calculateEfficiencyScore({
      accuracy,
      questionsPerHour,
      intensity,
      effectiveness,
      knowledgeEfficiency,
      wrongQuestionEfficiency,
    });

    // 生成建议
    const recommendations = generateEfficiencyRecommendations({
      accuracy,
      questionsPerHour,
      intensity,
      effectiveness,
      knowledgeEfficiency,
      wrongQuestionEfficiency,
      efficiencyScore,
    });

    return {
      score: efficiencyScore,
      level: getEfficiencyLevel(efficiencyScore),
      metrics: {
        accuracy: Math.round(accuracy * 100) / 100,
        questionsPerHour: Math.round(questionsPerHour * 10) / 10,
        correctPerHour: Math.round(correctPerHour * 10) / 10,
        avgTimePerQuestion: Math.round(avgTimePerQuestion * 10) / 10,
        studyDays,
        avgQuestionsPerDay: Math.round(avgQuestionsPerDay * 10) / 10,
      },
      intensity,
      effectiveness,
      knowledgeEfficiency,
      wrongQuestionEfficiency,
      recommendations,
    };
  } catch (error) {
    console.error('analyzeStudyEfficiency error:', error);
    throw error;
  }
}

/**
 * 分析学习习惯
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项 { days }
 * @returns {Promise<Object>} 学习习惯分析结果
 */
export async function analyzeStudyHabits(userId, options = {}) {
  try {
    const { days = 30 } = options;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 获取学习记录
    const records = await Record.find({
      userId,
      createdAt: { $gte: since },
    }).lean();

    // 学习时间分布分析
    const timeDistribution = analyzeTimeDistribution(records);

    // 学习频率分析
    const frequency = analyzeFrequency(records, days);

    // 学习时长分析
    const duration = analyzeDuration(records);

    // 学习一致性分析
    const consistency = analyzeConsistency(records, days);

    // 学习时段偏好
    const timePreference = analyzeTimePreference(records);

    // 学习模式识别
    const patterns = identifyPatterns(records);

    return {
      timeDistribution,
      frequency,
      duration,
      consistency,
      timePreference,
      patterns,
      summary: generateHabitSummary({
        frequency,
        duration,
        consistency,
        timePreference,
        patterns,
      }),
    };
  } catch (error) {
    console.error('analyzeStudyHabits error:', error);
    throw error;
  }
}

/**
 * 生成AI驱动的学习建议
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项 { days }
 * @returns {Promise<Object>} 学习建议
 */
export async function generateAILearningSuggestions(userId, options = {}) {
  try {
    const { days = 30 } = options;

    // 获取综合数据
    const [mastery, trend, efficiency, habits, wrongQuestions, goals] = await Promise.all([
      getKnowledgeMastery(userId, { days }),
      getLearningTrend(userId, days),
      analyzeStudyEfficiency(userId, { days }),
      analyzeStudyHabits(userId, { days }),
      WrongQuestion.find({ userId }).lean(),
      LearningGoal.find({ userId, status: 'active' }).lean(),
    ]);

    // 生成个性化建议
    const suggestions = [];

    // 1. 基于学习效率的建议
    if (efficiency.score < 60) {
      suggestions.push({
        category: '学习效率',
        priority: 'high',
        title: '提升学习效率',
        content: `你的学习效率评分为${efficiency.score}分，有较大提升空间。`,
        suggestions: efficiency.recommendations,
        action: '查看效率分析详情',
      });
    }

    // 2. 基于薄弱知识点的建议
    const weakNodes = mastery.knowledgeNodes.filter(n => n.accuracy < 60 && n.total >= 3);
    if (weakNodes.length > 0) {
      suggestions.push({
        category: '知识点强化',
        priority: 'high',
        title: '加强薄弱知识点',
        content: `你有${weakNodes.length}个知识点的掌握度较低（正确率<60%）。`,
        suggestions: [
          `重点复习：${weakNodes.slice(0, 3).map(n => n.knowledgeNodeId || '未知').join('、')}`,
          '使用智能复习计划系统性地复习',
          '针对薄弱知识点进行专项练习',
        ],
        action: '查看学习路径',
      });
    }

    // 3. 基于学习习惯的建议
    if (habits.consistency.score < 60) {
      suggestions.push({
        category: '学习习惯',
        priority: 'medium',
        title: '建立稳定的学习习惯',
        content: `你的学习一致性评分为${habits.consistency.score}分，建议保持每天学习的习惯。`,
        suggestions: [
          `最佳学习时段：${habits.timePreference.bestTime || '未识别'}`,
          '设置每日学习提醒',
          '制定每周学习计划',
        ],
        action: '设置学习提醒',
      });
    }

    // 4. 基于错题的建议
    const recentWrong = wrongQuestions.filter(q => {
      const lastError = new Date(q.lastErrorAt || q.createdAt);
      const daysAgo = (Date.now() - lastError) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    });
    if (recentWrong.length > 10) {
      suggestions.push({
        category: '错题复习',
        priority: 'high',
        title: '及时复习错题',
        content: `最近7天你有${recentWrong.length}道错题，需要加强复习。`,
        suggestions: [
          '使用智能复习系统制定复习计划',
          '优先复习高频错题',
          '定期回顾错题本',
        ],
        action: '前往错题本',
      });
    }

    // 5. 基于学习目标的建议
    if (goals.length > 0) {
      const behindGoals = goals.filter(g => {
        const deadline = new Date(g.deadline);
        const daysLeft = (deadline - Date.now()) / (1000 * 60 * 60 * 24);
        return daysLeft > 0 && daysLeft < 7 && g.progress < 80;
      });
      if (behindGoals.length > 0) {
        suggestions.push({
          category: '学习目标',
          priority: 'high',
          title: '目标即将到期',
          content: `你有${behindGoals.length}个学习目标即将到期，需要加快进度。`,
          suggestions: [
            '调整学习计划，优先完成即将到期的目标',
            '将大目标拆分为小目标',
            '每天检查目标进度',
          ],
          action: '查看学习目标',
        });
      }
    }

    // 6. 基于学习趋势的建议
    if (trend.length >= 7) {
      const recent = trend.slice(-7);
      const earlier = trend.slice(0, 7);
      const recentAvg = recent.reduce((sum, d) => sum + d.total, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, d) => sum + d.total, 0) / earlier.length;

      if (recentAvg < earlierAvg * 0.8) {
        suggestions.push({
          category: '学习趋势',
          priority: 'medium',
          title: '学习量下降',
          content: '最近的学习量有所下降，需要重新调整学习计划。',
          suggestions: [
            '设定每日学习目标',
            '寻找学习伙伴互相督促',
            '参加学习挑战活动',
          ],
          action: '查看学习统计',
        });
      }
    }

    // 按优先级排序
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return {
      suggestions: suggestions.slice(0, 10), // 返回前10个建议
      summary: {
        total: suggestions.length,
        high: suggestions.filter(s => s.priority === 'high').length,
        medium: suggestions.filter(s => s.priority === 'medium').length,
        low: suggestions.filter(s => s.priority === 'low').length,
      },
    };
  } catch (error) {
    console.error('generateAILearningSuggestions error:', error);
    throw error;
  }
}

// ========== 辅助函数 ==========

function calculateIntensity(avgQuestionsPerDay, avgTimePerQuestion) {
  let level = 'low';
  let score = 0;

  if (avgQuestionsPerDay >= 30) {
    level = 'high';
    score = 80 + Math.min(20, (avgQuestionsPerDay - 30) / 2);
  } else if (avgQuestionsPerDay >= 15) {
    level = 'medium';
    score = 50 + ((avgQuestionsPerDay - 15) / 15) * 30;
  } else {
    score = (avgQuestionsPerDay / 15) * 50;
  }

  return { level, score: Math.min(100, score) };
}

function calculateEffectiveness(accuracy, avgTimePerQuestion, questionsPerHour) {
  // 效果评分 = 正确率 * 0.5 + 速度评分 * 0.3 + 效率评分 * 0.2
  const accuracyScore = accuracy * 100;
  const speedScore = avgTimePerQuestion < 60 ? 100 : Math.max(0, 100 - (avgTimePerQuestion - 60) / 2);
  const efficiencyScore = questionsPerHour > 20 ? 100 : (questionsPerHour / 20) * 100;

  const score = accuracyScore * 0.5 + speedScore * 0.3 + efficiencyScore * 0.2;
  return { score: Math.min(100, score) };
}

function calculateKnowledgeEfficiency(knowledgeNodes) {
  if (knowledgeNodes.length === 0) return { score: 0, masteredRate: 0 };

  const mastered = knowledgeNodes.filter(n => n.accuracy >= 80).length;
  const masteredRate = mastered / knowledgeNodes.length;

  return {
    score: masteredRate * 100,
    masteredRate,
    total: knowledgeNodes.length,
    mastered,
  };
}

function calculateWrongQuestionEfficiency(wrongQuestions, records) {
  if (wrongQuestions.length === 0) return { score: 100, reviewRate: 1 };

  const recentWrong = wrongQuestions.filter(q => {
    const lastError = new Date(q.lastErrorAt || q.createdAt);
    const daysAgo = (Date.now() - lastError) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });

  const reviewed = wrongQuestions.filter(q => q.reviewCount > 0).length;
  const reviewRate = wrongQuestions.length > 0 ? reviewed / wrongQuestions.length : 0;

  return {
    score: reviewRate * 100,
    reviewRate,
    total: wrongQuestions.length,
    reviewed,
    recentWrong: recentWrong.length,
  };
}

function calculateEfficiencyScore(metrics) {
  const {
    accuracy,
    questionsPerHour,
    intensity,
    effectiveness,
    knowledgeEfficiency,
    wrongQuestionEfficiency,
  } = metrics;

  // 综合评分 = 正确率 * 0.3 + 速度 * 0.2 + 强度 * 0.15 + 效果 * 0.15 + 知识点 * 0.1 + 错题 * 0.1
  const score =
    accuracy * 100 * 0.3 +
    Math.min(100, (questionsPerHour / 30) * 100) * 0.2 +
    intensity.score * 0.15 +
    effectiveness.score * 0.15 +
    knowledgeEfficiency.score * 0.1 +
    wrongQuestionEfficiency.score * 0.1;

  return Math.min(100, Math.round(score));
}

function getEfficiencyLevel(score) {
  if (score >= 80) return '优秀';
  if (score >= 60) return '良好';
  if (score >= 40) return '一般';
  return '较低';
}

function generateEfficiencyRecommendations(metrics) {
  const recommendations = [];
  const { accuracy, questionsPerHour, intensity, effectiveness, knowledgeEfficiency, wrongQuestionEfficiency, efficiencyScore } = metrics;

  if (accuracy < 0.7) {
    recommendations.push('建议加强基础知识学习，提高正确率');
  }

  if (questionsPerHour < 15) {
    recommendations.push('建议提高答题速度，增加练习量');
  }

  if (intensity.score < 50) {
    recommendations.push('建议增加每日学习量，保持学习强度');
  }

  if (effectiveness.score < 60) {
    recommendations.push('建议优化学习方法，提高学习效果');
  }

  if (knowledgeEfficiency.score < 60) {
    recommendations.push('建议重点复习薄弱知识点，提高掌握度');
  }

  if (wrongQuestionEfficiency.score < 50) {
    recommendations.push('建议及时复习错题，使用智能复习系统');
  }

  return recommendations;
}

function analyzeTimeDistribution(records) {
  const hourCounts = {};
  records.forEach(r => {
    const hour = new Date(r.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const distribution = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count);

  return {
    distribution,
    peakHour: distribution[0]?.hour || 0,
  };
}

function analyzeFrequency(records, days) {
  const studyDays = new Set(records.map(r => r.createdAt.toISOString().split('T')[0])).size;
  const frequency = studyDays / days;
  const avgQuestionsPerDay = studyDays > 0 ? records.length / studyDays : 0;

  return {
    studyDays,
    frequency: Math.round(frequency * 100) / 100,
    avgQuestionsPerDay: Math.round(avgQuestionsPerDay * 10) / 10,
    level: frequency >= 0.7 ? 'high' : frequency >= 0.4 ? 'medium' : 'low',
  };
}

function analyzeDuration(records) {
  const totalMinutes = records.reduce((sum, r) => sum + (r.timeSpentMs || 0), 0) / 1000 / 60;
  const avgMinutes = records.length > 0 ? totalMinutes / records.length : 0;
  const studyDays = new Set(records.map(r => r.createdAt.toISOString().split('T')[0])).size;
  const avgDailyMinutes = studyDays > 0 ? totalMinutes / studyDays : 0;

  return {
    totalMinutes: Math.round(totalMinutes),
    avgMinutes: Math.round(avgMinutes * 10) / 10,
    avgDailyMinutes: Math.round(avgDailyMinutes * 10) / 10,
  };
}

function analyzeConsistency(records, days) {
  const studyDays = new Set(records.map(r => r.createdAt.toISOString().split('T')[0])).size;
  const consistency = studyDays / days;
  const score = consistency * 100;

  return {
    score: Math.round(score),
    level: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
    studyDays,
    totalDays: days,
  };
}

function analyzeTimePreference(records) {
  const hourCounts = {};
  records.forEach(r => {
    const hour = new Date(r.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const bestHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    bestTime: bestHour ? `${bestHour}:00` : null,
    distribution: Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
    })),
  };
}

function identifyPatterns(records) {
  const patterns = [];

  // 检查是否有固定的学习时间
  const hourCounts = {};
  records.forEach(r => {
    const hour = new Date(r.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const maxHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (maxHour && maxHour[1] > records.length * 0.3) {
    patterns.push({
      type: '固定时段',
      description: `你通常在${maxHour[0]}:00左右学习`,
    });
  }

  // 检查学习频率
  const studyDays = new Set(records.map(r => r.createdAt.toISOString().split('T')[0])).size;
  if (studyDays / 7 >= 0.7) {
    patterns.push({
      type: '高频学习',
      description: '你保持了良好的学习频率',
    });
  }

  return patterns;
}

function generateHabitSummary(habits) {
  const { frequency, duration, consistency, timePreference, patterns } = habits;

  const summary = [];

  if (frequency.level === 'high') {
    summary.push('学习频率很高');
  } else if (frequency.level === 'low') {
    summary.push('学习频率需要提升');
  }

  if (consistency.level === 'high') {
    summary.push('学习习惯稳定');
  } else {
    summary.push('需要建立更稳定的学习习惯');
  }

  if (timePreference.bestTime) {
    summary.push(`最佳学习时段：${timePreference.bestTime}`);
  }

  return summary.join('；');
}

/**
 * 遗忘曲线预警（Phase 2.1）
 * 按知识点聚合最后练习时间与近期正确率，估计「N 天后遗忘概率」，并标记建议今日复习
 * @param {string} userId
 * @param {Object} options - { limit: 最多返回条数 }
 * @returns {Promise<Array<{ knowledgeNodeId, lastPracticedAt, daysSinceLastPractice, recentAccuracy, forgetProbability7d, suggestReviewToday }>>}
 */
export async function getForgettingCurveAlerts(userId, options = {}) {
  const limit = Math.min(50, options.limit || 20);
  const now = new Date();

  const agg = await Record.aggregate([
    { $match: { userId, knowledgeNodeId: { $exists: true, $ne: null, $ne: '' } } },
    {
      $group: {
        _id: '$knowledgeNodeId',
        lastPractice: { $max: '$createdAt' },
        total: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    { $sort: { lastPractice: 1 } },
    { $limit: limit * 2 },
  ]);

  const result = [];
  for (const row of agg) {
    const lastPracticedAt = row.lastPractice;
    const daysSince = (now - lastPracticedAt) / (24 * 60 * 60 * 1000);
    const recentAccuracy = row.total > 0 ? row.correct / row.total : 0;
    const strength = 2 + recentAccuracy * 5;
    const forgetProbability7d = Math.round(100 * (1 - Math.exp(-7 / strength)));
    const forgetProbability7dAdjusted = Math.min(95, forgetProbability7d + Math.floor(daysSince) * 8);
    const suggestReviewToday = daysSince >= 2 || forgetProbability7dAdjusted >= 70;

    result.push({
      knowledgeNodeId: row._id,
      lastPracticedAt,
      daysSinceLastPractice: Math.floor(daysSince * 10) / 10,
      recentAccuracy: Math.round(recentAccuracy * 100),
      forgetProbability7d: Math.min(99, forgetProbability7dAdjusted),
      suggestReviewToday,
    });
  }

  return result
    .filter((r) => r.suggestReviewToday)
    .sort((a, b) => b.forgetProbability7d - a.forgetProbability7d)
    .slice(0, limit);
}

/** 时段标签（小时 0-23 → 中文） */
const TIME_SLOT_LABELS = [
  '凌晨(0-5)', '凌晨(0-5)', '凌晨(0-5)', '凌晨(0-5)', '凌晨(0-5)', '凌晨(0-5)',
  '早晨(6-8)', '早晨(6-8)', '早晨(6-8)',
  '上午(9-11)', '上午(9-11)', '上午(9-11)',
  '中午(12-13)', '中午(12-13)',
  '下午(14-17)', '下午(14-17)', '下午(14-17)', '下午(14-17)',
  '傍晚(18-19)', '傍晚(18-19)',
  '晚上(20-23)', '晚上(20-23)', '晚上(20-23)', '晚上(20-23)',
];

/** 题型中文 */
const QUESTION_TYPE_LABELS = { single: '单选题', multiple: '多选题', fill: '填空题', short: '简答题', judge: '判断题' };

/**
 * 学习效率分析：按时间段、题型统计正确率与耗时，输出最佳学习时段/题型建议（Phase 2.2）
 * @param {string} userId
 * @param {Object} options - { days }
 * @returns {Promise<Object>} { byTimeSlot, byQuestionType, bestTimeSlot, bestQuestionType, suggestions }
 */
export async function getStudyEfficiencyByTimeAndType(userId, options = {}) {
  const { days = 30 } = options;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await Record.find({
    userId,
    createdAt: { $gte: since },
  }).lean();

  if (records.length === 0) {
    return {
      byTimeSlot: [],
      byQuestionType: [],
      bestTimeSlot: null,
      bestQuestionType: null,
      suggestions: ['暂无近期练习记录，多做几道题后再来看时段与题型分析'],
    };
  }

  const questionIds = [...new Set(records.map((r) => r.questionId).filter(Boolean))];
  const questions = await Question.find({
    $or: [{ _id: { $in: questionIds } }, { id: { $in: questionIds } }],
  })
    .select('_id id type')
    .lean();
  const typeByQid = new Map();
  questions.forEach((q) => {
    const key = (q._id && q._id.toString()) || q.id;
    if (key) typeByQid.set(key, q.type || 'single');
  });

  const slotMap = new Map();
  const typeMap = new Map();

  records.forEach((r) => {
    const hour = new Date(r.createdAt).getHours();
    const slotLabel = TIME_SLOT_LABELS[hour];
    if (!slotMap.has(slotLabel)) {
      slotMap.set(slotLabel, { count: 0, correct: 0, timeMs: 0 });
    }
    const slot = slotMap.get(slotLabel);
    slot.count += 1;
    if (r.isCorrect) slot.correct += 1;
    slot.timeMs += r.timeSpentMs || 0;

    const qType = typeByQid.get(r.questionId) || 'single';
    const typeLabel = QUESTION_TYPE_LABELS[qType] || qType;
    if (!typeMap.has(typeLabel)) {
      typeMap.set(typeLabel, { type: qType, count: 0, correct: 0, timeMs: 0 });
    }
    const typ = typeMap.get(typeLabel);
    typ.count += 1;
    if (r.isCorrect) typ.correct += 1;
    typ.timeMs += r.timeSpentMs || 0;
  });

  const byTimeSlot = Array.from(slotMap.entries()).map(([label, v]) => ({
    slot: label,
    count: v.count,
    accuracy: v.count > 0 ? Math.round((v.correct / v.count) * 1000) / 10 : 0,
    avgTimeMs: v.count > 0 ? Math.round(v.timeMs / v.count) : 0,
  }));

  const byQuestionType = Array.from(typeMap.values()).map((v) => ({
    type: v.type,
    label: QUESTION_TYPE_LABELS[v.type] || v.type,
    count: v.count,
    accuracy: v.count > 0 ? Math.round((v.correct / v.count) * 1000) / 10 : 0,
    avgTimeMs: v.count > 0 ? Math.round(v.timeMs / v.count) : 0,
  }));

  const minCount = 3;
  const slotWithAccuracy = byTimeSlot.filter((s) => s.count >= minCount).sort((a, b) => b.accuracy - a.accuracy);
  const typeWithAccuracy = byQuestionType.filter((t) => t.count >= minCount).sort((a, b) => b.accuracy - a.accuracy);

  const bestTimeSlot = slotWithAccuracy.length > 0 ? slotWithAccuracy[0].slot : null;
  const bestQuestionType = typeWithAccuracy.length > 0 ? typeWithAccuracy[0].label : null;

  const suggestions = [];
  if (bestTimeSlot) {
    suggestions.push(`你在「${bestTimeSlot}」正确率最高，建议优先在此时段安排练习。`);
  }
  if (bestQuestionType) {
    suggestions.push(`你目前最擅长的题型是「${bestQuestionType}」，可适当增加其他题型的练习以均衡提升。`);
  }
  const worstSlot = byTimeSlot.filter((s) => s.count >= minCount).sort((a, b) => a.accuracy - b.accuracy)[0];
  if (worstSlot && worstSlot.accuracy < 70) {
    suggestions.push(`「${worstSlot.slot}」正确率较低，可考虑换到推荐时段再练。`);
  }

  return {
    byTimeSlot: byTimeSlot.sort((a, b) => a.slot.localeCompare(b.slot)),
    byQuestionType: byQuestionType.sort((a, b) => b.count - a.count),
    bestTimeSlot,
    bestQuestionType,
    suggestions: suggestions.length > 0 ? suggestions : ['继续保持，多练多总结即可提升。'],
  };
}

/**
 * 知识图谱节点热力数据（Phase 2.4）：按节点 key 返回当前用户的掌握度、错题数、练习数
 * @param {string} userId
 * @param {Object} options - { days }
 * @returns {Promise<Array<{ key, masteryPercent, wrongCount, practiceCount }>>}
 */
export async function getGraphNodeHeatmap(userId, options = {}) {
  const { days = 90 } = options;
  const mastery = await getKnowledgeMastery(userId, { days, minQuestions: 0 });
  const knowledgeNodes = mastery?.knowledgeNodes || [];

  const wrongAgg = await WrongQuestion.aggregate([
    { $match: { userId, knowledgeNodeId: { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: '$knowledgeNodeId', wrongCount: { $sum: 1 } } },
  ]);

  const wrongByKey = new Map(wrongAgg.map((r) => [String(r._id), r.wrongCount]));

  const result = knowledgeNodes.map((n) => {
    const key = n.knowledgeNodeId;
    if (!key) return null;
    return {
      key: String(key),
      masteryPercent: Math.round(Number(n.accuracy) || 0),
      wrongCount: wrongByKey.get(String(key)) || 0,
      practiceCount: Number(n.total) || 0,
    };
  }).filter(Boolean);

  const keysWithWrongOnly = wrongAgg
    .map((r) => String(r._id))
    .filter((k) => !result.some((n) => n.key === k));
  keysWithWrongOnly.forEach((key) => {
    result.push({
      key,
      masteryPercent: 0,
      wrongCount: wrongByKey.get(key) || 0,
      practiceCount: 0,
    });
  });

  return result;
}

/**
 * 路径推荐（Phase 2.5）：基于当前掌握度与节点顺序，推荐「下一步学习」的知识点
 * 规则（MVP）：
 * - 已掌握节点：accuracy ≥ 80 且 total ≥ 3
 * - 推荐候选：紧邻已掌握节点前后若干个、且尚未掌握的节点
 * - 得分越高越优先：按（掌握度缺口 + 来自多少个已掌握邻居）排序
 *
 * @param {string} userId
 * @param {Object} options - { days, maxRecommendations }
 * @returns {Promise<Array<{ key, name, accuracy, total, score, reason }>>}
 */
export async function getPathRecommendations(userId, options = {}) {
  const { days = 90, maxRecommendations = 5 } = options;

  const [mastery, allNodes] = await Promise.all([
    getKnowledgeMastery(userId, { days, minQuestions: 0 }),
    KnowledgeNode.find().sort({ order: 1 }).lean(),
  ]);

  const masteryList = mastery?.knowledgeNodes || [];
  if (!allNodes.length) return [];

  const masteryMap = new Map();
  masteryList.forEach((n) => {
    if (!n.knowledgeNodeId) return;
    masteryMap.set(String(n.knowledgeNodeId), {
      accuracy: Number(n.accuracy) || 0,
      total: Number(n.total) || 0,
    });
  });

  const orderedKeys = allNodes.map((n) => String(n.key));
  const indexByKey = new Map(orderedKeys.map((k, idx) => [k, idx]));

  const masteredKeys = new Set(
    orderedKeys.filter((k) => {
      const m = masteryMap.get(k);
      return m && m.total >= 3 && m.accuracy >= 80;
    }),
  );

  if (!masteredKeys.size) {
    return [];
  }

  const candidateScores = new Map();
  const windowSize = 2;

  masteredKeys.forEach((k) => {
    const centerIdx = indexByKey.get(k);
    if (centerIdx == null) return;
    for (let offset = -windowSize; offset <= windowSize; offset += 1) {
      if (offset === 0) continue;
      const idx = centerIdx + offset;
      if (idx < 0 || idx >= orderedKeys.length) continue;
      const candidateKey = orderedKeys[idx];
      if (masteredKeys.has(candidateKey)) continue;
      const m = masteryMap.get(candidateKey) || { accuracy: 0, total: 0 };
      const baseGap = 100 - (m.accuracy || 0);
      const distancePenalty = Math.abs(offset) * 5;
      const prevScore = candidateScores.get(candidateKey) || 0;
      const inc = Math.max(0, baseGap - distancePenalty);
      candidateScores.set(candidateKey, prevScore + inc);
    }
  });

  const candidates = Array.from(candidateScores.entries())
    .map(([key, score]) => {
      const m = masteryMap.get(key) || { accuracy: 0, total: 0 };
      const nodeMeta = allNodes.find((n) => String(n.key) === key) || {};
      return {
        key,
        name: nodeMeta.name || key,
        accuracy: m.accuracy || 0,
        total: m.total || 0,
        score,
      };
    })
    .filter((c) => c.total >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, maxRecommendations));

  return candidates.map((c) => {
    let reason = '';
    if (c.total === 0) {
      reason = '尚未练习，建议作为下一步开始学习';
    } else if (c.accuracy < 60) {
      reason = '练习较少或正确率偏低，建议优先巩固';
    } else if (c.accuracy < 80) {
      reason = '已开始学习，但尚未完全掌握，可继续加练';
    } else {
      reason = '与已掌握知识点相邻，可作为进阶巩固';
    }
    return { ...c, reason };
  });
}

/**
 * 学科技能树：按学科返回知识点列表及当前用户掌握度，点亮规则：正确率≥70% 且 答题≥3
 * @param {string} userId
 * @param {Object} options - { subjectCode（必填）, days（默认 90） }
 * @returns {Promise<{ subjectCode, nodes: Array<{ key, name, order, lit, accuracy, total }> }>}
 */
export async function getSubjectSkillTree(userId, options = {}) {
  const { subjectCode, days = 90 } = options;
  if (!subjectCode || !String(subjectCode).trim()) {
    return { subjectCode: '', nodes: [] };
  }
  const Question = (await import('../models/Question.js')).default;
  const nodeKeys = await Question.distinct('knowledgeNodeId', {
    subjectCode: String(subjectCode).trim(),
    knowledgeNodeId: { $exists: true, $nin: [null, ''] },
  });
  if (!nodeKeys.length) {
    return { subjectCode: String(subjectCode).trim(), nodes: [] };
  }
  const keys = nodeKeys.map((k) => String(k));
  const [nodes, mastery] = await Promise.all([
    KnowledgeNode.find({ key: { $in: keys } }).sort({ order: 1 }).lean(),
    getKnowledgeMastery(userId, { subjectCode: String(subjectCode).trim(), days, minQuestions: 0 }),
  ]);
  const masteryMap = new Map();
  (mastery?.knowledgeNodes || []).forEach((n) => {
    const key = String(n.knowledgeNodeId);
    masteryMap.set(key, { accuracy: Number(n.accuracy) || 0, total: Number(n.total) || 0 });
  });
  const LIT_MIN_ACCURACY = 70;
  const LIT_MIN_TOTAL = 3;
  const result = nodes.map((n) => {
    const key = String(n.key);
    const m = masteryMap.get(key) || { accuracy: 0, total: 0 };
    const lit = m.total >= LIT_MIN_TOTAL && m.accuracy >= LIT_MIN_ACCURACY;
    return {
      key,
      name: n.name || key,
      order: n.order ?? 0,
      lit,
      accuracy: Math.round(m.accuracy * 10) / 10,
      total: m.total,
    };
  });
  return { subjectCode: String(subjectCode).trim(), nodes: result };
}

/**
 * 考前预测（Phase 2.6）：基于错题与掌握度，选出高风险知识点并给出预测卷题量分配
 * @param {string} userId
 * @param {Object} options - { days, totalQuestions }
 * @returns {Promise<{ targetQuestionCount: number, nodes: Array }>}
 */
export async function getExamPrediction(userId, options = {}) {
  const { days = 30, totalQuestions = 20 } = options;
  const safeTotal = Math.max(5, Math.min(50, totalQuestions || 20));

  const mastery = await getKnowledgeMastery(userId, { days, minQuestions: 0 });
  const masteryList = mastery?.knowledgeNodes || [];

  if (!masteryList.length) {
    return { targetQuestionCount: safeTotal, nodes: [] };
  }

  // 统计错题次数（用于加权）
  const since = new Date();
  since.setDate(since.getDate() - days);
  const wrongAgg = await WrongQuestion.aggregate([
    {
      $match: {
        userId,
        knowledgeNodeId: { $exists: true, $nin: [null, ''] },
        updatedAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$knowledgeNodeId',
        wrongCount: { $sum: '$errorCount' },
      },
    },
  ]);
  const wrongByKey = new Map(wrongAgg.map((r) => [String(r._id), r.wrongCount]));

  // 计算风险分
  const riskyNodes = masteryList
    .map((n) => {
      const key = n.knowledgeNodeId;
      if (!key) return null;
      const accuracy = Number(n.accuracy) || 0;
      const total = Number(n.total) || 0;
      const wrong = Number(n.wrong) || 0;
      const extraWrong = wrongByKey.get(String(key)) || 0;
      const combinedWrong = wrong + extraWrong;

      if (total === 0 && combinedWrong === 0) return null;

      const gap = 100 - accuracy;
      const volume = Math.log(total + 1);
      const riskScore = gap * (volume || 1) + combinedWrong * 10;

      // 过滤：明显薄弱或有错题记录
      const isWeak = (total >= 3 && accuracy < 70) || (combinedWrong > 0 && total < 3);
      if (!isWeak) return null;

      return {
        knowledgeNodeId: String(key),
        accuracy,
        total,
        wrong: combinedWrong,
        riskScore,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.riskScore - a.riskScore);

  if (!riskyNodes.length) {
    return { targetQuestionCount: safeTotal, nodes: [] };
  }

  // 限制最多参与分配的知识点数量
  const topNodes = riskyNodes.slice(0, Math.min(8, riskyNodes.length));
  const nodeCount = topNodes.length;

  // 均匀分配题量，向下取整后用剩余题补高风险节点
  const basePerNode = Math.max(2, Math.floor(safeTotal / nodeCount));
  let remaining = safeTotal - basePerNode * nodeCount;

  const nodesWithPlan = topNodes.map((n) => ({
    ...n,
    plannedCount: basePerNode,
  }));

  let idx = 0;
  while (remaining > 0 && idx < nodesWithPlan.length) {
    nodesWithPlan[idx].plannedCount += 1;
    remaining -= 1;
    idx = (idx + 1) % nodesWithPlan.length;
  }

  // 附加文案
  const nodesWithReason = nodesWithPlan.map((n) => {
    let reason = '';
    if (n.total === 0) {
      reason = '几乎未练习，考前建议重点补做';
    } else if (n.accuracy < 50) {
      reason = '正确率偏低且错题较多，属于高风险考点';
    } else if (n.accuracy < 70) {
      reason = '有一定基础但错误仍然较多，建议考前集中冲刺';
    } else {
      reason = '与你的薄弱知识点高度相关，适合作为进阶练习';
    }
    return { ...n, reason };
  });

  return {
    targetQuestionCount: safeTotal,
    nodes: nodesWithReason,
  };
}

/**
 * 对比报告：与同校/同年级用户的学习数据对比
 * @param {string} userId
 * @param {Object} options - { groupBy: 'school'|'grade', days }
 * @returns {Promise<{ groupBy, groupLabel, mine, peer, peerCount }>}
 */
export async function getCompareReport(userId, options = {}) {
  const { groupBy = 'grade', days = 90 } = options;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const currentUser = await User.findById(userId).select('school grade').lean();
  const school = (currentUser?.school || '').trim();
  const grade = (currentUser?.grade || '').trim();

  let peerQuery = {};
  let groupLabel = '全部用户';
  if (groupBy === 'school' && school) {
    peerQuery.school = school;
    groupLabel = `同校（${school}）`;
  } else if (groupBy === 'grade' && grade) {
    peerQuery.grade = grade;
    groupLabel = `同年级（${grade}）`;
  }
  const peerUserIds = await User.find(peerQuery).distinct('_id').then((ids) => ids.map((id) => id.toString()));

  const allUserIds = peerUserIds.length ? peerUserIds : await User.find({}).distinct('_id').then((ids) => ids.map((id) => id.toString()));
  if (!allUserIds.length) {
    return { groupBy, groupLabel, mine: {}, peer: {}, peerCount: 0 };
  }

  const pipeline = [
    { $match: { userId: { $in: allUserIds }, createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        days: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
      },
    },
    {
      $project: {
        userId: '$_id',
        total: 1,
        correct: 1,
        studyDays: { $size: '$days' },
        accuracy: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$correct', '$total'] }, 100] },
            0,
          ],
        },
      },
    },
  ];
  const stats = await Record.aggregate(pipeline);

  const myStat = stats.find((s) => s.userId === userId) || { total: 0, correct: 0, studyDays: 0, accuracy: 0 };
  const peerStats = stats.filter((s) => s.userId !== userId);
  const peerCount = peerStats.length;
  const avg = (arr, key) => (peerStats.length ? peerStats.reduce((s, x) => s + (x[key] || 0), 0) / peerStats.length : 0);

  return {
    groupBy,
    groupLabel,
    mine: {
      totalQuestions: myStat.total,
      correct: myStat.correct,
      accuracy: Math.round((myStat.accuracy || 0) * 10) / 10,
      studyDays: myStat.studyDays,
    },
    peer: {
      avgTotal: Math.round(avg(peerStats, 'total')),
      avgCorrect: Math.round(avg(peerStats, 'correct')),
      avgAccuracy: Math.round(avg(peerStats, 'accuracy') * 10) / 10,
      avgStudyDays: Math.round(avg(peerStats, 'studyDays')),
    },
    peerCount,
  };
}

/**
 * 升学报告：考研/考公/留学竞争力与差距诊断
 * @param {string} userId
 * @param {Object} options - { target: '考研'|'考公'|'留学', days }
 * @returns {Promise<{ target, score, level, gaps, suggestions }>}
 */
export async function getAdvancementReport(userId, options = {}) {
  const { target = '考研', days = 90 } = options;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const mastery = await getKnowledgeMastery(userId, { days, minQuestions: 0 });
  const nodes = mastery?.knowledgeNodes || [];
  const bySubject = mastery?.bySubject || [];

  const totalQuestions = mastery?.overall?.total || 0;
  const correct = mastery?.overall?.correct || 0;
  const accuracy = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
  const weakSubjects = (bySubject || []).filter((s) => s.accuracy < 70 && s.total >= 5).sort((a, b) => a.accuracy - b.accuracy);
  const weakNodes = nodes.filter((n) => n.accuracy < 70 && n.total >= 3).slice(0, 5);

  let score = Math.min(100, Math.round(accuracy * 0.5 + Math.min(30, (totalQuestions / 50) * 30) + (nodes.length >= 5 ? 20 : nodes.length * 4)));
  if (weakSubjects.length === 0 && nodes.length >= 3) score = Math.min(100, score + 10);
  let level = '待提升';
  if (score >= 80) level = '竞争力较强';
  else if (score >= 60) level = '中等偏上';
  else if (score >= 40) level = '中等';

  const gaps = [];
  weakSubjects.slice(0, 3).forEach((s) => {
    gaps.push({
      type: 'subject',
      label: s.subjectCode || '未分类',
      accuracy: Math.round(s.accuracy * 10) / 10,
      total: s.total,
      suggestion: `该学科正确率偏低，建议增加练习量并配合错题复习`,
    });
  });
  weakNodes.forEach((n) => {
    gaps.push({
      type: 'node',
      label: n.knowledgeNodeId || '未知',
      accuracy: Math.round((n.accuracy || 0) * 10) / 10,
      total: n.total,
      suggestion: '建议针对该知识点做专项练习',
    });
  });

  const suggestions = [];
  if (accuracy < 60) suggestions.push('整体正确率有较大提升空间，建议先巩固基础再冲刺难题');
  if (totalQuestions < 100) suggestions.push('刷题量偏少，建议保持每日练习以巩固记忆');
  if (weakSubjects.length > 0) suggestions.push(`建议优先加强「${weakSubjects[0].subjectCode}」等薄弱学科`);
  if (target === '考研') suggestions.push('考研备考建议：按科目制定计划，重视真题与错题复盘');
  else if (target === '考公') suggestions.push('考公备考建议：行测各模块均衡练习，申论需定期练笔');
  else if (target === '留学') suggestions.push('留学备考建议：语言与专业课并重，注意目标院校历年考点');

  return {
    target,
    score,
    level,
    gaps: gaps.slice(0, 8),
    suggestions: suggestions.slice(0, 5),
    summary: {
      totalQuestions,
      accuracy: Math.round(accuracy * 10) / 10,
      knowledgeNodeCount: nodes.length,
    },
  };
}

