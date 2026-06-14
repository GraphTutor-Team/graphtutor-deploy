const pageApi = require('../../utils/page-api.js');
const pageSession = require('../../utils/page-session.js');
const api = require('../../utils/api.js');
const apiExt = require('../../utils/api-ext.js');
const config = require('../../utils/config.js');
const authHelper = require('../../utils/auth-helper.js');
const quizLaunch = require('../../utils/quiz-launch.js');
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
    ongoingSessionId: '',
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
    this.loadOngoingSession();
  },

  loadOngoingSession() {
    const token = wx.getStorageSync('token');
    if (!token || config.USE_VIRTUAL_LOGIN || api.isVirtualToken()) {
      this.setData({ ongoingSessionId: '' });
      return;
    }
    const userId = authHelper.getUserId();
    if (!userId) return;
    apiExt.listQuizSessions({ userId, status: 'ongoing' })
      .then((list) => {
        const sessions = Array.isArray(list) ? list : [];
        const first = sessions[0];
        const id = first && (first.id || first._id);
        this.setData({ ongoingSessionId: id ? String(id) : '' });
      })
      .catch(() => this.setData({ ongoingSessionId: '' }));
  },

  resumeOngoing() {
    const id = this.data.ongoingSessionId;
    if (!id) return;
    wx.navigateTo({ url: `/pages/quiz/session/session?id=${id}` });
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

  goQuizSetup() {
    const token = wx.getStorageSync('token');
    if (!token || config.USE_VIRTUAL_LOGIN || api.isVirtualToken()) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/quiz/setup/setup' });
  },

  startTodayReview() {
    if (!this.data.isLoggedIn) {
      this.goLogin();
      return;
    }
    quizLaunch.launchTodayReview();
  },

  startRecommendedPractice() {
    if (!this.data.isLoggedIn) {
      this.goLogin();
      return;
    }
    quizLaunch.launchRecommendedPractice(10);
  },

  startWrongPractice() {
    if (!this.data.isLoggedIn) {
      this.goLogin();
      return;
    }
    quizLaunch.launchWrongPractice({ limit: 20, masteryStatus: 'unmastered' });
  },

  startSingleRecommend(e) {
    if (!this.data.isLoggedIn) {
      this.goLogin();
      return;
    }
    const questionId = e.currentTarget.dataset.qid;
    quizLaunch.launchSingleQuestion(questionId);
  },

  startDailyChallenge() {
    if (!this.data.isLoggedIn) {
      this.goLogin();
      return;
    }
    quizLaunch.launchDailyChallenge();
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goExam() {
    wx.navigateTo({ url: '/pages/exam/setup/setup' });
  },

  onBannerError() {
    this.setData({ bannerImage: this.data.bannerFallback });
  },
});
