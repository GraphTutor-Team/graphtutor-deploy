const api = require('../../utils/api.js');
const config = require('../../utils/config.js');
const authHelper = require('../../utils/auth-helper.js');
const backendStatus = require('../../utils/backend-status.js');
const { ICON } = require('../../utils/icons.js');

const roleMap = { student: '学生', question_manager: '出题负责人', admin: '管理员', user: '用户' };

Page({
  data: {
    icons: ICON,
    isLoggedIn: false,
    userInfo: null,
    roleText: '学生',
    userFirstChar: '用',
    needsComplete: false,
    useVirtualLogin: config.USE_VIRTUAL_LOGIN,
    backendReady: false,
    backendStatusText: '尚未检测',
  },

  onShow() {
    if (!authHelper.ensureProfileComplete()) return;
    this.refreshBackendUi();

    const app = getApp();
    const token = app.globalData.token;
    let userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.applyUser(userInfo);
      return;
    }
    if (token) {
      api.getMe().then((res) => {
        if (res && res.success && res.user) {
          userInfo = res.user;
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
          if (!authHelper.ensureProfileComplete()) return;
          this.applyUser(userInfo);
        }
      }).catch(() => {
        this.setData({ isLoggedIn: false, userInfo: null });
      });
    } else {
      this.setData({ isLoggedIn: false, userInfo: null });
    }
  },

  applyUser(userInfo) {
    const name = userInfo.name || userInfo.email || '用';
    this.setData({
      isLoggedIn: true,
      userInfo,
      needsComplete: authHelper.needsProfileCompletion(userInfo),
      roleText: roleMap[userInfo.role] || userInfo.role || '学生',
      userFirstChar: name.charAt(0) || '用',
    });
  },

  refreshBackendUi() {
    backendStatus.refreshBackendStatus().then((status) => {
      this.setData({
        backendReady: !!status.ok,
        backendStatusText: status.message || (status.ok ? '后端已连接' : '无法连接后端'),
      });
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goCompleteAccount() {
    authHelper.goCompleteAccount();
  },

  goGraph() {
    wx.navigateTo({ url: '/pages/graph/graph' });
  },

  goShop() {
    wx.navigateTo({ url: '/pages/shop/shop' });
  },

  checkBackend() {
    if (config.USE_VIRTUAL_LOGIN) {
      wx.showToast({ title: '当前为虚拟登录', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '检测中', mask: true });
    backendStatus.refreshBackendStatus().then((status) => {
      wx.hideLoading();
      this.setData({
        backendReady: !!status.ok,
        backendStatusText: status.message,
      });
      wx.showToast({
        title: status.ok ? '后端可访问' : (status.message || '无法连接'),
        icon: status.ok ? 'success' : 'none',
      });
    });
  },

  logout() {
    authHelper.clearSession();
    this.setData({ isLoggedIn: false, userInfo: null, needsComplete: false });
    wx.showToast({ title: '已退出', icon: 'none' });
  },
});
