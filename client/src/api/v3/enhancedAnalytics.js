/**
 * GraphTutor V3.0 - 增强学习分析API客户端
 */

import api from '../api.js';

/**
 * 获取学习效率分析
 */
export async function getStudyEfficiency(days = 30) {
  const response = await api.get('/v3/enhanced-analytics/efficiency', {
    params: { days },
  });
  return response.data;
}

/**
 * 获取学习习惯分析
 */
export async function getStudyHabits(days = 30) {
  const response = await api.get('/v3/enhanced-analytics/habits', {
    params: { days },
  });
  return response.data;
}

/**
 * 获取AI学习建议
 */
export async function getAILearningSuggestions(days = 30) {
  const response = await api.get('/v3/enhanced-analytics/suggestions', {
    params: { days },
  });
  return response.data;
}

/**
 * 获取综合分析（效率+习惯+建议）
 */
export async function getComprehensiveAnalysis(days = 30) {
  const response = await api.get('/v3/enhanced-analytics/comprehensive', {
    params: { days },
  });
  return response.data;
}

/**
 * 遗忘曲线预警：建议今日复习的知识点及 7 天后遗忘概率
 * @param {number} limit - 最多返回条数，默认 20
 */
export async function getForgettingCurve(limit = 20) {
  const response = await api.get('/v3/enhanced-analytics/forgetting-curve', {
    params: { limit },
  });
  return response.data;
}

/**
 * 学习效率分析（时段·题型）：按时间段、题型统计正确率与耗时，最佳学习时段/题型
 * @param {number} days - 统计天数，默认 30
 */
export async function getStudyEfficiencyByTimeAndType(days = 30) {
  const response = await api.get('/v3/enhanced-analytics/efficiency-by-time-type', {
    params: { days },
  });
  return response.data;
}

/**
 * 知识图谱节点热力数据：掌握度、错题数、练习数（Phase 2.4）
 * @param {number} days - 统计天数，默认 90
 */
export async function getGraphHeatmap(days = 90) {
  const response = await api.get('/v3/enhanced-analytics/graph-heatmap', {
    params: { days },
  });
  return response.data;
}

/**
 * 学科技能树：按学科返回知识点列表及点亮状态（正确率≥70% 且 答题≥3 即点亮）
 * @param {string} subjectCode - 学科代码（必填）
 * @param {number} days - 统计天数，默认 90
 */
export async function getSkillTree(subjectCode, days = 90) {
  const response = await api.get('/v3/enhanced-analytics/skill-tree', {
    params: { subjectCode, days },
  });
  return response.data;
}

/**
 * 对比报告：与同校/同年级用户的学习数据对比
 * @param {string} groupBy - school | grade
 * @param {number} days - 统计天数，默认 90
 */
export async function getCompareReport(groupBy = 'grade', days = 90) {
  const response = await api.get('/v3/enhanced-analytics/compare-report', {
    params: { groupBy, days },
  });
  return response.data;
}

/**
 * 升学报告：考研/考公/留学竞争力与差距诊断
 * @param {string} target - 考研 | 考公 | 留学
 * @param {number} days - 统计天数，默认 90
 */
export async function getAdvancementReport(target = '考研', days = 90) {
  const response = await api.get('/v3/enhanced-analytics/advancement-report', {
    params: { target, days },
  });
  return response.data;
}

/**
 * 路径推荐（Phase 2.5）：推荐下一步学习的知识点
 * @param {number} days - 统计天数，默认 90
 * @param {number} limit - 推荐条数，默认 5
 */
export async function getPathRecommendations(days = 90, limit = 5) {
  const response = await api.get('/v3/enhanced-analytics/path-recommendations', {
    params: { days, limit },
  });
  return response.data;
}

/**
 * 考前预测（Phase 2.6）：基于错题与掌握度生成高风险知识点与预测卷计划
 * @param {number} days - 统计天数，默认 30
 * @param {number} totalQuestions - 预测卷题量，默认 20
 */
export async function getExamPrediction(days = 30, totalQuestions = 20) {
  const response = await api.get('/v3/enhanced-analytics/exam-prediction', {
    params: { days, totalQuestions },
  });
  return response.data;
}
