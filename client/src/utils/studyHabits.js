/**
 * GraphTutor V3.0 - 学习习惯分析工具
 * 
 * 功能：分析用户的学习模式和习惯
 */

/**
 * 分析学习习惯
 * @param {Object} data - 学习数据
 * @returns {Object} 习惯分析结果
 */
export function analyzeStudyHabits(data) {
  const {
    records = [],
    progress7d = [],
    progress30d = [],
    checkIns = [],
  } = data;

  // 学习时间分布分析
  const timeDistribution = analyzeTimeDistribution(records);
  
  // 学习频率分析
  const frequency = analyzeFrequency(progress7d, progress30d);
  
  // 学习时长分析
  const duration = analyzeDuration(progress7d, progress30d);
  
  // 学习强度分析
  const intensity = analyzeIntensity(progress7d);
  
  // 学习一致性分析
  const consistency = analyzeConsistency(progress7d, progress30d);
  
  // 学习时段偏好
  const timePreference = analyzeTimePreference(records);
  
  // 学习模式识别
  const patterns = identifyPatterns(progress7d, records);
  
  // 打卡习惯
  const checkInHabits = analyzeCheckInHabits(checkIns);
  
  return {
    timeDistribution,
    frequency,
    duration,
    intensity,
    consistency,
    timePreference,
    patterns,
    checkInHabits,
    summary: generateHabitSummary({
      frequency,
      duration,
      intensity,
      consistency,
      timePreference,
      patterns,
    }),
  };
}

/**
 * 分析学习时间分布
 */
function analyzeTimeDistribution(records) {
  const hourCounts = {};
  const dayCounts = {};
  
  records.forEach(record => {
    if (record.createdAt) {
      const date = new Date(record.createdAt);
      const hour = date.getHours();
      const day = date.getDay();
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
  });
  
  // 找出最活跃的时段
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  // 找出最活跃的日期
  const peakDay = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  
  return {
    hourly: hourCounts,
    daily: dayCounts,
    peakHour: peakHour !== undefined ? `${peakHour}:00-${parseInt(peakHour) + 1}:00` : null,
    peakDay: peakDay !== undefined ? dayNames[peakDay] : null,
    distribution: {
      morning: Object.keys(hourCounts).filter(h => h >= 6 && h < 12).reduce((sum, h) => sum + hourCounts[h], 0),
      afternoon: Object.keys(hourCounts).filter(h => h >= 12 && h < 18).reduce((sum, h) => sum + hourCounts[h], 0),
      evening: Object.keys(hourCounts).filter(h => h >= 18 && h < 22).reduce((sum, h) => sum + hourCounts[h], 0),
      night: Object.keys(hourCounts).filter(h => h >= 22 || h < 6).reduce((sum, h) => sum + hourCounts[h], 0),
    },
  };
}

/**
 * 分析学习频率
 */
function analyzeFrequency(progress7d, progress30d) {
  const studyDays7d = progress7d.filter(d => d.total > 0).length;
  const studyDays30d = progress30d.filter(d => d.total > 0).length;
  
  const frequency7d = (studyDays7d / 7) * 100;
  const frequency30d = (studyDays30d / 30) * 100;
  
  let trend = 'stable';
  if (frequency7d > frequency30d * 1.1) trend = 'increasing';
  if (frequency7d < frequency30d * 0.9) trend = 'decreasing';
  
  return {
    weekly: frequency7d.toFixed(1) + '%',
    monthly: frequency30d.toFixed(1) + '%',
    trend,
    level: getFrequencyLevel(frequency7d),
    recommendation: getFrequencyRecommendation(frequency7d),
  };
}

/**
 * 分析学习时长
 */
function analyzeDuration(progress7d, progress30d) {
  const total7d = progress7d.reduce((sum, d) => sum + (d.duration || 0), 0);
  const total30d = progress30d.reduce((sum, d) => sum + (d.duration || 0), 0);
  
  const avg7d = progress7d.length > 0 ? total7d / progress7d.length : 0;
  const avg30d = progress30d.length > 0 ? total30d / progress30d.length : 0;
  
  let trend = 'stable';
  if (avg7d > avg30d * 1.1) trend = 'increasing';
  if (avg7d < avg30d * 0.9) trend = 'decreasing';
  
  return {
    weekly: formatDuration(total7d),
    monthly: formatDuration(total30d),
    avgDaily: formatDuration(avg7d),
    trend,
    level: getDurationLevel(avg7d),
    recommendation: getDurationRecommendation(avg7d),
  };
}

/**
 * 分析学习强度
 */
function analyzeIntensity(progress7d) {
  const avgDaily = progress7d.reduce((sum, d) => sum + d.total, 0) / 7;
  
  let level = 'low';
  if (avgDaily >= 50) level = 'high';
  else if (avgDaily >= 20) level = 'medium';
  
  return {
    level,
    avgDaily: avgDaily.toFixed(1),
    recommendation: getIntensityRecommendation(avgDaily),
  };
}

/**
 * 分析学习一致性
 */
function analyzeConsistency(progress7d, progress30d) {
  const studyDays7d = progress7d.filter(d => d.total > 0).length;
  const studyDays30d = progress30d.filter(d => d.total > 0).length;
  
  const consistency7d = (studyDays7d / 7) * 100;
  const consistency30d = (studyDays30d / 30) * 100;
  
  // 计算连续学习天数
  let consecutiveDays = 0;
  let maxConsecutive = 0;
  let currentStreak = 0;
  
  for (let i = progress7d.length - 1; i >= 0; i--) {
    if (progress7d[i].total > 0) {
      currentStreak++;
      maxConsecutive = Math.max(maxConsecutive, currentStreak);
      if (i === progress7d.length - 1) consecutiveDays = currentStreak;
    } else {
      currentStreak = 0;
    }
  }
  
  return {
    weekly: consistency7d.toFixed(1) + '%',
    monthly: consistency30d.toFixed(1) + '%',
    consecutiveDays,
    maxConsecutive,
    level: getConsistencyLevel(consistency7d),
    recommendation: getConsistencyRecommendation(consistency7d, consecutiveDays),
  };
}

/**
 * 分析学习时段偏好
 */
function analyzeTimePreference(records) {
  const timeDistribution = analyzeTimeDistribution(records);
  const { distribution } = timeDistribution;
  
  const total = distribution.morning + distribution.afternoon + distribution.evening + distribution.night;
  if (total === 0) {
    return {
      preferred: '暂无数据',
      distribution: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
      },
    };
  }
  
  const percentages = {
    morning: (distribution.morning / total * 100).toFixed(1),
    afternoon: (distribution.afternoon / total * 100).toFixed(1),
    evening: (distribution.evening / total * 100).toFixed(1),
    night: (distribution.night / total * 100).toFixed(1),
  };
  
  const preferred = Object.entries(percentages)
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))[0]?.[0];
  
  const timeLabels = {
    morning: '早晨（6-12点）',
    afternoon: '下午（12-18点）',
    evening: '晚上（18-22点）',
    night: '夜间（22-6点）',
  };
  
  return {
    preferred: timeLabels[preferred] || '暂无数据',
    distribution: percentages,
  };
}

/**
 * 识别学习模式
 */
function identifyPatterns(progress7d, records) {
  const patterns = [];
  
  // 检查是否有固定学习时间
  const timeSlots = {};
  records.forEach(r => {
    if (r.createdAt) {
      const hour = new Date(r.createdAt).getHours();
      const slot = Math.floor(hour / 3); // 每3小时一个时段
      timeSlots[slot] = (timeSlots[slot] || 0) + 1;
    }
  });
  
  const hasFixedTime = Object.keys(timeSlots).length <= 2 && records.length > 10;
  if (hasFixedTime) {
    patterns.push({
      type: 'fixed_time',
      description: '有固定的学习时间习惯',
      strength: 'strong',
    });
  }
  
  // 检查是否有周末学习习惯
  const weekendCount = progress7d.filter((d, i) => {
    const day = new Date(d.date || Date.now() - (6 - i) * 24 * 60 * 60 * 1000).getDay();
    return (day === 0 || day === 6) && d.total > 0;
  }).length;
  
  if (weekendCount >= 2) {
    patterns.push({
      type: 'weekend_study',
      description: '有周末学习习惯',
      strength: 'medium',
    });
  }
  
  // 检查学习强度变化
  const recent = progress7d.slice(-3);
  const earlier = progress7d.slice(0, 3);
  const recentAvg = recent.reduce((sum, d) => sum + d.total, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, d) => sum + d.total, 0) / earlier.length;
  
  if (recentAvg > earlierAvg * 1.3) {
    patterns.push({
      type: 'increasing_intensity',
      description: '学习强度在增加',
      strength: 'positive',
    });
  }
  
  return patterns;
}

/**
 * 分析打卡习惯
 */
function analyzeCheckInHabits(checkIns) {
  if (!checkIns || checkIns.length === 0) {
    return {
      total: 0,
      streak: 0,
      level: 'none',
      recommendation: '开始每日打卡，建立学习习惯',
    };
  }
  
  // 计算连续打卡天数
  let streak = 0;
  const sorted = [...checkIns].sort((a, b) => 
    new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
  );
  
  let lastDate = new Date(sorted[0]?.date || sorted[0]?.createdAt);
  lastDate.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < sorted.length; i++) {
    const checkInDate = new Date(sorted[i].date || sorted[i].createdAt);
    checkInDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((lastDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (i === 0 || daysDiff === 0) {
      streak++;
    } else if (daysDiff === 1) {
      streak++;
      lastDate = checkInDate;
    } else {
      break;
    }
  }
  
  return {
    total: checkIns.length,
    streak,
    level: getStreakLevel(streak),
    recommendation: getStreakRecommendation(streak),
  };
}

/**
 * 生成习惯总结
 */
function generateHabitSummary(data) {
  const strengths = [];
  const improvements = [];
  
  if (data.frequency.level === 'excellent' || data.frequency.level === 'good') {
    strengths.push('学习频率很高，保持了良好的学习习惯');
  } else {
    improvements.push('提高学习频率，建议每天至少学习30分钟');
  }
  
  if (data.consistency.level === 'excellent' || data.consistency.level === 'good') {
    strengths.push('学习一致性很好，能够持续学习');
  } else {
    improvements.push('提高学习一致性，建立每日学习习惯');
  }
  
  if (data.timePreference.preferred !== '暂无数据') {
    strengths.push(`偏好${data.timePreference.preferred}学习`);
  }
  
  if (data.patterns.length > 0) {
    strengths.push(`识别到${data.patterns.length}种学习模式`);
  }
  
  return {
    strengths,
    improvements,
    overall: strengths.length >= improvements.length ? 'good' : 'needs_improvement',
  };
}

// 辅助函数
function getFrequencyLevel(frequency) {
  if (frequency >= 85) return 'excellent';
  if (frequency >= 70) return 'good';
  if (frequency >= 50) return 'fair';
  return 'poor';
}

function getFrequencyRecommendation(frequency) {
  if (frequency < 50) return '建议每天至少学习30分钟，建立稳定的学习习惯';
  if (frequency < 70) return '学习频率还可以，建议保持每天学习';
  return '学习频率很好，继续保持';
}

function getDurationLevel(avgMinutes) {
  if (avgMinutes >= 60) return 'excellent';
  if (avgMinutes >= 30) return 'good';
  if (avgMinutes >= 15) return 'fair';
  return 'poor';
}

function getDurationRecommendation(avgMinutes) {
  if (avgMinutes < 15) return '建议每天至少学习30分钟，效果会更好';
  if (avgMinutes < 30) return '学习时长还可以，建议增加到30-60分钟';
  if (avgMinutes < 60) return '学习时长充足，继续保持';
  return '学习时长很充足，注意劳逸结合';
}

function getIntensityRecommendation(avgDaily) {
  if (avgDaily < 10) return '建议每天至少完成10道题目';
  if (avgDaily < 20) return '学习强度还可以，建议增加到每天20题以上';
  if (avgDaily < 50) return '学习强度很好，继续保持';
  return '学习强度很高，注意合理安排休息';
}

function getConsistencyLevel(consistency) {
  if (consistency >= 85) return 'excellent';
  if (consistency >= 70) return 'good';
  if (consistency >= 50) return 'fair';
  return 'poor';
}

function getConsistencyRecommendation(consistency, consecutiveDays) {
  if (consistency < 50) return '建议建立每日学习习惯，提高学习一致性';
  if (consecutiveDays < 3) return `当前连续学习${consecutiveDays}天，建议保持连续学习`;
  return `已连续学习${consecutiveDays}天，继续保持`;
}

function getStreakLevel(streak) {
  if (streak >= 30) return 'excellent';
  if (streak >= 14) return 'good';
  if (streak >= 7) return 'fair';
  return 'poor';
}

function getStreakRecommendation(streak) {
  if (streak === 0) return '开始每日打卡，建立学习习惯';
  if (streak < 7) return `已连续打卡${streak}天，继续坚持`;
  if (streak < 30) return `已连续打卡${streak}天，很棒！继续保持`;
  return `已连续打卡${streak}天，非常优秀！`;
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

