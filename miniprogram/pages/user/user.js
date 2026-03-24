const api = require('../../utils/api.js');

const roleMap = { student: '学生', question_manager: '出题负责人', admin: '管理员', user: '用户' };

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    roleText: '学生',
    userFirstChar: '用',
  },

  onShow() {
    const app = getApp();
    const token = app.globalData.token;
    let userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (token && userInfo) {
      const name = userInfo.name || userInfo.email || '用';
      this.setData({
        isLoggedIn: true,
        userInfo,
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
          const name = userInfo.name || userInfo.email || '用';
          this.setData({
            isLoggedIn: true,
            userInfo,
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

  logout() {
    wx.clearStorageSync();
    getApp().globalData.token = null;
    getApp().globalData.userInfo = null;
    this.setData({ isLoggedIn: false, userInfo: null });
    wx.showToast({ title: '已退出', icon: 'none' });
  },
});
