const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
const apiExt = require('../../utils/api-ext.js');
const quizLaunch = require('../../utils/quiz-launch.js');
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
    reviewAlertCount: 0,
  },

  onShow() {
    pageSession.loadAuthenticatedPage(this, () => this.fetchAll(), (page, data) => {
      page.setData({
        nodeCount: data.nodeCount || 0,
        practicedNodes: data.practicedNodes || 0,
        avgMasteryDisplay: data.avgMastery == null ? '—' : `${data.avgMastery}%`,
        paths: data.paths || [],
        reviewAlertCount: data.reviewAlertCount || 0,
      });
    });
  },

  fetchAll() {
    return pageApi.fetchGraphSummary().then((graph) => {
      return apiExt.getForgettingCurve(20).then((curve) => {
        const alerts = Array.isArray(curve) ? curve : (curve && curve.items) || [];
        return Object.assign({}, graph, { reviewAlertCount: alerts.length });
      }).catch(() => graph);
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

  startPathPractice(e) {
    if (!this.data.isLoggedIn) {
      this.goLogin();
      return;
    }
    const key = e.currentTarget.dataset.key;
    quizLaunch.launchPathPractice(key, 10);
  },
});
