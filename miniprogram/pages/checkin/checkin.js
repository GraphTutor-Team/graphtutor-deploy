const api = require('../../utils/api.js');
const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const homeApi = require('../../utils/home-api.js');
Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    activePlanId: '',
    activePlanName: '',
    checkingIn: false,
    creatingPlan: false,
    records: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    return Promise.all([
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
    const { activePlanId, checkingIn, creatingPlan } = this.data;
    if (checkingIn || creatingPlan) return;
    if (!activePlanId) {
      this.createDefaultPlan().then(() => this.doCheckIn());
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

  createDefaultPlan() {
    if (this.data.creatingPlan) return Promise.resolve();
    this.setData({ creatingPlan: true });
    wx.showLoading({ title: '创建计划…', mask: true });
    return api.createStudyPlan(apiExt.defaultStudyPlanPayload())
      .then((plan) => {
        const planId = plan && (plan._id || plan.id);
        if (planId) {
          this.setData({
            activePlanId: planId,
            activePlanName: (plan && plan.name) || '每日学习',
          });
        }
        wx.showToast({ title: '已创建学习计划', icon: 'success' });
        return this.loadData();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '创建计划失败', icon: 'none' });
        throw err;
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ creatingPlan: false });
      });
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
