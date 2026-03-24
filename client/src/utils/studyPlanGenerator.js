/**
 * GraphTutor V3.0 - 学习计划生成器
 * 
 * 功能：根据学习目标和数据生成个性化学习计划
 */

/**
 * 生成学习计划
 * @param {Object} data - 学习数据
 * @returns {Object} 学习计划
 */
export function generateStudyPlan(data) {
  const {
    goals = [],
    progress7d = [],
    nodeStats = [],
    wrongQuestions = [],
    availableTime = {}, // { weekdays: 60, weekends: 120 } 分钟
  } = data;

  // 分析当前学习情况
  const analysis = analyzeCurrentSituation({
    progress7d,
    nodeStats,
    wrongQuestions,
  });

  // 生成每日计划
  const dailyPlans = generateDailyPlans({
    goals,
    analysis,
    availableTime,
    days: 7, // 生成一周的计划
  });

  // 生成周计划总结
  const weeklySummary = generateWeeklySummary(dailyPlans, goals);

  // 生成建议
  const recommendations = generatePlanRecommendations({
    analysis,
    dailyPlans,
    goals,
  });

  return {
    dailyPlans,
    weeklySummary,
    recommendations,
    analysis,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 分析当前学习情况
 */
function analyzeCurrentSituation(data) {
  const { progress7d, nodeStats, wrongQuestions } = data;

  // 计算平均每日题数
  const avgDaily = progress7d.length > 0
    ? progress7d.reduce((sum, d) => sum + (d.total || 0), 0) / progress7d.length
    : 0;

  // 计算平均正确率
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) : 0;

  // 找出薄弱知识点
  const weakNodes = nodeStats.filter(n => n.accuracy < 0.6 && n.total >= 3);

  // 错题数量
  const wrongCount = wrongQuestions.length;
  const recentWrongCount = wrongQuestions.filter(q => {
    const lastError = new Date(q.lastErrorAt || q.createdAt);
    const daysAgo = (Date.now() - lastError) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  }).length;

  return {
    avgDaily,
    accuracy,
    weakNodes: weakNodes.length,
    wrongCount,
    recentWrongCount,
    studyDays: progress7d.filter(d => (d.total || 0) > 0).length,
  };
}

/**
 * 生成每日计划
 */
function generateDailyPlans({ goals, analysis, availableTime, days }) {
  const plans = [];
  const today = new Date();

  // 计算每日目标题数
  const dailyTarget = calculateDailyTarget(goals, analysis, days);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 根据可用时间调整
    const timeAvailable = isWeekend 
      ? (availableTime.weekends || 120)
      : (availableTime.weekdays || 60);

    // 生成当天的学习任务
    const tasks = generateDailyTasks({
      date,
      dailyTarget,
      timeAvailable,
      analysis,
      isWeekend,
    });

    plans.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: getDayName(dayOfWeek),
      isWeekend,
      timeAvailable,
      tasks,
      estimatedDuration: calculateEstimatedDuration(tasks),
    });
  }

  return plans;
}

/**
 * 计算每日目标题数
 */
function calculateDailyTarget(goals, analysis, days) {
  // 如果有活跃的目标，优先使用目标
  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    const totalTarget = activeGoals.reduce((sum, g) => {
      if (g.type === 'daily') return sum + (g.target || 0);
      if (g.type === 'weekly') return sum + (g.target || 0) / 7;
      if (g.type === 'monthly') return sum + (g.target || 0) / 30;
      return sum;
    }, 0);
    
    if (totalTarget > 0) {
      return Math.ceil(totalTarget / activeGoals.length);
    }
  }

  // 否则基于历史数据
  const baseTarget = Math.max(analysis.avgDaily || 20, 20);
  
  // 如果有薄弱知识点，增加复习题
  if (analysis.weakNodes > 0) {
    return Math.ceil(baseTarget * 1.2);
  }

  return Math.ceil(baseTarget);
}

/**
 * 生成每日学习任务
 */
function generateDailyTasks({ date, dailyTarget, timeAvailable, analysis, isWeekend }) {
  const tasks = [];
  let remainingQuestions = dailyTarget;

  // 1. 错题复习（优先）
  if (analysis.recentWrongCount > 0) {
    const reviewCount = Math.min(Math.ceil(analysis.recentWrongCount / 7), 10);
    if (reviewCount > 0) {
      tasks.push({
        type: 'review',
        name: '错题复习',
        count: reviewCount,
        priority: 'high',
        estimatedTime: reviewCount * 3, // 每题3分钟
      });
      remainingQuestions -= reviewCount;
    }
  }

  // 2. 薄弱知识点练习
  if (analysis.weakNodes > 0 && remainingQuestions > 0) {
    const weakPracticeCount = Math.min(Math.ceil(remainingQuestions * 0.3), 15);
    if (weakPracticeCount > 0) {
      tasks.push({
        type: 'weak_practice',
        name: '薄弱知识点练习',
        count: weakPracticeCount,
        priority: 'high',
        estimatedTime: weakPracticeCount * 2,
      });
      remainingQuestions -= weakPracticeCount;
    }
  }

  // 3. 常规练习
  if (remainingQuestions > 0) {
    tasks.push({
      type: 'practice',
      name: '常规练习',
      count: remainingQuestions,
      priority: 'medium',
      estimatedTime: remainingQuestions * 2,
    });
  }

  // 4. 周末可以增加学习时长
  if (isWeekend && timeAvailable >= 120) {
    tasks.push({
      type: 'extended_practice',
      name: '扩展练习',
      count: Math.ceil((timeAvailable - calculateEstimatedDuration(tasks)) / 2),
      priority: 'low',
      estimatedTime: timeAvailable - calculateEstimatedDuration(tasks),
    });
  }

  return tasks;
}

/**
 * 计算预估时长
 */
function calculateEstimatedDuration(tasks) {
  return tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
}

/**
 * 生成周计划总结
 */
function generateWeeklySummary(dailyPlans, goals) {
  const totalQuestions = dailyPlans.reduce((sum, plan) => {
    return sum + plan.tasks.reduce((s, task) => s + (task.count || 0), 0);
  }, 0);

  const totalDuration = dailyPlans.reduce((sum, plan) => sum + plan.estimatedDuration, 0);

  const studyDays = dailyPlans.filter(plan => plan.tasks.length > 0).length;

  return {
    totalQuestions,
    totalDuration,
    studyDays,
    avgDaily: totalQuestions / 7,
    avgDuration: totalDuration / 7,
    goalsProgress: calculateGoalsProgress(goals, totalQuestions),
  };
}

/**
 * 计算目标进度
 */
function calculateGoalsProgress(goals, totalQuestions) {
  return goals
    .filter(g => g.status === 'active')
    .map(goal => {
      const progress = goal.target > 0 
        ? Math.min((totalQuestions / goal.target) * 100, 100)
        : 0;
      return {
        goalId: goal._id || goal.id,
        goalName: goal.title || goal.name,
        progress,
      };
    });
}

/**
 * 生成计划建议
 */
function generatePlanRecommendations({ analysis, dailyPlans, goals }) {
  const recommendations = [];

  // 基于平均每日题数
  const avgDaily = dailyPlans.reduce((sum, p) => {
    return sum + p.tasks.reduce((s, t) => s + (t.count || 0), 0);
  }, 0) / dailyPlans.length;

  if (avgDaily < analysis.avgDaily * 0.8) {
    recommendations.push({
      type: 'warning',
      title: '计划题数偏少',
      content: `计划平均每日${avgDaily.toFixed(1)}题，低于历史平均${analysis.avgDaily.toFixed(1)}题，建议适当增加。`,
    });
  }

  // 基于错题数量
  if (analysis.recentWrongCount > 20) {
    recommendations.push({
      type: 'high',
      title: '错题较多',
      content: `最近有${analysis.recentWrongCount}道错题，建议增加错题复习时间。`,
    });
  }

  // 基于薄弱知识点
  if (analysis.weakNodes > 5) {
    recommendations.push({
      type: 'high',
      title: '薄弱知识点较多',
      content: `有${analysis.weakNodes}个薄弱知识点，建议制定专项复习计划。`,
    });
  }

  // 基于目标
  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) {
    recommendations.push({
      type: 'info',
      title: '建议设置学习目标',
      content: '设置学习目标可以帮助你更好地规划学习计划。',
    });
  }

  return recommendations;
}

/**
 * 获取星期名称
 */
function getDayName(dayOfWeek) {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[dayOfWeek];
}

/**
 * 导出学习计划为文本
 */
export function exportPlanAsText(plan) {
  let text = '学习计划\n';
  text += `生成时间：${new Date(plan.generatedAt).toLocaleString('zh-CN')}\n\n`;

  text += '周计划总结：\n';
  text += `总题数：${plan.weeklySummary.totalQuestions}\n`;
  text += `总时长：${formatDuration(plan.weeklySummary.totalDuration)}\n`;
  text += `学习天数：${plan.weeklySummary.studyDays}\n`;
  text += `平均每日：${plan.weeklySummary.avgDaily.toFixed(1)}题\n\n`;

  text += '每日计划：\n';
  plan.dailyPlans.forEach((daily, index) => {
    text += `\n${index + 1}. ${daily.date} (${daily.dayOfWeek})\n`;
    text += `   可用时间：${formatDuration(daily.timeAvailable)}\n`;
    daily.tasks.forEach((task, taskIndex) => {
      text += `   ${taskIndex + 1}. ${task.name}：${task.count}题 (约${formatDuration(task.estimatedTime)})\n`;
    });
    text += `   总时长：${formatDuration(daily.estimatedDuration)}\n`;
  });

  if (plan.recommendations.length > 0) {
    text += '\n建议：\n';
    plan.recommendations.forEach((rec, index) => {
      text += `${index + 1}. ${rec.title}：${rec.content}\n`;
    });
  }

  return text;
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

