/**
 * 首页数据（对接主项目 v3 API）
 */
const api = require('./api.js');

function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, '').trim();
}

function formatTimeAgo(dateString) {
  if (!dateString) return '刚刚';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  const d = new Date(dateString);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function fetchDashboard() {
  return Promise.allSettled([
    api.getNotifications({ page: 1, limit: 5 }),
    api.getRecommendedQuestions({ limit: 3, includeReasons: false }),
    api.getTodayReviewQuestions({ limit: 100 }),
    api.getComprehensiveAnalysis(7),
  ]).then(([notifRes, recRes, reviewRes, analysisRes]) => {
    const notifications = notifRes.status === 'fulfilled'
      ? (notifRes.value.items || []).map((n) => ({
          id: n._id || n.id,
          title: n.title || n.message || '系统通知',
          content: stripHtml(n.content || n.message || ''),
          timeText: formatTimeAgo(n.createdAt),
        }))
      : [];

    const recommendations = recRes.status === 'fulfilled'
      ? (recRes.value || []).map((q) => {
          const raw = stripHtml(q.content || q.title || '');
          return {
            id: q._id || q.id,
            title: raw.length > 40 ? `${raw.slice(0, 40)}…` : (raw || '推荐题目'),
          };
        })
      : [];

    const todayReviewCount = reviewRes.status === 'fulfilled'
      ? ((reviewRes.value && reviewRes.value.questions) || []).length
      : 0;

    const efficiencyScore = analysisRes.status === 'fulfilled'
      ? (analysisRes.value && analysisRes.value.efficiency && analysisRes.value.efficiency.score)
      : null;

    return {
      notifications,
      recommendations,
      todayReviewCount,
      efficiencyScore: efficiencyScore == null ? null : efficiencyScore,
    };
  });
}

module.exports = {
  fetchDashboard,
  formatTimeAgo,
};
