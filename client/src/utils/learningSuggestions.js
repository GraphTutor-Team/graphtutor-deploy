/**
 * GraphTutor V3.0 - 学习建议系统
 * 
 * 功能：基于学习数据生成个性化学习建议
 */

/**
 * 生成学习建议
 */
export function generateLearningSuggestions(data) {
  const {
    stats = {},
    progress7d = [],
    nodeStats = [],
    wrongQuestions = [],
    goals = [],
  } = data;

  const suggestions = [];

  // 基于学习频率的建议
  const frequencySuggestions = analyzeLearningFrequency(progress7d);
  suggestions.push(...frequencySuggestions);

  // 基于正确率的建议
  const accuracySuggestions = analyzeAccuracy(stats, progress7d);
  suggestions.push(...accuracySuggestions);

  // 基于知识点的建议
  const knowledgeSuggestions = analyzeKnowledgeNodes(nodeStats);
  suggestions.push(...knowledgeSuggestions);

  // 基于错题的建议
  const wrongQuestionSuggestions = analyzeWrongQuestions(wrongQuestions);
  suggestions.push(...wrongQuestionSuggestions);

  // 基于目标的建议
  const goalSuggestions = analyzeGoals(goals);
  suggestions.push(...goalSuggestions);

  // 基于学习时间的建议
  const timeSuggestions = analyzeStudyTime(progress7d);
  suggestions.push(...timeSuggestions);

  // 按优先级排序
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return suggestions.slice(0, 10); // 返回前10个建议
}

/**
 * 分析学习频率
 */
function analyzeLearningFrequency(progress7d) {
  const suggestions = [];
  
  if (!progress7d || progress7d.length === 0) {
    suggestions.push({
      type: 'frequency',
      priority: 'high',
      title: '开始学习',
      content: '你还没有学习记录，建议开始制定学习计划并开始学习。',
      action: '创建学习计划',
    });
    return suggestions;
  }

  const studyDays = progress7d.filter(d => (d.total || 0) > 0).length;
  const avgDaily = progress7d.reduce((sum, d) => sum + (d.total || 0), 0) / progress7d.length;

  if (studyDays < 3) {
    suggestions.push({
      type: 'frequency',
      priority: 'high',
      title: '学习频率不足',
      content: `本周只学习了${studyDays}天，建议增加学习频率，保持每天学习的习惯。`,
      action: '设置学习提醒',
    });
  }

  if (avgDaily < 10) {
    suggestions.push({
      type: 'frequency',
      priority: 'medium',
      title: '每日题数偏少',
      content: `本周平均每日${avgDaily.toFixed(1)}题，建议适当增加每日练习量。`,
      action: '调整学习目标',
    });
  }

  return suggestions;
}

/**
 * 分析正确率
 */
function analyzeAccuracy(stats, progress7d) {
  const suggestions = [];

  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) : 0;

  if (accuracy < 0.5) {
    suggestions.push({
      type: 'accuracy',
      priority: 'high',
      title: '正确率偏低',
      content: `当前正确率为${(accuracy * 100).toFixed(1)}%，建议复习基础知识，巩固薄弱环节。`,
      action: '查看错题本',
    });
  } else if (accuracy < 0.7) {
    suggestions.push({
      type: 'accuracy',
      priority: 'medium',
      title: '正确率有提升空间',
      content: `当前正确率为${(accuracy * 100).toFixed(1)}%，建议多做练习，提高准确率。`,
      action: '加强练习',
    });
  } else if (accuracy >= 0.9) {
    suggestions.push({
      type: 'accuracy',
      priority: 'low',
      title: '正确率优秀',
      content: `当前正确率为${(accuracy * 100).toFixed(1)}%，继续保持！可以尝试更有挑战性的题目。`,
      action: '挑战难题',
    });
  }

  return suggestions;
}

/**
 * 分析知识点
 */
function analyzeKnowledgeNodes(nodeStats) {
  const suggestions = [];

  if (!nodeStats || nodeStats.length === 0) {
    return suggestions;
  }

  const weakNodes = nodeStats.filter(n => (n.accuracy || 0) < 0.6 && (n.total || 0) >= 3);
  const strongNodes = nodeStats.filter(n => (n.accuracy || 0) >= 0.8 && (n.total || 0) >= 5);

  if (weakNodes.length > 5) {
    suggestions.push({
      type: 'knowledge',
      priority: 'high',
      title: '薄弱知识点较多',
      content: `有${weakNodes.length}个薄弱知识点，建议制定专项复习计划。`,
      action: '查看薄弱知识点',
    });
  }

  if (strongNodes.length > 0 && weakNodes.length === 0) {
    suggestions.push({
      type: 'knowledge',
      priority: 'low',
      title: '知识点掌握良好',
      content: `已掌握${strongNodes.length}个知识点，可以学习新的知识点。`,
      action: '学习新知识点',
    });
  }

  return suggestions;
}

/**
 * 分析错题
 */
function analyzeWrongQuestions(wrongQuestions) {
  const suggestions = [];

  if (!wrongQuestions || wrongQuestions.length === 0) {
    return suggestions;
  }

  const recentWrong = wrongQuestions.filter(q => {
    const lastError = new Date(q.lastErrorAt || q.createdAt);
    const daysAgo = (Date.now() - lastError.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });

  if (recentWrong.length > 20) {
    suggestions.push({
      type: 'wrong_question',
      priority: 'high',
      title: '错题积累较多',
      content: `最近有${recentWrong.length}道错题，建议及时复习，避免遗忘。`,
      action: '复习错题',
    });
  }

  const unreviewed = wrongQuestions.filter(q => {
    const lastReview = q.lastReviewAt;
    if (!lastReview) return true;
    const daysSinceReview = (Date.now() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReview > 7;
  });

  if (unreviewed.length > 10) {
    suggestions.push({
      type: 'wrong_question',
      priority: 'medium',
      title: '错题复习不及时',
      content: `有${unreviewed.length}道错题超过7天未复习，建议安排复习计划。`,
      action: '制定复习计划',
    });
  }

  return suggestions;
}

/**
 * 分析目标
 */
function analyzeGoals(goals) {
  const suggestions = [];

  if (!goals || goals.length === 0) {
    suggestions.push({
      type: 'goal',
      priority: 'medium',
      title: '未设置学习目标',
      content: '建议设置学习目标，有助于保持学习动力和方向。',
      action: '创建学习目标',
    });
    return suggestions;
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) {
    suggestions.push({
      type: 'goal',
      priority: 'medium',
      title: '没有活跃的学习目标',
      content: '建议创建新的学习目标，或激活已有目标。',
      action: '管理学习目标',
    });
  }

  const behindGoals = activeGoals.filter(g => {
    const progress = g.progress || 0;
    const target = g.target || g.dailyTarget || 1;
    const expectedProgress = (Date.now() - new Date(g.startDate || g.createdAt).getTime()) / 
      (new Date(g.endDate || Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() - 
       new Date(g.startDate || g.createdAt).getTime());
    return progress / target < expectedProgress * 0.8;
  });

  if (behindGoals.length > 0) {
    suggestions.push({
      type: 'goal',
      priority: 'high',
      title: '目标进度落后',
      content: `有${behindGoals.length}个目标进度落后，建议调整学习计划或增加学习时间。`,
      action: '调整学习计划',
    });
  }

  return suggestions;
}

/**
 * 分析学习时间
 */
function analyzeStudyTime(progress7d) {
  const suggestions = [];

  if (!progress7d || progress7d.length === 0) {
    return suggestions;
  }

  // 分析最佳学习时间（这里简化处理，实际可以从更详细的数据中分析）
  const studyDays = progress7d.filter(d => (d.total || 0) > 0);
  if (studyDays.length > 0) {
    suggestions.push({
      type: 'time',
      priority: 'low',
      title: '保持学习习惯',
      content: '建议在固定的时间段学习，有助于形成良好的学习习惯。',
      action: '设置学习提醒',
    });
  }

  return suggestions;
}

