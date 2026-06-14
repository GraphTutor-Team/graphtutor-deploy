/**
 * 计划 / 错题 / 图谱页数据
 */
const api = require('./api.js');
const { stripHtml } = require('./home-api.js');

function shortText(text, max) {
  const s = stripHtml(text || '');
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function fetchPlanSummary() {
  return api.ensureValidAccessToken().then(() => Promise.allSettled([
    api.getTodayReviewQuestions({ limit: 100 }),
    api.getStudyPlanStats(),
    api.getStudyPlans({ limit: 5, status: 'active' }),
  ])).then(([reviewRes, statsRes, plansRes]) => {
    const todayReviewCount = reviewRes.status === 'fulfilled'
      ? ((reviewRes.value && reviewRes.value.questions) || []).length
      : 0;
    const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
    const plans = plansRes.status === 'fulfilled'
      ? ((plansRes.value && plansRes.value.items) || [])
      : [];

    return {
      connected: reviewRes.status === 'fulfilled' || statsRes.status === 'fulfilled',
      todayReviewCount,
      checkInDays: stats && stats.totalDays != null ? stats.totalDays : null,
      currentStreak: stats && stats.currentStreak != null ? stats.currentStreak : null,
      weekQuestions: stats && stats.totalQuestions != null ? stats.totalQuestions : null,
      activePlans: plans.map((p) => ({
        id: p._id || p.id,
        name: p.name || '学习计划',
        dailyTarget: p.dailyTarget || 0,
        status: p.status || 'active',
      })),
    };
  });
}

function fetchWrongSummary() {
  return api.ensureValidAccessToken().then(() => Promise.allSettled([
    api.getWrongQuestionStats(),
    api.getWrongQuestions({ limit: 5 }),
  ])).then(([statsRes, listRes]) => {
    const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
    const items = listRes.status === 'fulfilled'
      ? ((listRes.value && listRes.value.items) || [])
      : [];

    return {
      connected: statsRes.status === 'fulfilled' || listRes.status === 'fulfilled',
      total: stats && stats.total != null ? stats.total : 0,
      unmastered: stats && stats.unmastered != null ? stats.unmastered : 0,
      learning: stats && stats.learning != null ? stats.learning : 0,
      mastered: stats && stats.mastered != null ? stats.mastered : 0,
      items: items.map((item) => ({
        id: item._id || item.questionId,
        title: shortText(
          (item.question && (item.question.content || item.question.title)) || '错题',
          40
        ),
        errorCount: item.errorCount || 0,
      })),
    };
  });
}

function fetchGraphSummary() {
  return api.ensureValidAccessToken().then(() => Promise.allSettled([
    api.getGraphHeatmap(90),
    api.getPathRecommendations({ limit: 5, days: 90 }),
  ])).then(([heatmapRes, pathRes]) => {
    const nodes = heatmapRes.status === 'fulfilled' ? (heatmapRes.value || []) : [];
    const paths = pathRes.status === 'fulfilled' ? (pathRes.value || []) : [];

    let avgMastery = null;
    if (nodes.length > 0) {
      const sum = nodes.reduce((acc, n) => acc + (Number(n.masteryPercent) || 0), 0);
      avgMastery = Math.round(sum / nodes.length);
    }

    const practicedNodes = nodes.filter((n) => (n.practiceCount || 0) > 0).length;

    return {
      connected: heatmapRes.status === 'fulfilled' || pathRes.status === 'fulfilled',
      nodeCount: nodes.length,
      practicedNodes,
      avgMastery,
      paths: paths.map((p) => ({
        id: p.key || p.name,
        name: p.name || p.key || '知识点',
        reason: p.reason || '建议继续学习',
        accuracy: p.accuracy != null ? p.accuracy : null,
      })),
    };
  });
}

function pct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(Number(value) * 100)}%`;
}

function fetchPracticeSummary() {
  return api.ensureValidAccessToken().then(() => Promise.allSettled([
    api.getComprehensiveAnalysis(7),
    api.getTodayReviewQuestions({ limit: 100 }),
    api.getRecommendedQuestions({ limit: 3, includeReasons: false }),
  ])).then(([analysisRes, reviewRes, recRes]) => {
    const analysis = analysisRes.status === 'fulfilled' ? analysisRes.value : null;
    const efficiency = analysis && analysis.efficiency;
    const metrics = (efficiency && efficiency.metrics) || {};

    const recommendations = recRes.status === 'fulfilled'
      ? (recRes.value || []).map((q) => ({
          id: q._id || q.id,
          title: shortText(q.content || q.title || '', 36) || '推荐题目',
        }))
      : [];

    const todayReviewCount = reviewRes.status === 'fulfilled'
      ? ((reviewRes.value && reviewRes.value.questions) || []).length
      : 0;

    return {
      connected: analysisRes.status === 'fulfilled' || reviewRes.status === 'fulfilled',
      todayReviewCount,
      efficiencyScore: efficiency && efficiency.score != null ? efficiency.score : null,
      accuracyText: pct(metrics.accuracy),
      studyDays: metrics.studyDays != null ? metrics.studyDays : null,
      recommendations,
    };
  });
}

module.exports = {
  fetchPlanSummary,
  fetchWrongSummary,
  fetchGraphSummary,
  fetchPracticeSummary,
};
