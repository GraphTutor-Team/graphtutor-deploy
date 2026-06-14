const { ICON } = require('../../utils/icons.js');

const api = require('../../utils/api.js');
const authHelper = require('../../utils/auth-helper.js');
const config = require('../../utils/config.js');
const homeApi = require('../../utils/home-api.js');
const backendStatus = require('../../utils/backend-status.js');
const { HOME_IMAGE_SET } = require('../../utils/image-library.js');

const roleMap = { student: '学生', question_manager: '出题负责人', admin: '管理员', user: '用户' };

function getFirstChar(name) {
  const s = String(name || '').trim();
  return s ? s.charAt(0) : '用';
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    userDisplayName: '同学',
    roleText: '学生',
    userFirstChar: '用',
    heroImage: HOME_IMAGE_SET.hero.imageUrl,
    heroImageFallback: HOME_IMAGE_SET.hero.fallback,

    navFeatures: [
      { id: 'practice', title: '练习', desc: '选择题库开始刷题', img: ICON.practice, type: 'switchTab', url: '/pages/practice/practice' },
      { id: 'plan', title: '学习计划', desc: '今日任务与复习安排', img: ICON.plan, type: 'switchTab', url: '/pages/plan/plan' },
      { id: 'graph', title: '知识图谱', desc: '图结构路径规划练习', img: ICON.graph, type: 'navigateTo', url: '/pages/graph/graph' },
      { id: 'wrong', title: '错题本', desc: '巩固薄弱知识点', img: ICON.wrong, type: 'switchTab', url: '/pages/wrong/wrong' },
    ],

    homeLoading: false,
    homeConnected: false,
    hasFeedContent: false,
    notifications: [],
    recommendations: [],
    todayReviewCount: 0,
    efficiencyScore: null,
    efficiencyScoreDisplay: '—',

    backendReady: false,
    backendStatusText: '正在检测后端…',
  },

  onShow() {
    if (!authHelper.ensureProfileComplete()) return;
    this.checkBackend().then(() => this.bootstrapSession());
  },

  checkBackend() {
    if (config.USE_VIRTUAL_LOGIN) {
      this.setData({
        backendReady: false,
        backendStatusText: '虚拟登录模式，未连接后端',
      });
      return Promise.resolve();
    }
    return backendStatus.refreshBackendStatus().then((status) => {
      this.setData({
        backendReady: !!status.ok,
        backendStatusText: status.message || (status.ok ? '后端已连接' : '无法连接后端'),
      });
    });
  },

  setGuestState() {
    this.setData({
      isLoggedIn: false,
      userInfo: null,
      userDisplayName: '同学',
      homeConnected: false,
      hasFeedContent: false,
      homeLoading: false,
      notifications: [],
      recommendations: [],
      todayReviewCount: 0,
      efficiencyScoreDisplay: '—',
    });
  },

  applyLoggedIn(u) {
    const name = u.name || u.email || '用';
    this.setData({
      isLoggedIn: true,
      userInfo: u,
      userDisplayName: name,
      roleText: roleMap[u.role] || u.role || '学生',
      userFirstChar: getFirstChar(name),
    });
    this.loadHomeData();
  },

  handleSessionExpired(message) {
    authHelper.clearSession();
    this.setGuestState();
    if (message) {
      wx.showToast({ title: message, icon: 'none', duration: 2200 });
    }
  },

  bootstrapSession() {
    const token = wx.getStorageSync('token');

    if (!token || (api.isVirtualToken() && !config.USE_VIRTUAL_LOGIN)) {
      if (token && api.isVirtualToken()) authHelper.clearSession();
      this.setGuestState();
      return;
    }

    if (config.USE_VIRTUAL_LOGIN && api.isVirtualToken()) {
      const userInfo = wx.getStorageSync('userInfo') || {};
      this.applyLoggedIn(userInfo);
      return;
    }

    if (!this.data.backendReady && !config.USE_VIRTUAL_LOGIN) {
      this.setData({
        isLoggedIn: false,
        homeConnected: false,
      });
      return;
    }

    api.ensureValidAccessToken()
      .then(() => api.getMe())
      .then((res) => {
        const u = res && res.user ? res.user : {};
        if (!u || Object.keys(u).length === 0) throw new Error('empty');
        const app = getApp();
        app.globalData.userInfo = u;
        wx.setStorageSync('userInfo', u);
        if (!authHelper.ensureProfileComplete()) return;
        this.applyLoggedIn(u);
      })
      .catch((err) => {
        const msg = (err && err.message) || '';
        if (msg.indexOf('登录') >= 0 || msg.indexOf('过期') >= 0 || msg === 'empty') {
          this.handleSessionExpired('登录已过期，请重新登录');
          return;
        }
        this.setGuestState();
      });
  },

  loadHomeData() {
    if (config.USE_VIRTUAL_LOGIN || !this.data.isLoggedIn) return;
    this.setData({ homeLoading: true });
    homeApi.fetchDashboard().then((data) => {
      const notifications = data.notifications || [];
      const recommendations = data.recommendations || [];
      this.setData({
        homeLoading: false,
        homeConnected: true,
        notifications,
        recommendations,
        hasFeedContent: notifications.length > 0 || recommendations.length > 0,
        todayReviewCount: data.todayReviewCount || 0,
        efficiencyScore: data.efficiencyScore,
        efficiencyScoreDisplay: data.efficiencyScore == null ? '—' : String(data.efficiencyScore),
      });
    }).catch((err) => {
      const msg = (err && err.message) || '';
      if (msg.indexOf('登录') >= 0 || msg.indexOf('过期') >= 0) {
        this.handleSessionExpired('登录已过期，请重新登录');
        return;
      }
      this.setData({ homeLoading: false, homeConnected: false, hasFeedContent: false });
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goMy() {
    wx.switchTab({ url: '/pages/user/user' });
  },

  goPractice() {
    wx.switchTab({ url: '/pages/practice/practice' });
  },

  featureNav(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.navFeatures || []).find((x) => x.id === id);
    if (!item || !item.url) return;
    if (item.type === 'switchTab') {
      wx.switchTab({ url: item.url });
      return;
    }
    wx.navigateTo({ url: item.url });
  },

  onHeroImageError() {
    this.setData({ heroImage: this.data.heroImageFallback || ICON.practice });
  },
});
