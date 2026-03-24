/**
 * GraphTutor V3.0 - 自动报告生成工具
 * 
 * 功能：自动生成学习报告
 */

/**
 * 生成学习报告
 */
export function generateLearningReport(data, period = 'week') {
  const {
    stats = {},
    progress7d = [],
    nodeStats = [],
    wrongQuestions = [],
    goals = [],
    records = [],
  } = data;

  const report = {
    period,
    generatedAt: new Date().toISOString(),
    summary: generateSummary(stats, progress7d, period),
    statistics: generateStatistics(stats, progress7d, nodeStats, wrongQuestions),
    goals: generateGoalReport(goals),
    timeAnalysis: generateTimeAnalysis(records, period),
    recommendations: generateRecommendations(stats, progress7d, nodeStats, wrongQuestions, goals),
  };

  return report;
}

/**
 * 生成摘要
 */
function generateSummary(stats, progress7d, period) {
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const studyDays = progress7d.filter(d => (d.total || 0) > 0).length;

  return {
    totalQuestions: total,
    correctQuestions: correct,
    accuracy: Math.round(accuracy * 10) / 10,
    studyDays,
    periodLabel: period === 'week' ? '本周' : period === 'month' ? '本月' : '总计',
  };
}

/**
 * 生成统计信息
 */
function generateStatistics(stats, progress7d, nodeStats, wrongQuestions) {
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  const masteredNodes = nodeStats.filter(n => (n.accuracy || 0) >= 0.8 && (n.total || 0) >= 5).length;
  const weakNodes = nodeStats.filter(n => (n.accuracy || 0) < 0.6 && (n.total || 0) >= 3).length;

  return {
    totalQuestions: total,
    correctQuestions: correct,
    accuracy: Math.round(accuracy * 10) / 10,
    masteredNodes,
    weakNodes,
    totalNodes: nodeStats.length,
    wrongQuestions: wrongQuestions.length,
    recentWrongQuestions: wrongQuestions.filter(q => {
      const lastError = new Date(q.lastErrorAt || q.createdAt);
      const daysAgo = (Date.now() - lastError.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }).length,
  };
}

/**
 * 生成目标报告
 */
function generateGoalReport(goals) {
  if (!goals || goals.length === 0) {
    return {
      total: 0,
      active: 0,
      completed: 0,
      behind: 0,
      details: [],
    };
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const behindGoals = activeGoals.filter(g => {
    const progress = g.progress || 0;
    const target = g.target || g.dailyTarget || 1;
    const expectedProgress = (Date.now() - new Date(g.startDate || g.createdAt).getTime()) /
      (new Date(g.endDate || Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() -
       new Date(g.startDate || g.createdAt).getTime());
    return progress / target < expectedProgress * 0.8;
  });

  return {
    total: goals.length,
    active: activeGoals.length,
    completed: completedGoals.length,
    behind: behindGoals.length,
    details: activeGoals.map(g => ({
      title: g.title || g.name,
      progress: g.progress || 0,
      target: g.target || g.dailyTarget || 0,
      percentage: g.target > 0 ? Math.round(((g.progress || 0) / g.target) * 100) : 0,
    })),
  };
}

/**
 * 生成时间分析
 */
function generateTimeAnalysis(records, period) {
  if (!records || records.length === 0) {
    return {
      totalTime: 0,
      averageDaily: 0,
      bestDay: null,
      bestTime: null,
    };
  }

  const now = new Date();
  let startDate;
  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    startDate = new Date(0);
  }

  const filteredRecords = records.filter(r => {
    const recordDate = new Date(r.date || r.createdAt);
    return recordDate >= startDate;
  });

  const totalTime = filteredRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
  const days = period === 'week' ? 7 : period === 'month' ? 30 : filteredRecords.length;
  const averageDaily = days > 0 ? totalTime / days : 0;

  // 找出最佳学习日
  const byDay = {};
  filteredRecords.forEach(r => {
    const dayKey = new Date(r.date || r.createdAt).toISOString().split('T')[0];
    byDay[dayKey] = (byDay[dayKey] || 0) + (r.duration || 0);
  });

  const bestDay = Object.entries(byDay)
    .sort((a, b) => b[1] - a[1])[0];

  // 找出最佳学习时间
  const byHour = {};
  filteredRecords.forEach(r => {
    const hour = new Date(r.date || r.createdAt).getHours();
    byHour[hour] = (byHour[hour] || 0) + (r.duration || 0);
  });

  const bestTime = Object.entries(byHour)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    totalTime: Math.round(totalTime),
    averageDaily: Math.round(averageDaily),
    bestDay: bestDay ? {
      date: bestDay[0],
      duration: Math.round(bestDay[1]),
    } : null,
    bestTime: bestTime ? {
      hour: parseInt(bestTime[0]),
      duration: Math.round(bestTime[1]),
    } : null,
  };
}

/**
 * 生成建议
 */
function generateRecommendations(stats, progress7d, nodeStats, wrongQuestions, goals) {
  const recommendations = [];

  // 基于学习频率
  const studyDays = progress7d.filter(d => (d.total || 0) > 0).length;
  if (studyDays < 5) {
    recommendations.push({
      type: 'frequency',
      priority: 'high',
      title: '学习频率不足',
      content: `本周只学习了${studyDays}天，建议增加学习频率。`,
    });
  }

  // 基于正确率
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  if (accuracy < 60) {
    recommendations.push({
      type: 'accuracy',
      priority: 'high',
      title: '正确率偏低',
      content: `当前正确率为${accuracy.toFixed(1)}%，建议加强基础知识学习。`,
    });
  }

  // 基于薄弱知识点
  const weakNodes = nodeStats.filter(n => (n.accuracy || 0) < 0.6 && (n.total || 0) >= 3);
  if (weakNodes.length > 5) {
    recommendations.push({
      type: 'knowledge',
      priority: 'medium',
      title: '薄弱知识点较多',
      content: `有${weakNodes.length}个薄弱知识点，建议制定专项复习计划。`,
    });
  }

  // 基于错题
  const recentWrong = wrongQuestions.filter(q => {
    const lastError = new Date(q.lastErrorAt || q.createdAt);
    const daysAgo = (Date.now() - lastError.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  if (recentWrong.length > 20) {
    recommendations.push({
      type: 'wrong_question',
      priority: 'high',
      title: '错题积累较多',
      content: `最近有${recentWrong.length}道错题，建议及时复习。`,
    });
  }

  // 基于目标
  const behindGoals = goals.filter(g => {
    if (g.status !== 'active') return false;
    const progress = g.progress || 0;
    const target = g.target || g.dailyTarget || 1;
    const expectedProgress = (Date.now() - new Date(g.startDate || g.createdAt).getTime()) /
      (new Date(g.endDate || Date.now() + 30 * 24 * 60 * 60 * 1000).getTime() -
       new Date(g.startDate || g.createdAt).getTime());
    return progress / target < expectedProgress * 0.8;
  });
  if (behindGoals.length > 0) {
    recommendations.push({
      type: 'goal',
      priority: 'medium',
      title: '目标进度落后',
      content: `有${behindGoals.length}个目标进度落后，建议调整学习计划。`,
    });
  }

  return recommendations;
}

/**
 * 导出报告为文本
 */
export function exportReportAsText(report) {
  let text = '学习报告\n';
  text += `生成时间：${new Date(report.generatedAt).toLocaleString('zh-CN')}\n`;
  text += `报告周期：${report.summary.periodLabel}\n\n`;

  text += '一、学习摘要\n';
  text += `总题数：${report.summary.totalQuestions}\n`;
  text += `正确题数：${report.summary.correctQuestions}\n`;
  text += `正确率：${report.summary.accuracy}%\n`;
  text += `学习天数：${report.summary.studyDays}天\n\n`;

  text += '二、统计信息\n';
  text += `已掌握知识点：${report.statistics.masteredNodes}个\n`;
  text += `薄弱知识点：${report.statistics.weakNodes}个\n`;
  text += `错题总数：${report.statistics.wrongQuestions}道\n`;
  text += `最近错题：${report.statistics.recentWrongQuestions}道\n\n`;

  text += '三、目标完成情况\n';
  text += `总目标数：${report.goals.total}\n`;
  text += `活跃目标：${report.goals.active}\n`;
  text += `已完成：${report.goals.completed}\n`;
  text += `进度落后：${report.goals.behind}\n\n`;

  if (report.timeAnalysis.totalTime > 0) {
    text += '四、时间分析\n';
    text += `总学习时间：${formatTime(report.timeAnalysis.totalTime)}\n`;
    text += `平均每日：${formatTime(report.timeAnalysis.averageDaily)}\n`;
    if (report.timeAnalysis.bestDay) {
      text += `最佳学习日：${report.timeAnalysis.bestDay.date}（${formatTime(report.timeAnalysis.bestDay.duration)}）\n`;
    }
    if (report.timeAnalysis.bestTime) {
      text += `最佳学习时间：${report.timeAnalysis.bestTime.hour}:00（${formatTime(report.timeAnalysis.bestTime.duration)}）\n`;
    }
    text += '\n';
  }

  if (report.recommendations.length > 0) {
    text += '五、学习建议\n';
    report.recommendations.forEach((rec, index) => {
      text += `${index + 1}. ${rec.title}：${rec.content}\n`;
    });
  }

  return text;
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

