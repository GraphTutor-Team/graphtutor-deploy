const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
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
  },

  onShow() {
    pageSession.loadAuthenticatedPage(this, () => pageApi.fetchPlanSummary(), (page, data) => {
      page.setData({
        todayReviewCount: data.todayReviewCount || 0,
        checkInDaysDisplay: data.checkInDays == null ? '—' : String(data.checkInDays),
        currentStreakDisplay: data.currentStreak == null ? '—' : String(data.currentStreak),
        weekQuestionsDisplay: data.weekQuestions == null ? '—' : String(data.weekQuestions),
        activePlans: data.activePlans || [],
      });
    });
  },

  reload() {
    this.onShow();
  },

  reload() {
    this.onShow();
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
