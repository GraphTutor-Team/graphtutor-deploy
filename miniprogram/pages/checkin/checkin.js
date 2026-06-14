const api = require('../../utils/api.js');
const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const authHelper = require('../../utils/auth-helper.js');
const homeApi = require('../../utils/home-api.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    activePlanId: '',
    activePlanName: '',
    checkingIn: false,
    records: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    Promise.all([
      api.getStudyPlans({ status: 'active', limit: 5 }),
      apiExt.getAllCheckIns({ limit: 20 }),
    ]).then(([plansRes, checkRes]) => {
      const plans = (plansRes && plansRes.items) || [];
      const first = plans[0];
      const items = (checkRes && checkRes.items) || [];
      const records = items.map((r) => ({
        id: r._id || r.id,
        dateText: r.date ? homeApi.formatTimeAgo(r.date) : '',
        planName: (r.planId && r.planId.title) || (r.planId && r.planId.name) || '学习计划',
        questions: r.completedQuestions != null ? r.completedQuestions : 0,
      }));
      this.setData({
        loading: false,
        activePlanId: first ? (first._id || first.id) : '',
        activePlanName: first ? (first.name || first.title || '学习计划') : '',
        records,
      });
    }).catch((err) => {
      this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
    });
  },

  doCheckIn() {
    const { activePlanId, checkingIn } = this.data;
    if (checkingIn) return;
    if (!activePlanId) {
      wx.showToast({ title: '请先在 Web 端创建学习计划', icon: 'none' });
      return;
    }
    this.setData({ checkingIn: true });
    apiExt.checkInStudyPlan(activePlanId, {
      completedQuestions: 0,
      correctQuestions: 0,
      mood: 'normal',
      summary: '小程序打卡',
    }).then(() => {
      wx.showToast({ title: '打卡成功', icon: 'success' });
      this.loadData();
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '打卡失败', icon: 'none' });
    }).finally(() => {
      this.setData({ checkingIn: false });
    });
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
