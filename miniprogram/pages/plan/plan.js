const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
const quizLaunch = require('../../utils/quiz-launch.js');
const apiExt = require('../../utils/api-ext.js');
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
      this.onShow();
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '打卡失败', icon: 'none' });
    }).finally(() => {
      this.setData({ checkingIn: false });
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
