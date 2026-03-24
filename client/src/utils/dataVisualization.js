/**
 * GraphTutor V3.0 - 学习数据可视化工具
 * 
 * 功能：提供更多数据可视化选项
 */

/**
 * 生成学习热力图数据
 */
export function generateHeatmapData(progress7d, days = 365) {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayData = progress7d.find(d => d.date === dateKey);
    
    data.push({
      date: dateKey,
      value: dayData ? (dayData.total || 0) : 0,
      count: dayData ? (dayData.total || 0) : 0,
    });
  }
  
  return data;
}

/**
 * 生成学习雷达图数据
 */
export function generateRadarData(nodeStats) {
  if (!nodeStats || nodeStats.length === 0) {
    return [];
  }

  // 按科目或类型分组
  const grouped = {};
  nodeStats.forEach(node => {
    const key = node.subject || node.type || '其他';
    if (!grouped[key]) {
      grouped[key] = {
        subject: key,
        total: 0,
        correct: 0,
        count: 0,
      };
    }
    grouped[key].total += node.total || 0;
    grouped[key].correct += (node.correct || 0);
    grouped[key].count += 1;
  });

  return Object.values(grouped).map(group => ({
    subject: group.subject,
    accuracy: group.total > 0 ? ((group.correct / group.total) * 100) : 0,
    total: group.total,
    average: group.count > 0 ? (group.total / group.count) : 0,
  }));
}

/**
 * 生成学习趋势数据
 */
export function generateTrendData(progress7d, type = 'total') {
  if (!progress7d || progress7d.length === 0) {
    return [];
  }

  return progress7d.map(day => ({
    date: day.date,
    total: day.total || 0,
    correct: day.correct || 0,
    accuracy: day.total > 0 ? ((day.correct || 0) / day.total) * 100 : 0,
    value: type === 'total' ? (day.total || 0) : 
           type === 'correct' ? (day.correct || 0) : 
           day.total > 0 ? ((day.correct || 0) / day.total) * 100 : 0,
  }));
}

/**
 * 生成知识点掌握度数据
 */
export function generateMasteryData(nodeStats) {
  if (!nodeStats || nodeStats.length === 0) {
    return [];
  }

  const masteryLevels = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    expert: 0,
  };

  nodeStats.forEach(node => {
    const accuracy = node.accuracy || 0;
    const total = node.total || 0;
    
    if (accuracy >= 0.9 && total >= 10) {
      masteryLevels.expert++;
    } else if (accuracy >= 0.8 && total >= 5) {
      masteryLevels.advanced++;
    } else if (accuracy >= 0.6 && total >= 3) {
      masteryLevels.intermediate++;
    } else {
      masteryLevels.beginner++;
    }
  });

  return Object.entries(masteryLevels).map(([level, count]) => ({
    level,
    count,
    label: getMasteryLabel(level),
  }));
}

/**
 * 获取掌握度标签
 */
function getMasteryLabel(level) {
  const labels = {
    beginner: '入门',
    intermediate: '中级',
    advanced: '高级',
    expert: '精通',
  };
  return labels[level] || level;
}

/**
 * 生成学习分布数据
 */
export function generateDistributionData(data, type = 'subject') {
  if (!data || data.length === 0) {
    return [];
  }

  const grouped = {};
  data.forEach(item => {
    const key = item[type] || '其他';
    grouped[key] = (grouped[key] || 0) + (item.count || item.total || 1);
  });

  return Object.entries(grouped)
    .map(([key, value]) => ({
      name: key,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // 只显示前10个
}

/**
 * 生成对比数据
 */
export function generateComparisonData(currentData, previousData, type = 'total') {
  const comparison = [];

  const current = currentData.reduce((sum, d) => sum + (d[type] || 0), 0);
  const previous = previousData.reduce((sum, d) => sum + (d[type] || 0), 0);
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  comparison.push({
    period: '当前',
    value: current,
    change: 0,
  });

  comparison.push({
    period: '之前',
    value: previous,
    change: change,
  });

  return {
    current,
    previous,
    change: Math.round(change * 10) / 10,
    comparison,
  };
}

/**
 * 生成学习效率数据
 */
export function generateEfficiencyData(records, questions) {
  if (!records || records.length === 0 || !questions || questions.length === 0) {
    return [];
  }

  const byDay = {};
  records.forEach(record => {
    const dayKey = new Date(record.date || record.createdAt).toISOString().split('T')[0];
    if (!byDay[dayKey]) {
      byDay[dayKey] = {
        date: dayKey,
        duration: 0,
        questions: 0,
      };
    }
    byDay[dayKey].duration += record.duration || 0;
  });

  questions.forEach(question => {
    const dayKey = new Date(question.date || question.createdAt).toISOString().split('T')[0];
    if (byDay[dayKey]) {
      byDay[dayKey].questions += 1;
    }
  });

  return Object.values(byDay)
    .map(day => ({
      date: day.date,
      efficiency: day.duration > 0 ? (day.questions / (day.duration / 60)) : 0,
      questionsPerHour: day.duration > 0 ? (day.questions / (day.duration / 60)) : 0,
    }))
    .filter(day => day.efficiency > 0);
}

