/**
 * GraphTutor V3.0 - 学习洞察分析工具
 * 
 * 功能：基于学习数据生成AI洞察和建议
 */

/**
 * 生成学习洞察
 * @param {Object} data - 学习数据
 * @returns {Object} 洞察结果
 */
export function generateLearningInsights(data) {
  const {
    stats = {},
    progress7d = [],
    nodeStats = [],
    wrongQuestions = [],
    goals = [],
  } = data;

  const insights = [];

  // 1. 学习频率分析
  const studyDays = progress7d.filter(d => d.total > 0).length;
  if (studyDays < 3) {
    insights.push({
      type: 'warning',
      title: '学习频率较低',
      content: `最近7天你只学习了${studyDays}天，建议保持每天学习的习惯。`,
      suggestion: '尝试每天至少学习30分钟，建立稳定的学习节奏。',
      priority: 'high',
    });
  } else if (studyDays >= 6) {
    insights.push({
      type: 'success',
      title: '学习习惯良好',
      content: `最近7天你学习了${studyDays}天，学习频率很高！`,
      suggestion: '继续保持，可以考虑增加每天的学习时长。',
      priority: 'low',
    });
  }

  // 2. 正确率分析
  const avgAccuracy = progress7d.length > 0
    ? progress7d.reduce((sum, d) => sum + (d.accuracy || 0), 0) / progress7d.length
    : 0;

  if (avgAccuracy < 0.6) {
    insights.push({
      type: 'warning',
      title: '正确率需要提升',
      content: `你的平均正确率为${(avgAccuracy * 100).toFixed(1)}%，低于平均水平。`,
      suggestion: '建议多复习错题，加强薄弱知识点的练习。',
      priority: 'high',
    });
  } else if (avgAccuracy >= 0.8) {
    insights.push({
      type: 'success',
      title: '正确率优秀',
      content: `你的平均正确率为${(avgAccuracy * 100).toFixed(1)}%，表现很好！`,
      suggestion: '可以尝试挑战更高难度的题目。',
      priority: 'low',
    });
  }

  // 3. 知识点掌握度分析
  const weakNodes = nodeStats.filter(n => n.accuracy < 0.6 && n.total >= 3);
  if (weakNodes.length > 0) {
    insights.push({
      type: 'warning',
      title: '薄弱知识点',
      content: `你有${weakNodes.length}个知识点的掌握度较低（正确率<60%）。`,
      suggestion: `建议重点复习：${weakNodes.slice(0, 3).map(n => n.name || n.knowledgeNode).join('、')}。`,
      priority: 'high',
      relatedNodes: weakNodes.map(n => n.knowledgeNodeId || n._id),
    });
  }

  const strongNodes = nodeStats.filter(n => n.accuracy >= 0.9 && n.total >= 5);
  if (strongNodes.length > 0) {
    insights.push({
      type: 'success',
      title: '掌握良好的知识点',
      content: `你有${strongNodes.length}个知识点掌握得很好（正确率≥90%）。`,
      suggestion: '继续保持，可以将更多时间投入到薄弱知识点。',
      priority: 'low',
    });
  }

  // 4. 错题分析
  if (wrongQuestions.length > 0) {
    const recentWrong = wrongQuestions.filter(q => {
      const lastError = new Date(q.lastErrorAt || q.createdAt);
      const daysAgo = (Date.now() - lastError) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }).length;

    if (recentWrong > 10) {
      insights.push({
        type: 'warning',
        title: '错题较多',
        content: `最近7天你有${recentWrong}道错题，需要加强复习。`,
        suggestion: '建议使用智能复习计划，系统性地复习错题。',
        priority: 'high',
      });
    }
  }

  // 5. 学习趋势分析
  if (progress7d.length >= 3) {
    const recent = progress7d.slice(-3);
    const earlier = progress7d.slice(0, 3);
    const recentAvg = recent.reduce((sum, d) => sum + d.total, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, d) => sum + d.total, 0) / earlier.length;

    if (recentAvg > earlierAvg * 1.2) {
      insights.push({
        type: 'success',
        title: '学习量上升',
        content: '最近的学习量比之前增加了20%以上，学习积极性很高！',
        suggestion: '继续保持这个学习节奏。',
        priority: 'low',
      });
    } else if (recentAvg < earlierAvg * 0.8) {
      insights.push({
        type: 'warning',
        title: '学习量下降',
        content: '最近的学习量有所下降，需要重新调整学习计划。',
        suggestion: '建议设定每日学习目标，保持学习动力。',
        priority: 'medium',
      });
    }
  }

  // 6. 目标完成情况
  if (goals && goals.length > 0) {
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    
    if (activeGoals.length > 0) {
      const completionRate = completedGoals.length / (activeGoals.length + completedGoals.length);
      if (completionRate < 0.5) {
        insights.push({
          type: 'warning',
          title: '目标完成率较低',
          content: `你的目标完成率为${(completionRate * 100).toFixed(0)}%，还有${activeGoals.length}个目标未完成。`,
          suggestion: '建议将大目标拆分为小目标，逐步完成。',
          priority: 'medium',
        });
      }
    }
  }

  // 7. 学习时间分布分析
  const totalStudyTime = progress7d.reduce((sum, d) => sum + (d.duration || 0), 0);
  if (totalStudyTime > 0) {
    const avgDailyTime = totalStudyTime / 7;
    if (avgDailyTime < 30) {
      insights.push({
        type: 'info',
        title: '学习时长建议',
        content: `你平均每天学习${Math.round(avgDailyTime)}分钟。`,
        suggestion: '建议每天至少学习30-60分钟，效果会更好。',
        priority: 'medium',
      });
    } else if (avgDailyTime > 120) {
      insights.push({
        type: 'info',
        title: '学习时长充足',
        content: `你平均每天学习${Math.round(avgDailyTime)}分钟，学习时间很充足。`,
        suggestion: '注意劳逸结合，避免过度疲劳。',
        priority: 'low',
      });
    }
  }

  // 按优先级排序
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  insights.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return {
    insights,
    summary: {
      total: insights.length,
      warnings: insights.filter(i => i.type === 'warning').length,
      successes: insights.filter(i => i.type === 'success').length,
      info: insights.filter(i => i.type === 'info').length,
    },
  };
}

/**
 * 生成个性化学习建议
 * @param {Object} data - 学习数据
 * @returns {Array} 建议列表
 */
export function generatePersonalizedSuggestions(data) {
  const suggestions = [];
  const { stats, nodeStats, wrongQuestions, progress7d } = data;

  // 基于正确率的建议
  const avgAccuracy = progress7d.length > 0
    ? progress7d.reduce((sum, d) => sum + (d.accuracy || 0), 0) / progress7d.length
    : 0;

  if (avgAccuracy < 0.7) {
    suggestions.push({
      category: '练习策略',
      title: '加强基础练习',
      description: '建议先从基础题目开始，逐步提升难度。',
      action: '前往错题本复习',
      link: '/review',
    });
  }

  // 基于薄弱知识点的建议
  const weakNodes = nodeStats.filter(n => n.accuracy < 0.6 && n.total >= 3);
  if (weakNodes.length > 0) {
    suggestions.push({
      category: '知识点强化',
      title: '重点复习薄弱知识点',
      description: `有${weakNodes.length}个知识点需要加强，建议制定专项复习计划。`,
      action: '查看学习路径',
      link: '/learning-path',
    });
  }

  // 基于学习频率的建议
  const studyDays = progress7d.filter(d => d.total > 0).length;
  if (studyDays < 5) {
    suggestions.push({
      category: '学习习惯',
      title: '建立每日学习习惯',
      description: '建议每天固定时间学习，使用学习提醒功能。',
      action: '设置学习提醒',
      link: '/settings',
    });
  }

  return suggestions;
}

