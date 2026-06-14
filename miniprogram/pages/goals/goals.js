const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    stats: null,
    items: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    Promise.all([
      apiExt.getLearningGoalStats().catch(() => null),
      apiExt.getLearningGoals().catch(() => []),
    ]).then(([stats, list]) => {
      const raw = Array.isArray(list) ? list : (list && list.items) || [];
      const items = raw.map((g) => {
        const progress = g.progress != null ? Math.round(Number(g.progress) * 100) : (
          g.currentValue != null && g.targetValue ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0
        );
        return {
          id: g._id || g.id,
          title: g.title || g.name || '学习目标',
          status: g.status || 'active',
          progress,
          target: g.targetValue != null ? g.targetValue : '',
          current: g.currentValue != null ? g.currentValue : '',
        };
      });
      this.setData({ loading: false, stats, items });
    }).catch((err) => {
      this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
    });
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
