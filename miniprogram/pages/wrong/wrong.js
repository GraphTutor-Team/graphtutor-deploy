const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    bannerImage: PAGE_BANNER_SET.wrong.imageUrl,
    bannerFallback: PAGE_BANNER_SET.wrong.fallback,
    bannerTitle: PAGE_BANNER_SET.wrong.title,
    bannerSubTitle: PAGE_BANNER_SET.wrong.subTitle,

    isLoggedIn: false,
    loading: false,
    connected: false,
    total: 0,
    unmastered: 0,
    learning: 0,
    mastered: 0,
    items: [],
  },

  onShow() {
    pageSession.loadAuthenticatedPage(this, () => pageApi.fetchWrongSummary(), (page, data) => {
      page.setData({
        total: data.total || 0,
        unmastered: data.unmastered || 0,
        learning: data.learning || 0,
        mastered: data.mastered || 0,
        items: data.items || [],
      });
    });
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
