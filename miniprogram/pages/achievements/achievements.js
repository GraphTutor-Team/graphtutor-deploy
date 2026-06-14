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
      apiExt.getAchievementStats().catch(() => null),
      apiExt.getAchievements().catch(() => []),
    ]).then(([stats, list]) => {
      const items = (list || []).map((a) => ({
        id: a._id || a.id || a.key,
        name: a.name || a.title || '成就',
        desc: a.description || a.desc || '',
        unlocked: !!(a.unlocked || a.isUnlocked),
        progress: a.progress != null ? Math.round(a.progress * 100) : (a.unlocked ? 100 : 0),
        icon: a.icon || '🏅',
      }));
      this.setData({
        loading: false,
        stats,
        items,
      });
    }).catch((err) => {
      this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
    });
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
