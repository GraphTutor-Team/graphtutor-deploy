const api = require('../../utils/api.js');
const featurePage = require('../../utils/feature-page.js');

const DAY_OPTIONS = [7, 30];

function pct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n <= 1) return `${Math.round(n * 100)}%`;
  return `${Math.round(n)}%`;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return dateStr;
}

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    dayIndex: 0,
    dayLabels: ['近 7 日', '近 30 日'],
    accuracyText: '—',
    totalQuestions: '—',
    studyDays: '—',
    efficiencyScore: '—',
    trendRows: [],
    habitSummary: '',
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  onDayChange(e) {
    this.setData({ dayIndex: Number(e.detail.value) || 0 });
    this.loadData();
  },

  loadData() {
    const days = DAY_OPTIONS[this.data.dayIndex] || 7;
    this.setData({ loading: true, loadError: '' });
    Promise.all([
      api.getComprehensiveAnalysis(days),
      api.getLearningTrend(days),
    ]).then(([analysis, trend]) => {
      const efficiency = analysis && analysis.efficiency;
      const metrics = (efficiency && efficiency.metrics) || {};
      const habits = analysis && analysis.habits;
      const trendList = Array.isArray(trend) ? trend : [];
      const maxTotal = Math.max(...trendList.map((d) => d.total || 0), 1);
      const trendRows = trendList.slice(-14).map((d) => ({
        date: formatDateLabel(d.date),
        total: d.total || 0,
        accuracy: d.total > 0 ? Math.round(d.accuracy || 0) : null,
        barWidth: Math.max(8, Math.round(((d.total || 0) / maxTotal) * 100)),
      }));
      let habitSummary = '';
      if (habits && habits.bestTimeSlot) {
        habitSummary = `最佳学习时段：${habits.bestTimeSlot}`;
      } else if (habits && habits.summary) {
        habitSummary = habits.summary;
      }
      this.setData({
        loading: false,
        accuracyText: pct(metrics.accuracy),
        totalQuestions: metrics.totalQuestions != null ? String(metrics.totalQuestions) : '—',
        studyDays: metrics.studyDays != null ? String(metrics.studyDays) : '—',
        efficiencyScore: efficiency && efficiency.score != null ? String(efficiency.score) : '—',
        trendRows,
        habitSummary,
      });
    }).catch((err) => {
      this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
    });
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
