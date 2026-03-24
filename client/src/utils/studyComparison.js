/**
 * GraphTutor V3.0 - 学习统计对比工具
 * 
 * 功能：对比不同时间段的学习数据
 */

/**
 * 对比学习数据
 * @param {Object} data - 学习数据
 * @returns {Object} 对比结果
 */
export function compareStudyData(data) {
  const {
    currentPeriod = [], // 当前时间段（如本周）
    previousPeriod = [], // 上一时间段（如上周）
    periodType = 'week', // week, month
  } = data;

  // 计算统计数据
  const currentStats = calculateStats(currentPeriod);
  const previousStats = calculateStats(previousPeriod);

  // 计算变化
  const changes = calculateChanges(currentStats, previousStats);

  // 生成对比报告
  const comparison = {
    current: currentStats,
    previous: previousStats,
    changes,
    trends: analyzeTrends(changes),
    insights: generateInsights(changes, periodType),
  };

  return comparison;
}

/**
 * 计算统计数据
 */
function calculateStats(period) {
  const totalQuestions = period.reduce((sum, d) => sum + (d.total || 0), 0);
  const totalCorrect = period.reduce((sum, d) => sum + (d.correct || 0), 0);
  const totalWrong = period.reduce((sum, d) => sum + (d.wrong || 0), 0);
  const totalDuration = period.reduce((sum, d) => sum + (d.duration || 0), 0);
  const studyDays = period.filter(d => (d.total || 0) > 0).length;
  
  const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;
  const avgDaily = period.length > 0 ? totalQuestions / period.length : 0;
  const avgDuration = period.length > 0 ? totalDuration / period.length : 0;
  const frequency = period.length > 0 ? (studyDays / period.length) * 100 : 0;

  return {
    totalQuestions,
    totalCorrect,
    totalWrong,
    totalDuration,
    studyDays,
    accuracy: accuracy * 100,
    avgDaily,
    avgDuration,
    frequency,
  };
}

/**
 * 计算变化
 */
function calculateChanges(current, previous) {
  const calculateChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  return {
    totalQuestions: {
      value: current.totalQuestions - previous.totalQuestions,
      percentage: calculateChange(current.totalQuestions, previous.totalQuestions),
    },
    accuracy: {
      value: current.accuracy - previous.accuracy,
      percentage: calculateChange(current.accuracy, previous.accuracy),
    },
    totalDuration: {
      value: current.totalDuration - previous.totalDuration,
      percentage: calculateChange(current.totalDuration, previous.totalDuration),
    },
    studyDays: {
      value: current.studyDays - previous.studyDays,
      percentage: calculateChange(current.studyDays, previous.studyDays),
    },
    avgDaily: {
      value: current.avgDaily - previous.avgDaily,
      percentage: calculateChange(current.avgDaily, previous.avgDaily),
    },
    frequency: {
      value: current.frequency - previous.frequency,
      percentage: calculateChange(current.frequency, previous.frequency),
    },
  };
}

/**
 * 分析趋势
 */
function analyzeTrends(changes) {
  const trends = {};
  
  Object.entries(changes).forEach(([key, change]) => {
    if (change.percentage > 5) {
      trends[key] = 'increasing';
    } else if (change.percentage < -5) {
      trends[key] = 'decreasing';
    } else {
      trends[key] = 'stable';
    }
  });

  return trends;
}

/**
 * 生成洞察
 */
function generateInsights(changes, periodType) {
  const insights = [];
  const periodLabel = periodType === 'week' ? '本周' : '本月';
  const previousLabel = periodType === 'week' ? '上周' : '上月';

  // 题量变化
  if (changes.totalQuestions.percentage > 10) {
    insights.push({
      type: 'positive',
      title: '学习量大幅增加',
      content: `${periodLabel}比${previousLabel}多做了${Math.abs(changes.totalQuestions.value)}道题，学习量增加了${changes.totalQuestions.percentage.toFixed(1)}%`,
    });
  } else if (changes.totalQuestions.percentage < -10) {
    insights.push({
      type: 'warning',
      title: '学习量下降',
      content: `${periodLabel}比${previousLabel}少做了${Math.abs(changes.totalQuestions.value)}道题，学习量减少了${Math.abs(changes.totalQuestions.percentage).toFixed(1)}%`,
    });
  }

  // 正确率变化
  if (changes.accuracy.value > 5) {
    insights.push({
      type: 'positive',
      title: '正确率提升',
      content: `${periodLabel}正确率比${previousLabel}提升了${changes.accuracy.value.toFixed(1)}%`,
    });
  } else if (changes.accuracy.value < -5) {
    insights.push({
      type: 'warning',
      title: '正确率下降',
      content: `${periodLabel}正确率比${previousLabel}下降了${Math.abs(changes.accuracy.value).toFixed(1)}%`,
    });
  }

  // 学习时长变化
  if (changes.totalDuration.percentage > 10) {
    insights.push({
      type: 'positive',
      title: '学习时长增加',
      content: `${periodLabel}学习时长比${previousLabel}增加了${formatDuration(Math.abs(changes.totalDuration.value))}`,
    });
  } else if (changes.totalDuration.percentage < -10) {
    insights.push({
      type: 'warning',
      title: '学习时长减少',
      content: `${periodLabel}学习时长比${previousLabel}减少了${formatDuration(Math.abs(changes.totalDuration.value))}`,
    });
  }

  // 学习频率变化
  if (changes.frequency.value > 10) {
    insights.push({
      type: 'positive',
      title: '学习频率提高',
      content: `${periodLabel}学习频率比${previousLabel}提高了${changes.frequency.value.toFixed(1)}%`,
    });
  } else if (changes.frequency.value < -10) {
    insights.push({
      type: 'warning',
      title: '学习频率下降',
      content: `${periodLabel}学习频率比${previousLabel}下降了${Math.abs(changes.frequency.value).toFixed(1)}%`,
    });
  }

  return insights;
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

/**
 * 对比知识点掌握度
 * @param {Array} currentNodes - 当前知识点数据
 * @param {Array} previousNodes - 之前知识点数据
 * @returns {Object} 对比结果
 */
export function compareKnowledgeNodes(currentNodes, previousNodes) {
  const nodeMap = new Map();
  
  // 建立节点映射
  previousNodes.forEach(node => {
    const key = node.knowledgeNodeId || node._id;
    nodeMap.set(key, {
      previous: node.accuracy || 0,
      previousTotal: node.total || 0,
    });
  });

  currentNodes.forEach(node => {
    const key = node.knowledgeNodeId || node._id;
    const existing = nodeMap.get(key) || {};
    nodeMap.set(key, {
      ...existing,
      current: node.accuracy || 0,
      currentTotal: node.total || 0,
      name: node.name || node.knowledgeNode,
    });
  });

  // 计算变化
  const comparisons = Array.from(nodeMap.entries()).map(([id, data]) => {
    const accuracyChange = data.current - (data.previous || 0);
    const totalChange = data.currentTotal - (data.previousTotal || 0);
    
    return {
      id,
      name: data.name,
      current: {
        accuracy: data.current * 100,
        total: data.currentTotal,
      },
      previous: {
        accuracy: (data.previous || 0) * 100,
        total: data.previousTotal || 0,
      },
      change: {
        accuracy: accuracyChange * 100,
        total: totalChange,
      },
      trend: accuracyChange > 0.1 ? 'improving' : accuracyChange < -0.1 ? 'declining' : 'stable',
    };
  });

  // 找出进步最大的和退步最大的
  const improving = comparisons
    .filter(c => c.trend === 'improving')
    .sort((a, b) => b.change.accuracy - a.change.accuracy)
    .slice(0, 5);

  const declining = comparisons
    .filter(c => c.trend === 'declining')
    .sort((a, b) => a.change.accuracy - b.change.accuracy)
    .slice(0, 5);

  return {
    comparisons,
    improving,
    declining,
    summary: {
      total: comparisons.length,
      improving: improving.length,
      declining: declining.length,
      stable: comparisons.filter(c => c.trend === 'stable').length,
    },
  };
}

