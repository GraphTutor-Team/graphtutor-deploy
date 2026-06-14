const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
const { ICON } = require('../../utils/icons.js');
const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    icons: ICON,
    bannerImage: PAGE_BANNER_SET.practice.imageUrl,
    bannerFallback: PAGE_BANNER_SET.practice.fallback,
    bannerTitle: PAGE_BANNER_SET.practice.title,
    bannerSubTitle: PAGE_BANNER_SET.practice.subTitle,

    isLoggedIn: false,
    loading: false,
    connected: false,
    todayReviewCount: 0,
    efficiencyScoreDisplay: '—',
    accuracyText: '—',
    studyDaysDisplay: '—',
    recommendations: [],
  },

  onShow() {
    pageSession.loadAuthenticatedPage(this, () => pageApi.fetchPracticeSummary(), (page, data) => {
      page.setData({
        todayReviewCount: data.todayReviewCount || 0,
        efficiencyScoreDisplay: data.efficiencyScore == null ? '—' : String(data.efficiencyScore),
        accuracyText: data.accuracyText || '—',
        studyDaysDisplay: data.studyDays == null ? '—' : String(data.studyDays),
        recommendations: data.recommendations || [],
      });
    });
  },

  reload() {
    this.onShow();
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goGraph() {
    wx.navigateTo({ url: '/pages/graph/graph' });
  },

  goWrong() {
    wx.switchTab({ url: '/pages/wrong/wrong' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
