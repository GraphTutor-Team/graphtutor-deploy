/**
 * GraphTutor V3.0 - 学习进度追踪工具
 * 
 * 功能：追踪和计算学习进度
 */

/**
 * 计算总体学习进度
 */
export function calculateOverallProgress(data) {
  const {
    goals = [],
    progress7d = [],
    nodeStats = [],
    wrongQuestions = [],
  } = data;

  // 目标进度
  const goalProgress = calculateGoalProgress(goals);
  
  // 学习天数进度
  const studyDaysProgress = calculateStudyDaysProgress(progress7d);
  
  // 知识点掌握进度
  const knowledgeProgress = calculateKnowledgeProgress(nodeStats);
  
  // 错题复习进度
  const reviewProgress = calculateReviewProgress(wrongQuestions);

  // 综合进度（加权平均）
  const overall = (
    goalProgress * 0.3 +
    studyDaysProgress * 0.2 +
    knowledgeProgress * 0.3 +
    reviewProgress * 0.2
  );

  return {
    overall: Math.round(overall),
    goalProgress: Math.round(goalProgress),
    studyDaysProgress: Math.round(studyDaysProgress),
    knowledgeProgress: Math.round(knowledgeProgress),
    reviewProgress: Math.round(reviewProgress),
  };
}

/**
 * 计算目标进度
 */
function calculateGoalProgress(goals) {
  if (!goals || goals.length === 0) return 0;

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) return 0;

  const totalProgress = activeGoals.reduce((sum, goal) => {
    const progress = goal.progress || 0;
    const target = goal.target || goal.dailyTarget || 1;
    return sum + (progress / target) * 100;
  }, 0);

  return Math.min(totalProgress / activeGoals.length, 100);
}

/**
 * 计算学习天数进度
 */
function calculateStudyDaysProgress(progress7d) {
  if (!progress7d || progress7d.length === 0) return 0;

  const studyDays = progress7d.filter(d => (d.total || 0) > 0).length;
  return (studyDays / 7) * 100;
}

/**
 * 计算知识点掌握进度
 */
function calculateKnowledgeProgress(nodeStats) {
  if (!nodeStats || nodeStats.length === 0) return 0;

  const masteredNodes = nodeStats.filter(n => (n.accuracy || 0) >= 0.8 && (n.total || 0) >= 5);
  return (masteredNodes.length / nodeStats.length) * 100;
}

/**
 * 计算错题复习进度
 */
function calculateReviewProgress(wrongQuestions) {
  if (!wrongQuestions || wrongQuestions.length === 0) return 100;

  const reviewedQuestions = wrongQuestions.filter(q => {
    const lastReview = q.lastReviewAt || q.updatedAt;
    if (!lastReview) return false;
    const daysSinceReview = (Date.now() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReview <= 7;
  });

  return (reviewedQuestions.length / wrongQuestions.length) * 100;
}

/**
 * 计算每日学习进度
 */
export function calculateDailyProgress(progress7d) {
  if (!progress7d || progress7d.length === 0) return [];

  const today = new Date().toISOString().split('T')[0];
  const todayData = progress7d.find(d => d.date === today);

  const avgDaily = progress7d.reduce((sum, d) => sum + (d.total || 0), 0) / progress7d.length;

  return progress7d.map(day => ({
    date: day.date,
    total: day.total || 0,
    correct: day.correct || 0,
    accuracy: day.total > 0 ? ((day.correct || 0) / day.total) * 100 : 0,
    progress: avgDaily > 0 ? ((day.total || 0) / avgDaily) * 100 : 0,
    isToday: day.date === today,
  }));
}

/**
 * 计算知识点学习进度
 */
export function calculateNodeProgress(nodeStats) {
  if (!nodeStats || nodeStats.length === 0) return [];

  return nodeStats.map(node => {
    const accuracy = node.accuracy || 0;
    const total = node.total || 0;
    
    let masteryLevel = 'beginner';
    if (accuracy >= 0.9 && total >= 10) {
      masteryLevel = 'expert';
    } else if (accuracy >= 0.8 && total >= 5) {
      masteryLevel = 'advanced';
    } else if (accuracy >= 0.6 && total >= 3) {
      masteryLevel = 'intermediate';
    }

    return {
      ...node,
      masteryLevel,
      progress: Math.min((accuracy * 100 + (total / 20) * 100) / 2, 100),
    };
  });
}

/**
 * 生成进度报告
 */
export function generateProgressReport(data) {
  const overall = calculateOverallProgress(data);
  const daily = calculateDailyProgress(data.progress7d || []);
  const nodes = calculateNodeProgress(data.nodeStats || []);

  const report = {
    overall,
    daily,
    nodes,
    summary: generateProgressSummary(overall, daily, nodes),
    recommendations: generateProgressRecommendations(overall, daily, nodes),
    generatedAt: new Date().toISOString(),
  };

  return report;
}

/**
 * 生成进度摘要
 */
function generateProgressSummary(overall, daily, nodes) {
  const summaries = [];

  if (overall.overall >= 80) {
    summaries.push('总体学习进度良好，继续保持！');
  } else if (overall.overall >= 60) {
    summaries.push('总体学习进度中等，还有提升空间。');
  } else {
    summaries.push('总体学习进度较低，需要加强学习。');
  }

  const recentDays = daily.slice(-3);
  const avgRecent = recentDays.reduce((sum, d) => sum + d.total, 0) / recentDays.length;
  if (avgRecent > 0) {
    summaries.push(`最近3天平均每日完成${avgRecent.toFixed(1)}题。`);
  }

  const masteredNodes = nodes.filter(n => n.masteryLevel === 'expert' || n.masteryLevel === 'advanced').length;
  if (masteredNodes > 0) {
    summaries.push(`已掌握${masteredNodes}个知识点。`);
  }

  return summaries;
}

/**
 * 生成进度建议
 */
function generateProgressRecommendations(overall, daily, nodes) {
  const recommendations = [];

  if (overall.goalProgress < 50) {
    recommendations.push({
      type: 'warning',
      title: '目标进度偏低',
      content: '建议检查学习目标，确保目标设置合理且可达成。',
    });
  }

  if (overall.studyDaysProgress < 50) {
    recommendations.push({
      type: 'info',
      title: '学习频率不足',
      content: '建议增加学习频率，保持每天学习的习惯。',
    });
  }

  const weakNodes = nodes.filter(n => n.masteryLevel === 'beginner' && n.total >= 3);
  if (weakNodes.length > 5) {
    recommendations.push({
      type: 'high',
      title: '薄弱知识点较多',
      content: `有${weakNodes.length}个薄弱知识点，建议制定专项复习计划。`,
    });
  }

  if (overall.reviewProgress < 50) {
    recommendations.push({
      type: 'warning',
      title: '错题复习不及时',
      content: '建议及时复习错题，巩固薄弱环节。',
    });
  }

  return recommendations;
}

