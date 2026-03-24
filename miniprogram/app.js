// GraphTutor 小程序入口
// 后端地址在 utils/config.js 中配置

const config = require('./utils/config.js');

App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: config.BASE_URL,
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo || null;
    }
  }
});
