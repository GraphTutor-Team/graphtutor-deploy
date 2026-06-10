const ICON_DIR = '/images/icon_ebd74bn8zis';

const api = require('../../utils/api.js');
const authHelper = require('../../utils/auth-helper.js');
const config = require('../../utils/config.js');
const homeApi = require('../../utils/home-api.js');
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
      { id: 'practice', title: '练习', desc: '选择题库开始刷题', img: `${ICON_DIR}/guanxitu.png`, type: 'switchTab', url: '/pages/practice/practice' },
      { id: 'plan', title: '学习计划', desc: '今日任务与复习安排', img: `${ICON_DIR}/rilizuobiaoxi.png`, type: 'switchTab', url: '/pages/plan/plan' },
      { id: 'graph', title: '知识图谱', desc: '图结构路径规划练习', img: `${ICON_DIR}/lujingtu.png`, type: 'navigateTo', url: '/pages/graph/graph' },
      { id: 'wrong', title: '错题本', desc: '巩固薄弱知识点', img: `${ICON_DIR}/shuzi.png`, type: 'navigateTo', url: '/pages/wrong/wrong' },
    ],

    homeLoading: false,
    homeConnected: false,
    hasFeedContent: false,
    notifications: [],
    recommendations: [],
    todayReviewCount: 0,
    efficiencyScore: null,
    efficiencyScoreDisplay: '—',
  },

  onShow() {
    if (!authHelper.ensureProfileComplete()) return;

    const app = getApp();
    const token = app.globalData.token || wx.getStorageSync('token');
    let userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');

    const applyLoggedIn = (u) => {
      const name = u.name || u.email || '用';
      this.setData({
        isLoggedIn: true,
        userInfo: u,
        userDisplayName: name,
        roleText: roleMap[u.role] || u.role || '学生',
        userFirstChar: getFirstChar(name),
      });
      this.loadHomeData();
    };

    if (token && userInfo) {
      applyLoggedIn(userInfo);
      return;
    }

    if (token) {
      api
        .getMe()
        .then((res) => {
          const u = res && res.user ? res.user : {};
          if (!u || Object.keys(u).length === 0) throw new Error('empty');
          app.globalData.userInfo = u;
          wx.setStorageSync('userInfo', u);
          if (!authHelper.ensureProfileComplete()) return;
          applyLoggedIn(u);
        })
        .catch(() => {
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            userDisplayName: '同学',
            homeConnected: false,
            hasFeedContent: false,
          });
        });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        userDisplayName: '同学',
        homeConnected: false,
        hasFeedContent: false,
      });
    }
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
    }).catch(() => {
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
    this.setData({ heroImage: this.data.heroImageFallback || `${ICON_DIR}/guanxitu.png` });
  },
});
