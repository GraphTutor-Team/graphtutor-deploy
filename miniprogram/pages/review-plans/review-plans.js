const apiExt = require('../../utils/api-ext.js');
const quizLaunch = require('../../utils/quiz-launch.js');
const featurePage = require('../../utils/feature-page.js');

const TYPE_LABELS = { daily: '每日', weekly: '每周', custom: '自定义' };
const STATUS_LABELS = { active: '进行中', paused: '已暂停', completed: '已完成', cancelled: '已取消' };
const STRATEGY_LABELS = {
  all: '全部错题',
  unmastered: '未掌握',
  due: '到期复习',
  random: '随机',
  by_category: '按分类',
};

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    items: [],
    executingId: '',
    creatingPlan: false,
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    apiExt.getReviewPlans()
      .then((list) => {
        const raw = Array.isArray(list) ? list : (list && list.items) || [];
        const items = raw.map((p) => ({
          id: p._id || p.id,
          name: p.name || '复习计划',
          description: p.description || '',
          typeText: TYPE_LABELS[p.type] || p.type || '—',
          statusText: STATUS_LABELS[p.status] || p.status || '—',
          strategyText: STRATEGY_LABELS[p.strategy] || p.strategy || '—',
          dailyCount: p.dailyCount || 10,
          canExecute: p.status === 'active',
        }));
        this.setData({ loading: false, items });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
      });
  },

  executePlan(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || this.data.executingId) return;
    this.setData({ executingId: id });
    quizLaunch.launchReviewPlan(id)
      .finally(() => this.setData({ executingId: '' }));
  },

  createDefaultPlan() {
    if (this.data.creatingPlan) return;
    this.setData({ creatingPlan: true });
    wx.showLoading({ title: '创建中…', mask: true });
    apiExt.createReviewPlan(apiExt.defaultReviewPlanPayload())
      .then(() => {
        wx.showToast({ title: '复习计划已创建', icon: 'success' });
        this.loadData();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '创建失败', icon: 'none' });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ creatingPlan: false });
      });
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
