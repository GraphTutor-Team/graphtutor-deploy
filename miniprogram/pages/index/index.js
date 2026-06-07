/**
 * 图标资源目录
 * 你当前的 `miniprogram/images/` 下已不再有 iconfont 解压目录，因此改用现有的 `icon_ebd74bn8zis` PNG 资源。
 */
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

    quickActions: [
      { id: 'practice', title: '开始练习', desc: '进入练习入口', type: 'switchTab', url: '/pages/practice/practice' },
      { id: 'wrong', title: '错题巩固', desc: '复习薄弱点', type: 'navigateTo', url: '/pages/wrong/wrong' },
      { id: 'plan', title: '学习计划', desc: '查看今日任务', type: 'switchTab', url: '/pages/plan/plan' },
      { id: 'graph', title: '知识图谱', desc: '图谱练习', type: 'navigateTo', url: '/pages/graph/graph' },
      { id: 'contacts', title: '通讯录', desc: '好友与社区', type: 'navigateTo', url: '/pages/contacts/contacts' },
      { id: 'shop', title: '简易商城', desc: '课程与题单', type: 'navigateTo', url: '/pages/shop/shop' },
    ],

    homePending: {
      overview: '登录后从后端拉取学习概览',
      notifications: '登录后从后端拉取系统通知',
      recommendations: '登录后从后端拉取智能推荐',
      dailyChallenge: '今日挑战待接入后端',
    },
    homeLoading: false,
    homeConnected: false,
    notifications: [],
    recommendations: [],
    todayReviewCount: 0,
    efficiencyScore: null,
    efficiencyScoreDisplay: '—',

    menuItems: [
      { id: 'practice', name: '练习入口', desc: '知识图谱/错题巩固', icon: '', img: `${ICON_DIR}/guanxitu.png`, type: 'switchTab', url: '/pages/practice/practice' },
      { id: 'plan', name: '学习计划', desc: '今日任务与提醒', icon: '', img: `${ICON_DIR}/rilizuobiaoxi.png`, type: 'switchTab', url: '/pages/plan/plan' },
      { id: 'graph', name: '知识图谱练习', desc: '图结构路径规划', icon: '', img: `${ICON_DIR}/lujingtu.png`, type: 'navigateTo', url: '/pages/graph/graph' },
      { id: 'wrong', name: '错题巩固', desc: '薄弱点专项练习', icon: '', img: `${ICON_DIR}/shuzi.png`, type: 'navigateTo', url: '/pages/wrong/wrong' },
      { id: 'me', name: '个人中心', desc: '查看资料与设置', icon: '', img: `${ICON_DIR}/zhifangtu.png`, type: 'switchTab', url: '/pages/user/user' },
      { id: 'login', name: '登录', desc: '头像昵称登录', icon: '', img: `${ICON_DIR}/wenben.png`, type: 'navigateTo', url: '/pages/login/login' },
      { id: 'shop', name: '简易商城', desc: '课程包与题单雏形', icon: '', img: `${ICON_DIR}/shijianrelitu.png`, type: 'navigateTo', url: '/pages/shop/shop' },
      { id: 'tip2', name: '番茄学习法', desc: '25/5 提升专注', icon: '', img: `${ICON_DIR}/zhouqizhou.png`, type: 'none', url: '' },
      { id: 'contacts', name: '通讯录', desc: '好友与社区入口（暂定）', icon: '', img: `${ICON_DIR}/haoyou.png`, type: 'navigateTo', url: '/pages/contacts/contacts' },
    ],
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
          });
        });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        userDisplayName: '同学',
        homeConnected: false,
      });
    }
  },

  loadHomeData() {
    if (config.USE_VIRTUAL_LOGIN || !this.data.isLoggedIn) return;
    this.setData({ homeLoading: true });
    homeApi.fetchDashboard().then((data) => {
      this.setData({
        homeLoading: false,
        homeConnected: true,
        notifications: data.notifications || [],
        recommendations: data.recommendations || [],
        todayReviewCount: data.todayReviewCount || 0,
        efficiencyScore: data.efficiencyScore,
        efficiencyScoreDisplay: data.efficiencyScore == null ? '—' : String(data.efficiencyScore),
      });
    }).catch(() => {
      this.setData({ homeLoading: false, homeConnected: false });
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

  quickNav(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.quickActions || []).find((x) => x.id === id);
    if (!item || !item.url) return;
    if (item.type === 'switchTab') {
      wx.switchTab({ url: item.url });
      return;
    }
    wx.navigateTo({ url: item.url });
  },

  waitBackend(e) {
    const key = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key) || '';
    const map = this.data.homePending || {};
    wx.showToast({ title: map[key] || '待接入后端', icon: 'none', duration: 2500 });
  },

  nav(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.menuItems || []).find((x) => x.id === id);
    if (!item || !item.url || item.type === 'none') return;

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
