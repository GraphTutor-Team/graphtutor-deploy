/**
 * GraphTutor V3.0 - 学习效率分析工具
 * 
 * 功能：分析学习效率和效果
 */

/**
 * 分析学习效率
 * @param {Object} data - 学习数据
 * @returns {Object} 效率分析结果
 */
export function analyzeStudyEfficiency(data) {
  const {
    records = [],
    progress7d = [],
    nodeStats = [],
    wrongQuestions = [],
  } = data;

  // 计算基础指标
  const totalQuestions = records.length || progress7d.reduce((sum, d) => sum + d.total, 0);
  const totalCorrect = records.filter(r => r.isCorrect).length || 
                       progress7d.reduce((sum, d) => sum + d.correct, 0);
  const totalWrong = wrongQuestions.length || 
                     progress7d.reduce((sum, d) => sum + d.wrong, 0);
  const totalDuration = progress7d.reduce((sum, d) => sum + (d.duration || 0), 0);

  // 计算效率指标
  const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;
  const avgTimePerQuestion = totalQuestions > 0 ? totalDuration / totalQuestions : 0;
  const questionsPerHour = totalDuration > 0 ? (totalQuestions / totalDuration) * 60 : 0;
  const correctPerHour = totalDuration > 0 ? (totalCorrect / totalDuration) * 60 : 0;

  // 学习强度分析
  const intensity = analyzeIntensity(progress7d);
  
  // 学习效果分析
  const effectiveness = analyzeEffectiveness(accuracy, avgTimePerQuestion, questionsPerHour);
  
  // 知识点掌握效率
  const knowledgeEfficiency = analyzeKnowledgeEfficiency(nodeStats);
  
  // 错题处理效率
  const wrongQuestionEfficiency = analyzeWrongQuestionEfficiency(wrongQuestions);

  // 生成效率评分
  const efficiencyScore = calculateEfficiencyScore({
    accuracy,
    questionsPerHour,
    intensity,
    effectiveness,
    knowledgeEfficiency,
  });

  // 生成建议
  const recommendations = generateEfficiencyRecommendations({
    accuracy,
    avgTimePerQuestion,
    questionsPerHour,
    intensity,
    effectiveness,
    efficiencyScore,
  });

  return {
    metrics: {
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalDuration,
      accuracy: accuracy * 100,
      avgTimePerQuestion,
      questionsPerHour,
      correctPerHour,
    },
    intensity,
    effectiveness,
    knowledgeEfficiency,
    wrongQuestionEfficiency,
    efficiencyScore,
    recommendations,
  };
}

/**
 * 分析学习强度
 */
function analyzeIntensity(progress7d) {
  const avgDaily = progress7d.reduce((sum, d) => sum + d.total, 0) / 7;
  const maxDaily = Math.max(...progress7d.map(d => d.total));
  const consistency = progress7d.filter(d => d.total > 0).length / 7;

  let level = 'low';
  if (avgDaily >= 50) level = 'high';
  else if (avgDaily >= 20) level = 'medium';

  return {
    level,
    avgDaily,
    maxDaily,
    consistency: consistency * 100,
    recommendation: getIntensityRecommendation(level, avgDaily),
  };
}

/**
 * 分析学习效果
 */
function analyzeEffectiveness(accuracy, avgTimePerQuestion, questionsPerHour) {
  // 效果评分：综合考虑正确率和速度
  const accuracyScore = accuracy * 100;
  const speedScore = Math.min(questionsPerHour / 2, 100); // 每小时2题为满分
  const effectivenessScore = (accuracyScore * 0.7 + speedScore * 0.3);

  let level = 'low';
  if (effectivenessScore >= 80) level = 'high';
  else if (effectivenessScore >= 60) level = 'medium';

  return {
    level,
    score: effectivenessScore,
    accuracyScore,
    speedScore,
    recommendation: getEffectivenessRecommendation(level, accuracy, questionsPerHour),
  };
}

/**
 * 分析知识点掌握效率
 */
function analyzeKnowledgeEfficiency(nodeStats) {
  if (!nodeStats || nodeStats.length === 0) {
    return {
      level: 'unknown',
      masteredCount: 0,
      totalCount: 0,
      masteryRate: 0,
      recommendation: '暂无数据',
    };
  }

  const masteredCount = nodeStats.filter(n => n.accuracy >= 0.8 && n.total >= 5).length;
  const totalCount = nodeStats.length;
  const masteryRate = (masteredCount / totalCount) * 100;

  let level = 'low';
  if (masteryRate >= 70) level = 'high';
  else if (masteryRate >= 50) level = 'medium';

  return {
    level,
    masteredCount,
    totalCount,
    masteryRate,
    recommendation: getKnowledgeEfficiencyRecommendation(level, masteryRate),
  };
}

/**
 * 分析错题处理效率
 */
function analyzeWrongQuestionEfficiency(wrongQuestions) {
  if (!wrongQuestions || wrongQuestions.length === 0) {
    return {
      level: 'good',
      total: 0,
      reviewed: 0,
      reviewRate: 100,
      recommendation: '暂无错题，继续保持',
    };
  }

  const reviewed = wrongQuestions.filter(q => q.reviewed || q.reviewCount > 0).length;
  const reviewRate = (reviewed / wrongQuestions.length) * 100;

  let level = 'low';
  if (reviewRate >= 80) level = 'high';
  else if (reviewRate >= 50) level = 'medium';

  return {
    level,
    total: wrongQuestions.length,
    reviewed,
    reviewRate,
    recommendation: getWrongQuestionEfficiencyRecommendation(level, reviewRate),
  };
}

/**
 * 计算效率评分
 */
function calculateEfficiencyScore(metrics) {
  const {
    accuracy,
    questionsPerHour,
    intensity,
    effectiveness,
    knowledgeEfficiency,
  } = metrics;

  // 各项权重
  const weights = {
    accuracy: 0.3,
    speed: 0.2,
    intensity: 0.2,
    effectiveness: 0.2,
    knowledge: 0.1,
  };

  // 标准化各项得分（0-100）
  const accuracyScore = accuracy * 100;
  const speedScore = Math.min((questionsPerHour / 2) * 100, 100);
  const intensityScore = intensity.level === 'high' ? 100 : intensity.level === 'medium' ? 70 : 40;
  const effectivenessScore = effectiveness.score;
  const knowledgeScore = knowledgeEfficiency.masteryRate || 0;

  // 加权平均
  const totalScore = 
    accuracyScore * weights.accuracy +
    speedScore * weights.speed +
    intensityScore * weights.intensity +
    effectivenessScore * weights.effectiveness +
    knowledgeScore * weights.knowledge;

  let level = 'low';
  if (totalScore >= 80) level = 'excellent';
  else if (totalScore >= 70) level = 'good';
  else if (totalScore >= 60) level = 'fair';

  return {
    total: totalScore,
    level,
    breakdown: {
      accuracy: accuracyScore,
      speed: speedScore,
      intensity: intensityScore,
      effectiveness: effectivenessScore,
      knowledge: knowledgeScore,
    },
  };
}

/**
 * 生成效率建议
 */
function generateEfficiencyRecommendations(metrics) {
  const recommendations = [];
  const { accuracy, avgTimePerQuestion, questionsPerHour, intensity, effectiveness, efficiencyScore } = metrics;

  if (accuracy < 0.7) {
    recommendations.push({
      priority: 'high',
      title: '提升正确率',
      content: '当前正确率较低，建议多复习错题，加强基础练习。',
    });
  }

  if (questionsPerHour < 1) {
    recommendations.push({
      priority: 'medium',
      title: '提高答题速度',
      content: '答题速度较慢，建议多练习，熟悉题型。',
    });
  }

  if (intensity.level === 'low') {
    recommendations.push({
      priority: 'medium',
      title: '增加学习强度',
      content: '学习强度较低，建议每天至少完成20道题目。',
    });
  }

  if (effectiveness.level === 'low') {
    recommendations.push({
      priority: 'high',
      title: '提升学习效果',
      content: '学习效果需要提升，建议平衡正确率和速度。',
    });
  }

  if (efficiencyScore.level === 'excellent') {
    recommendations.push({
      priority: 'low',
      title: '保持优秀表现',
      content: '学习效率很高，继续保持当前的学习节奏。',
    });
  }

  return recommendations;
}

// 辅助函数
function getIntensityRecommendation(level, avgDaily) {
  if (level === 'high') return '学习强度很高，注意劳逸结合';
  if (level === 'medium') return '学习强度适中，可以适当增加';
  return '学习强度较低，建议每天至少完成20道题目';
}

function getEffectivenessRecommendation(level, accuracy, questionsPerHour) {
  if (level === 'high') return '学习效果很好，继续保持';
  if (level === 'medium') return '学习效果还可以，有提升空间';
  if (accuracy < 0.7) return '建议提升正确率，多复习错题';
  if (questionsPerHour < 1) return '建议提高答题速度，多练习';
  return '建议平衡正确率和速度';
}

function getKnowledgeEfficiencyRecommendation(level, masteryRate) {
  if (level === 'high') return '知识点掌握很好，继续保持';
  if (level === 'medium') return '知识点掌握还可以，继续加强';
  return `当前掌握率${masteryRate.toFixed(1)}%，建议加强薄弱知识点学习`;
}

function getWrongQuestionEfficiencyRecommendation(level, reviewRate) {
  if (level === 'high') return '错题复习很好，继续保持';
  if (level === 'medium') return '错题复习还可以，建议及时复习';
  return `错题复习率${reviewRate.toFixed(1)}%，建议使用智能复习功能系统复习`;
}

