/**
 * GraphTutor V3.0 - 学习报告生成器
 * 
 * 功能：生成详细的学习报告
 */

/**
 * 生成学习报告数据
 * @param {Object} data - 学习数据
 * @returns {Object} 报告数据
 */
export function generateLearningReport(data) {
  const {
    stats = {},
    progress7d = [],
    progress30d = [],
    nodeStats = [],
    wrongQuestions = [],
    goals = [],
    records = [],
  } = data;

  // 计算统计数据
  const totalQuestions = stats.totalQuestions || 0;
  const totalCorrect = stats.totalCorrect || 0;
  const totalWrong = stats.totalWrong || 0;
  const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;
  
  // 学习时长统计
  const totalStudyTime = progress7d.reduce((sum, d) => sum + (d.duration || 0), 0);
  const avgDailyTime = progress7d.length > 0 ? totalStudyTime / progress7d.length : 0;
  
  // 学习频率
  const studyDays = progress7d.filter(d => d.total > 0).length;
  const studyFrequency = (studyDays / 7) * 100;
  
  // 知识点掌握情况
  const masteredNodes = nodeStats.filter(n => n.accuracy >= 0.8 && n.total >= 5).length;
  const weakNodes = nodeStats.filter(n => n.accuracy < 0.6 && n.total >= 3).length;
  const totalNodes = nodeStats.length;
  
  // 错题分析
  const recentWrongCount = wrongQuestions.filter(q => {
    const lastError = new Date(q.lastErrorAt || q.createdAt);
    const daysAgo = (Date.now() - lastError) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  }).length;
  
  // 目标完成情况
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const goalCompletionRate = (activeGoals + completedGoals) > 0 
    ? (completedGoals / (activeGoals + completedGoals)) * 100 
    : 0;
  
  // 学习趋势分析
  const recentTrend = calculateTrend(progress7d);
  const accuracyTrend = calculateAccuracyTrend(progress7d);
  
  // 最佳学习时间
  const bestStudyTime = calculateBestStudyTime(records);
  
  // 学习强度分析
  const studyIntensity = calculateStudyIntensity(progress7d);
  
  return {
    // 总体统计
    overview: {
      totalQuestions,
      totalCorrect,
      totalWrong,
      overallAccuracy: (overallAccuracy * 100).toFixed(1) + '%',
      totalStudyTime: formatDuration(totalStudyTime),
      avgDailyTime: formatDuration(avgDailyTime),
      studyDays,
      studyFrequency: studyFrequency.toFixed(1) + '%',
    },
    
    // 知识点分析
    knowledge: {
      totalNodes,
      masteredNodes,
      weakNodes,
      masteryRate: totalNodes > 0 ? ((masteredNodes / totalNodes) * 100).toFixed(1) + '%' : '0%',
      topNodes: nodeStats
        .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
        .slice(0, 5)
        .map(n => ({
          name: n.name || n.knowledgeNode,
          accuracy: ((n.accuracy || 0) * 100).toFixed(1) + '%',
          total: n.total || 0,
        })),
      weakNodesList: nodeStats
        .filter(n => n.accuracy < 0.6 && n.total >= 3)
        .sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0))
        .slice(0, 5)
        .map(n => ({
          name: n.name || n.knowledgeNode,
          accuracy: ((n.accuracy || 0) * 100).toFixed(1) + '%',
          total: n.total || 0,
        })),
    },
    
    // 错题分析
    wrongQuestions: {
      total: wrongQuestions.length,
      recent: recentWrongCount,
      bySubject: groupBySubject(wrongQuestions),
      byType: groupByType(wrongQuestions),
    },
    
    // 目标完成
    goals: {
      active: activeGoals,
      completed: completedGoals,
      completionRate: goalCompletionRate.toFixed(1) + '%',
    },
    
    // 学习趋势
    trends: {
      studyTrend: recentTrend,
      accuracyTrend: accuracyTrend,
      intensity: studyIntensity,
    },
    
    // 学习习惯
    habits: {
      bestStudyTime,
      studyFrequency,
      consistency: calculateConsistency(progress7d),
    },
    
    // 建议
    recommendations: generateRecommendations({
      overallAccuracy,
      studyFrequency,
      weakNodes,
      recentWrongCount,
      goalCompletionRate,
      studyIntensity,
    }),
    
    // 报告生成时间
    generatedAt: new Date().toLocaleString('zh-CN'),
  };
}

/**
 * 计算学习趋势
 */
function calculateTrend(progress7d) {
  if (progress7d.length < 2) return 'stable';
  
  const recent = progress7d.slice(-3);
  const earlier = progress7d.slice(0, 3);
  const recentAvg = recent.reduce((sum, d) => sum + d.total, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, d) => sum + d.total, 0) / earlier.length;
  
  if (recentAvg > earlierAvg * 1.2) return 'increasing';
  if (recentAvg < earlierAvg * 0.8) return 'decreasing';
  return 'stable';
}

/**
 * 计算正确率趋势
 */
function calculateAccuracyTrend(progress7d) {
  if (progress7d.length < 2) return 'stable';
  
  const recent = progress7d.slice(-3);
  const earlier = progress7d.slice(0, 3);
  const recentAvg = recent.reduce((sum, d) => sum + (d.accuracy || 0), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, d) => sum + (d.accuracy || 0), 0) / earlier.length;
  
  if (recentAvg > earlierAvg + 0.1) return 'improving';
  if (recentAvg < earlierAvg - 0.1) return 'declining';
  return 'stable';
}

/**
 * 计算最佳学习时间
 */
function calculateBestStudyTime(records) {
  if (!records || records.length === 0) return '暂无数据';
  
  const hourCounts = {};
  records.forEach(record => {
    if (record.createdAt) {
      const hour = new Date(record.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });
  
  const bestHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  if (!bestHour) return '暂无数据';
  
  return `${bestHour}:00-${parseInt(bestHour) + 1}:00`;
}

/**
 * 计算学习强度
 */
function calculateStudyIntensity(progress7d) {
  const avgDaily = progress7d.reduce((sum, d) => sum + d.total, 0) / 7;
  
  if (avgDaily >= 50) return 'high';
  if (avgDaily >= 20) return 'medium';
  return 'low';
}

/**
 * 计算学习一致性
 */
function calculateConsistency(progress7d) {
  const studyDays = progress7d.filter(d => d.total > 0).length;
  const consistency = (studyDays / 7) * 100;
  
  if (consistency >= 85) return 'excellent';
  if (consistency >= 70) return 'good';
  if (consistency >= 50) return 'fair';
  return 'poor';
}

/**
 * 按学科分组
 */
function groupBySubject(items) {
  const groups = {};
  items.forEach(item => {
    const subject = item.subject || item.subjectName || '未分类';
    groups[subject] = (groups[subject] || 0) + 1;
  });
  return groups;
}

/**
 * 按类型分组
 */
function groupByType(items) {
  const groups = {};
  items.forEach(item => {
    const type = item.type || item.questionType || '未分类';
    groups[type] = (groups[type] || 0) + 1;
  });
  return groups;
}

/**
 * 生成建议
 */
function generateRecommendations(data) {
  const recommendations = [];
  
  if (data.overallAccuracy < 0.7) {
    recommendations.push({
      priority: 'high',
      title: '提升正确率',
      content: '你的正确率较低，建议多复习错题，加强基础练习。',
    });
  }
  
  if (data.studyFrequency < 70) {
    recommendations.push({
      priority: 'medium',
      title: '提高学习频率',
      content: '建议每天保持学习，建立稳定的学习习惯。',
    });
  }
  
  if (data.weakNodes > 3) {
    recommendations.push({
      priority: 'high',
      title: '加强薄弱知识点',
      content: `你有${data.weakNodes}个薄弱知识点，建议制定专项复习计划。`,
    });
  }
  
  if (data.recentWrongCount > 10) {
    recommendations.push({
      priority: 'medium',
      title: '及时复习错题',
      content: '最近错题较多，建议使用智能复习功能系统复习。',
    });
  }
  
  if (data.goalCompletionRate < 50) {
    recommendations.push({
      priority: 'low',
      title: '完成学习目标',
      content: '目标完成率较低，建议将大目标拆分为小目标。',
    });
  }
  
  if (data.studyIntensity === 'low') {
    recommendations.push({
      priority: 'medium',
      title: '增加学习量',
      content: '建议每天至少完成20道题目，保持学习强度。',
    });
  }
  
  return recommendations;
}

/**
 * 格式化时长
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}
