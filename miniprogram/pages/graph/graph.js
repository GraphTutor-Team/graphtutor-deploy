const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

Page({
  data: {
    bannerImage: PAGE_BANNER_SET.graph.imageUrl,
    bannerFallback: PAGE_BANNER_SET.graph.fallback,
    bannerTitle: PAGE_BANNER_SET.graph.title,
    bannerSubTitle: PAGE_BANNER_SET.graph.subTitle,

    isLoggedIn: false,
    loading: false,
    connected: false,
    nodeCount: 0,
    practicedNodes: 0,
    avgMasteryDisplay: '—',
    paths: [],
  },

  onShow() {
    pageSession.loadAuthenticatedPage(this, () => pageApi.fetchGraphSummary(), (page, data) => {
      page.setData({
        nodeCount: data.nodeCount || 0,
        practicedNodes: data.practicedNodes || 0,
        avgMasteryDisplay: data.avgMastery == null ? '—' : `${data.avgMastery}%`,
        paths: data.paths || [],
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
