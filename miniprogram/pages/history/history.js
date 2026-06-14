const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const authHelper = require('../../utils/auth-helper.js');
const homeApi = require('../../utils/home-api.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    items: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    const userId = authHelper.getUserId();
    apiExt.listQuizSessions({ userId, status: 'finished' })
      .then((list) => {
        const items = (list || []).slice(0, 30).map((s) => {
          const total = s.total || s.totalQuestions || 0;
          const correct = s.correct != null ? s.correct : s.totalCorrect;
          const acc = total > 0 && correct != null ? Math.round((correct * 100) / total) : null;
          return {
            id: s.id || s._id,
            accText: acc != null ? `${acc}%` : '—',
            scoreText: correct != null && total ? `${correct}/${total}` : '—',
            timeText: homeApi.formatTimeAgo(s.finishedAt || s.createdAt),
          };
        });
        this.setData({ loading: false, items });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
      });
  },

  openSession(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/quiz/session/session?id=${id}&review=1` });
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
