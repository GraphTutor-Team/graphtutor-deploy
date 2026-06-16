const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
const quizLaunch = require('../../utils/quiz-launch.js');
const apiExt = require('../../utils/api-ext.js');
const api = require('../../utils/api.js');
const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    bannerImage: PAGE_BANNER_SET.plan.imageUrl,
    bannerFallback: PAGE_BANNER_SET.plan.fallback,
    bannerTitle: PAGE_BANNER_SET.plan.title,
    bannerSubTitle: PAGE_BANNER_SET.plan.subTitle,

    isLoggedIn: false,
    loading: false,
    connected: false,
    todayReviewCount: 0,
    checkInDaysDisplay: '—',
    currentStreakDisplay: '—',
    weekQuestionsDisplay: '—',
    activePlans: [],
    activePlanId: '',
    checkingIn: false,
    creatingPlan: false,
  },

  onShow() {
    pageSession.loadAuthenticatedPage(this, () => pageApi.fetchPlanSummary(), (page, data) => {
      const plans = data.activePlans || [];
      page.setData({
        todayReviewCount: data.todayReviewCount || 0,
        checkInDaysDisplay: data.checkInDays == null ? '—' : String(data.checkInDays),
        currentStreakDisplay: data.currentStreak == null ? '—' : String(data.currentStreak),
        weekQuestionsDisplay: data.weekQuestions == null ? '—' : String(data.weekQuestions),
        activePlans: plans,
        activePlanId: plans[0] ? plans[0].id : '',
      });
    });
  },

  reload() {
    this.onShow();
  },

  startTodayReview() {
    if (!this.data.isLoggedIn) {
      this.goLogin();
      return;
    }
    quizLaunch.launchTodayReview();
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
      this.onShow();
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
        wx.showToast({ title: '已创建学习计划', icon: 'success' });
        if (planId) {
          this.setData({
            activePlanId: planId,
            activePlans: [{
              id: planId,
              name: plan.name || '每日学习',
              dailyTarget: plan.dailyTarget || 10,
            }],
          });
          return null;
        }
        return pageApi.fetchPlanSummary();
      })
      .then((data) => {
        if (!data) return;
        const plans = data.activePlans || [];
        this.setData({
          activePlans: plans,
          activePlanId: plans[0] ? plans[0].id : '',
        });
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

  goCheckInPage() {
    wx.navigateTo({ url: '/pages/checkin/checkin' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
