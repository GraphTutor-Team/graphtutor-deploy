/**
 * GraphTutor V3.0 - 学习成就服务
 * 
 * 功能：检查并授予用户学习成就
 */

import Achievement from '../models/Achievement.js';
import Record from '../models/Record.js';
import LearningGoal from '../models/LearningGoal.js';

/**
 * 检查并授予成就
 * @param {string} userId - 用户ID
 * @param {string} eventType - 事件类型（answer, correct, goal_completed等）
 * @param {Object} eventData - 事件数据
 */
export async function checkAndAwardAchievements(userId, eventType, eventData = {}) {
  try {
    const achievements = [];

    switch (eventType) {
      case 'answer':
        // 答题相关成就
        achievements.push(...await checkAnswerAchievements(userId, eventData));
        break;
      case 'correct':
        // 答对相关成就
        achievements.push(...await checkCorrectAchievements(userId, eventData));
        break;
      case 'goal_completed':
        // 完成目标成就
        achievements.push(...await checkGoalCompletedAchievements(userId, eventData));
        break;
      case 'exam_completed':
        // 考试完成相关成就
        achievements.push(...await checkExamAchievements(userId, eventData));
        break;
      case 'daily_check':
        // 每日检查（连续学习）
        achievements.push(...await checkStreakAchievements(userId));
        break;
    }

    return achievements;
  } catch (error) {
    console.error('checkAndAwardAchievements error:', error);
    return [];
  }
}

/**
 * 检查答题相关成就
 */
async function checkAnswerAchievements(userId, eventData) {
  const achievements = [];

  // 首次答题
  const firstAnswer = await Achievement.findOne({ userId, type: 'first_answer' });
  if (!firstAnswer) {
    const totalAnswers = await Record.countDocuments({ userId });
    if (totalAnswers === 1) {
      const achievement = await Achievement.create({
        userId,
        type: 'first_answer',
        title: '初出茅庐',
        description: '完成了第一道题目',
        icon: '🎯',
      });
      achievements.push(achievement);
    }
  }

  // 累计答题数成就
  const totalAnswers = await Record.countDocuments({ userId });
  const milestones = [
    { count: 100, type: 'questions_100', title: '百题达人', description: '累计答题100道', icon: '📚' },
    { count: 500, type: 'questions_500', title: '五百题王', description: '累计答题500道', icon: '📖' },
    { count: 1000, type: 'questions_1000', title: '千题大师', description: '累计答题1000道', icon: '👑' },
  ];

  for (const milestone of milestones) {
    const existing = await Achievement.findOne({ userId, type: milestone.type });
    if (!existing && totalAnswers >= milestone.count) {
      const achievement = await Achievement.create({
        userId,
        type: milestone.type,
        title: milestone.title,
        description: milestone.description,
        icon: milestone.icon,
        metadata: { count: totalAnswers },
      });
      achievements.push(achievement);
    }
  }

  return achievements;
}

/**
 * 检查答对相关成就
 */
async function checkCorrectAchievements(userId, eventData) {
  const achievements = [];

  // 首次答对
  const firstCorrect = await Achievement.findOne({ userId, type: 'first_correct' });
  if (!firstCorrect) {
    const totalCorrect = await Record.countDocuments({ userId, isCorrect: true });
    if (totalCorrect === 1) {
      const achievement = await Achievement.create({
        userId,
        type: 'first_correct',
        title: '首战告捷',
        description: '第一次答对题目',
        icon: '✅',
      });
      achievements.push(achievement);
    }
  }

  // 正确率成就（需要计算最近答题的正确率）
  const recentRecords = await Record.find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  if (recentRecords.length >= 20) {
    const correctCount = recentRecords.filter(r => r.isCorrect).length;
    const accuracy = (correctCount / recentRecords.length) * 100;

    const accuracyMilestones = [
      { threshold: 80, type: 'accuracy_80', title: '准确之星', description: '最近100题正确率达到80%', icon: '⭐' },
      { threshold: 90, type: 'accuracy_90', title: '精准大师', description: '最近100题正确率达到90%', icon: '🌟' },
    ];

    for (const milestone of accuracyMilestones) {
      const existing = await Achievement.findOne({ userId, type: milestone.type });
      if (!existing && accuracy >= milestone.threshold) {
        const achievement = await Achievement.create({
          userId,
          type: milestone.type,
          title: milestone.title,
          description: milestone.description,
          icon: milestone.icon,
          metadata: { accuracy: Math.round(accuracy * 100) / 100 },
        });
        achievements.push(achievement);
      }
    }
  }

  // 掌握知识点数成就
  const masteredNodes = await Record.distinct('knowledgeNodeId', {
    userId,
    isCorrect: true,
    knowledgeNodeId: { $ne: null },
  });

  const knowledgeMilestones = [
    { count: 10, type: 'knowledge_master_10', title: '知识新星', description: '掌握10个知识点', icon: '💡' },
    { count: 50, type: 'knowledge_master_50', title: '知识专家', description: '掌握50个知识点', icon: '🎓' },
  ];

  for (const milestone of knowledgeMilestones) {
    const existing = await Achievement.findOne({ userId, type: milestone.type });
    if (!existing && masteredNodes.length >= milestone.count) {
      const achievement = await Achievement.create({
        userId,
        type: milestone.type,
        title: milestone.title,
        description: milestone.description,
        icon: milestone.icon,
        metadata: { count: masteredNodes.length },
      });
      achievements.push(achievement);
    }
  }

  return achievements;
}

/**
 * 检查完成目标成就
 */
async function checkGoalCompletedAchievements(userId, eventData) {
  const achievements = [];

  const completedGoals = await LearningGoal.countDocuments({
    userId,
    status: 'completed',
  });

  if (completedGoals > 0) {
    const existing = await Achievement.findOne({ userId, type: 'goal_completed' });
    if (!existing) {
      const achievement = await Achievement.create({
        userId,
        type: 'goal_completed',
        title: '目标达成',
        description: '完成了第一个学习目标',
        icon: '🎯',
        metadata: { goalCount: completedGoals },
      });
      achievements.push(achievement);
    }
  }

  return achievements;
}

/**
 * 检查考试相关成就
 */
async function checkExamAchievements(userId, eventData) {
  const achievements = [];

  const { accuracy, total, correct } = eventData;

  // 满分成就
  if (accuracy === 100 && total > 0) {
    const existing = await Achievement.findOne({ userId, type: 'perfect_exam' });
    if (!existing) {
      const achievement = await Achievement.create({
        userId,
        type: 'perfect_exam',
        title: '完美答卷',
        description: '完成一次满分考试',
        icon: '💯',
        metadata: { total, correct },
      });
      achievements.push(achievement);
    }
  }

  return achievements;
}

/**
 * 检查连续学习成就
 */
async function checkStreakAchievements(userId) {
  const achievements = [];

  // 计算连续学习天数
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 检查最近7天是否有学习记录
  const recent7Days = await Record.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: sevenDaysAgo },
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
      },
    },
  ]);

  const streak7Days = recent7Days.length;
  const streakMilestones = [
    { days: 3, type: 'streak_3', title: '三日坚持', description: '连续3天学习', icon: '🔥' },
    { days: 7, type: 'streak_7', title: '一周坚持', description: '连续7天学习', icon: '🔥🔥' },
    { days: 30, type: 'streak_30', title: '月度坚持', description: '连续30天学习', icon: '🔥🔥🔥' },
  ];

  for (const milestone of streakMilestones) {
    const existing = await Achievement.findOne({ userId, type: milestone.type });
    if (!existing) {
      // 检查最近N天是否每天都有记录
      const checkDays = milestone.days;
      const checkDate = new Date(now.getTime() - (checkDays - 1) * 24 * 60 * 60 * 1000);
      const records = await Record.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: checkDate },
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
          },
        },
      ]);

      if (records.length >= checkDays) {
        const achievement = await Achievement.create({
          userId,
          type: milestone.type,
          title: milestone.title,
          description: milestone.description,
          icon: milestone.icon,
          metadata: { days: checkDays },
        });
        achievements.push(achievement);
      }
    }
  }

  return achievements;
}

