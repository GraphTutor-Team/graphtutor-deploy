const api = require('../../utils/api.js');
const config = require('../../utils/config.js');
const authHelper = require('../../utils/auth-helper.js');

const roleMap = { student: '学生', question_manager: '出题负责人', admin: '管理员', user: '用户' };

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    roleText: '学生',
    userFirstChar: '用',
    needsComplete: false,
    useVirtualLogin: config.USE_VIRTUAL_LOGIN,
    baseUrlDisplay: config.BASE_URL,
  },

  onShow() {
    if (!authHelper.ensureProfileComplete()) return;

    const app = getApp();
    const token = app.globalData.token;
    let userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (token && userInfo) {
      const name = userInfo.name || userInfo.email || '用';
      this.setData({
        isLoggedIn: true,
        userInfo,
        needsComplete: authHelper.needsProfileCompletion(userInfo),
        roleText: roleMap[userInfo.role] || userInfo.role || '学生',
        userFirstChar: name.charAt(0) || '用',
      });
      return;
    }
    if (token) {
      api.getMe().then(res => {
        if (res && res.success && res.user) {
          userInfo = res.user;
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
          if (!authHelper.ensureProfileComplete()) return;
          const name = userInfo.name || userInfo.email || '用';
          this.setData({
            isLoggedIn: true,
            userInfo,
            needsComplete: authHelper.needsProfileCompletion(userInfo),
            roleText: roleMap[userInfo.role] || userInfo.role || '学生',
            userFirstChar: name.charAt(0) || '用',
          });
        }
      }).catch(() => {
        this.setData({ isLoggedIn: false, userInfo: null });
      });
    } else {
      this.setData({ isLoggedIn: false, userInfo: null });
    }
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goCompleteAccount() {
    authHelper.goCompleteAccount();
  },

  logout() {
    authHelper.clearSession();
    this.setData({ isLoggedIn: false, userInfo: null, needsComplete: false });
    wx.showToast({ title: '已退出', icon: 'none' });
  },

  checkBackend() {
    if (config.USE_VIRTUAL_LOGIN) {
      wx.showToast({ title: '当前为虚拟登录，未请求后端', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '检测中', mask: true });
    api
      .health()
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '后端可访问', icon: 'success' });
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '无法连接后端', icon: 'none' });
      });
  },
});
