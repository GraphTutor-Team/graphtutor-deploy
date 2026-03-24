/**
 * GraphTutor V3.0 - 学习目标追踪工具
 * 
 * 功能：追踪和管理学习目标的完成情况
 */

/**
 * 追踪学习目标
 * @param {Array} goals - 学习目标列表
 * @param {Object} studyData - 学习数据
 * @returns {Object} 追踪结果
 */
export function trackGoals(goals, studyData) {
  const {
    progress7d = [],
    progress30d = [],
    records = [],
    nodeStats = [],
  } = studyData;

  const trackedGoals = goals.map(goal => {
    const progress = calculateGoalProgress(goal, studyData);
    const status = determineGoalStatus(goal, progress);
    const remaining = calculateRemaining(goal, progress);
    const estimatedCompletion = estimateCompletion(goal, progress, studyData);

    return {
      ...goal,
      progress,
      status,
      remaining,
      estimatedCompletion,
      insights: generateGoalInsights(goal, progress, status),
    };
  });

  // 计算总体统计
  const stats = {
    total: goals.length,
    active: trackedGoals.filter(g => g.status === 'active').length,
    completed: trackedGoals.filter(g => g.status === 'completed').length,
    onTrack: trackedGoals.filter(g => g.status === 'on_track').length,
    behind: trackedGoals.filter(g => g.status === 'behind').length,
    completionRate: goals.length > 0 
      ? (trackedGoals.filter(g => g.status === 'completed').length / goals.length) * 100 
      : 0,
  };

  return {
    goals: trackedGoals,
    stats,
    summary: generateGoalSummary(stats, trackedGoals),
  };
}

/**
 * 计算目标进度
 */
function calculateGoalProgress(goal, studyData) {
  const { progress7d, progress30d, records, nodeStats } = studyData;
  
  switch (goal.type) {
    case 'daily':
      return calculateDailyProgress(goal, progress7d);
    case 'weekly':
      return calculateWeeklyProgress(goal, progress7d);
    case 'monthly':
      return calculateMonthlyProgress(goal, progress30d);
    case 'total_questions':
      return calculateTotalQuestionsProgress(goal, records, progress7d);
    case 'accuracy':
      return calculateAccuracyProgress(goal, progress7d);
    case 'knowledge_nodes':
      return calculateKnowledgeNodesProgress(goal, nodeStats);
    case 'study_days':
      return calculateStudyDaysProgress(goal, progress7d, progress30d);
    default:
      return 0;
  }
}

/**
 * 计算每日目标进度
 */
function calculateDailyProgress(goal, progress7d) {
  const today = progress7d[progress7d.length - 1];
  if (!today) return 0;
  
  const target = goal.target || 0;
  const current = today.total || 0;
  
  return target > 0 ? Math.min((current / target) * 100, 100) : 0;
}

/**
 * 计算每周目标进度
 */
function calculateWeeklyProgress(goal, progress7d) {
  const weekTotal = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const target = goal.target || 0;
  
  return target > 0 ? Math.min((weekTotal / target) * 100, 100) : 0;
}

/**
 * 计算每月目标进度
 */
function calculateMonthlyProgress(goal, progress30d) {
  const monthTotal = progress30d.reduce((sum, d) => sum + (d.total || 0), 0);
  const target = goal.target || 0;
  
  return target > 0 ? Math.min((monthTotal / target) * 100, 100) : 0;
}

/**
 * 计算总题数目标进度
 */
function calculateTotalQuestionsProgress(goal, records, progress7d) {
  const total = records.length || progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const target = goal.target || 0;
  
  return target > 0 ? Math.min((total / target) * 100, 100) : 0;
}

/**
 * 计算正确率目标进度
 */
function calculateAccuracyProgress(goal, progress7d) {
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const target = goal.target || 0;
  
  return target > 0 ? Math.min((accuracy / target) * 100, 100) : 0;
}

/**
 * 计算知识点目标进度
 */
function calculateKnowledgeNodesProgress(goal, nodeStats) {
  const mastered = nodeStats.filter(n => n.accuracy >= 0.8 && n.total >= 5).length;
  const target = goal.target || 0;
  
  return target > 0 ? Math.min((mastered / target) * 100, 100) : 0;
}

/**
 * 计算学习天数目标进度
 */
function calculateStudyDaysProgress(goal, progress7d, progress30d) {
  const period = goal.period === 'week' ? progress7d : progress30d;
  const studyDays = period.filter(d => (d.total || 0) > 0).length;
  const target = goal.target || 0;
  
  return target > 0 ? Math.min((studyDays / target) * 100, 100) : 0;
}

/**
 * 确定目标状态
 */
function determineGoalStatus(goal, progress) {
  if (progress >= 100) {
    return 'completed';
  }

  // 计算预期进度
  const expectedProgress = calculateExpectedProgress(goal);
  
  if (progress >= expectedProgress * 0.9) {
    return 'on_track';
  } else if (progress >= expectedProgress * 0.7) {
    return 'behind';
  } else {
    return 'at_risk';
  }
}

/**
 * 计算预期进度
 */
function calculateExpectedProgress(goal) {
  const now = new Date();
  const startDate = new Date(goal.startDate || goal.createdAt);
  const endDate = new Date(goal.endDate || goal.deadline);
  
  const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now - startDate) / (1000 * 60 * 60 * 24);
  
  if (totalDays <= 0) return 100;
  if (elapsedDays <= 0) return 0;
  if (elapsedDays >= totalDays) return 100;
  
  return (elapsedDays / totalDays) * 100;
}

/**
 * 计算剩余量
 */
function calculateRemaining(goal, progress) {
  const target = goal.target || 0;
  const current = (progress / 100) * target;
  const remaining = Math.max(target - current, 0);
  
  return {
    value: remaining,
    percentage: 100 - progress,
  };
}

/**
 * 估算完成时间
 */
function estimateCompletion(goal, progress, studyData) {
  if (progress >= 100) {
    return null; // 已完成
  }

  const { progress7d } = studyData;
  const avgDaily = progress7d.length > 0
    ? progress7d.reduce((sum, d) => sum + (d.total || 0), 0) / progress7d.length
    : 0;

  if (avgDaily <= 0) {
    return null; // 无法估算
  }

  const remaining = calculateRemaining(goal, progress);
  const daysNeeded = Math.ceil(remaining.value / avgDaily);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysNeeded);

  return {
    days: daysNeeded,
    date: completionDate.toLocaleDateString('zh-CN'),
  };
}

/**
 * 生成目标洞察
 */
function generateGoalInsights(goal, progress, status) {
  const insights = [];

  if (status === 'completed') {
    insights.push({
      type: 'success',
      message: '目标已完成！继续保持。',
    });
  } else if (status === 'on_track') {
    insights.push({
      type: 'info',
      message: '目标进展顺利，继续保持当前节奏。',
    });
  } else if (status === 'behind') {
    insights.push({
      type: 'warning',
      message: '目标进度稍慢，建议增加学习量。',
    });
  } else {
    insights.push({
      type: 'error',
      message: '目标进度严重滞后，需要调整学习计划。',
    });
  }

  return insights;
}

/**
 * 生成目标总结
 */
function generateGoalSummary(stats, goals) {
  const summary = {
    overall: stats.completionRate >= 80 ? 'excellent' : 
             stats.completionRate >= 60 ? 'good' : 
             stats.completionRate >= 40 ? 'fair' : 'poor',
    message: '',
    recommendations: [],
  };

  if (stats.completed === stats.total) {
    summary.message = '所有目标都已完成！非常优秀！';
  } else if (stats.completionRate >= 80) {
    summary.message = `目标完成率${stats.completionRate.toFixed(1)}%，表现优秀！`;
  } else if (stats.completionRate >= 60) {
    summary.message = `目标完成率${stats.completionRate.toFixed(1)}%，继续努力！`;
    summary.recommendations.push('建议将大目标拆分为小目标');
  } else {
    summary.message = `目标完成率${stats.completionRate.toFixed(1)}%，需要加强`;
    summary.recommendations.push('建议调整目标难度或增加学习时间');
    summary.recommendations.push('建议使用学习提醒功能保持学习节奏');
  }

  if (stats.behind > 0) {
    summary.recommendations.push(`有${stats.behind}个目标进度较慢，需要关注`);
  }

  return summary;
}

