/**
 * GraphTutor V3.0 - 学习时间管理工具
 * 
 * 功能：管理和分析学习时间
 */

/**
 * 计算学习时间统计
 */
export function calculateTimeStats(records) {
  if (!records || records.length === 0) {
    return {
      total: 0,
      average: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      byDay: {},
      byHour: {},
      bySubject: {},
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let total = 0;
  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;
  const byDay = {};
  const byHour = {};
  const bySubject = {};

  records.forEach(record => {
    const duration = record.duration || 0; // 分钟
    const recordDate = new Date(record.date || record.createdAt);
    const dayKey = recordDate.toISOString().split('T')[0];
    const hour = recordDate.getHours();
    const subject = record.subject || record.subjectCode || '其他';

    total += duration;

    // 按日期统计
    byDay[dayKey] = (byDay[dayKey] || 0) + duration;

    // 按小时统计
    byHour[hour] = (byHour[hour] || 0) + duration;

    // 按科目统计
    bySubject[subject] = (bySubject[subject] || 0) + duration;

    // 今天
    if (recordDate >= today) {
      todayTotal += duration;
    }

    // 本周
    if (recordDate >= weekStart) {
      weekTotal += duration;
    }

    // 本月
    if (recordDate >= monthStart) {
      monthTotal += duration;
    }
  });

  const average = records.length > 0 ? total / records.length : 0;

  return {
    total,
    average: Math.round(average),
    today: Math.round(todayTotal),
    thisWeek: Math.round(weekTotal),
    thisMonth: Math.round(monthTotal),
    byDay,
    byHour,
    bySubject,
  };
}

/**
 * 格式化时间（分钟转可读格式）
 */
export function formatTime(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${mins}分钟`;
}

/**
 * 获取最佳学习时间
 */
export function getBestStudyTime(byHour) {
  if (!byHour || Object.keys(byHour).length === 0) {
    return null;
  }

  const sorted = Object.entries(byHour)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return sorted.map(([hour, duration]) => ({
    hour: parseInt(hour),
    duration: Math.round(duration),
    label: `${hour}:00-${parseInt(hour) + 1}:00`,
  }));
}

/**
 * 获取学习时间趋势
 */
export function getTimeTrend(byDay, days = 7) {
  const now = new Date();
  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayKey = date.toISOString().split('T')[0];
    trend.push({
      date: dayKey,
      duration: byDay[dayKey] || 0,
      dayName: getDayName(date.getDay()),
    });
  }

  return trend;
}

/**
 * 获取星期名称
 */
function getDayName(dayOfWeek) {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[dayOfWeek];
}

/**
 * 计算学习效率
 */
export function calculateTimeEfficiency(records, questions) {
  if (!records || records.length === 0 || !questions || questions.length === 0) {
    return {
      efficiency: 0,
      questionsPerHour: 0,
      averageTimePerQuestion: 0,
    };
  }

  const totalTime = records.reduce((sum, r) => sum + (r.duration || 0), 0); // 分钟
  const totalQuestions = questions.length;
  const totalHours = totalTime / 60;

  const questionsPerHour = totalHours > 0 ? totalQuestions / totalHours : 0;
  const averageTimePerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0;

  // 效率评分（基于每小时题数，假设理想值为20题/小时）
  const idealRate = 20;
  const efficiency = Math.min((questionsPerHour / idealRate) * 100, 100);

  return {
    efficiency: Math.round(efficiency),
    questionsPerHour: Math.round(questionsPerHour * 10) / 10,
    averageTimePerQuestion: Math.round(averageTimePerQuestion),
  };
}

/**
 * 生成时间管理建议
 */
export function generateTimeManagementSuggestions(stats, efficiency) {
  const suggestions = [];

  // 基于总时间
  if (stats.thisWeek < 300) { // 少于5小时
    suggestions.push({
      type: 'time',
      priority: 'high',
      title: '学习时间不足',
      content: `本周学习时间${formatTime(stats.thisWeek)}，建议增加到至少5小时。`,
    });
  }

  // 基于每日时间
  const avgDaily = stats.thisWeek / 7;
  if (avgDaily < 30) { // 平均每天少于30分钟
    suggestions.push({
      type: 'time',
      priority: 'medium',
      title: '每日学习时间偏少',
      content: `本周平均每日学习${formatTime(avgDaily)}，建议增加到至少1小时。`,
    });
  }

  // 基于效率
  if (efficiency && efficiency.efficiency < 50) {
    suggestions.push({
      type: 'efficiency',
      priority: 'high',
      title: '学习效率偏低',
      content: `当前学习效率${efficiency.efficiency}%，建议提高专注度，减少干扰。`,
    });
  }

  // 基于最佳学习时间
  const bestTimes = getBestStudyTime(stats.byHour);
  if (bestTimes && bestTimes.length > 0) {
    suggestions.push({
      type: 'time',
      priority: 'low',
      title: '最佳学习时间',
      content: `你的最佳学习时间是${bestTimes[0].label}，建议在这个时间段安排重要学习任务。`,
    });
  }

  return suggestions;
}

