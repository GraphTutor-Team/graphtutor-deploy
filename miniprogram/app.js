// GraphTutor 小程序入口
// 后端地址在 utils/config.js 中配置

const config = require('./utils/config.js');
const { PRODUCTS } = require('./utils/shop-data.js');

App({
  globalData: {
    userInfo: null,
    token: null,
    refreshToken: null,
    baseUrl: config.BASE_URL,
    backendReady: false,
    backendStatus: null,
    products: PRODUCTS.slice(),
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    const refreshToken = wx.getStorageSync('refreshToken');
    if (token) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo || null;
      this.globalData.refreshToken = refreshToken || null;
    }

    const backendStatus = require('./utils/backend-status.js');
    backendStatus.refreshBackendStatus();

    if (!config.USE_VIRTUAL_LOGIN && token && refreshToken) {
      const api = require('./utils/api.js');
      if (api.isAccessTokenExpired && api.isAccessTokenExpired(token)) {
        api.ensureValidAccessToken().catch(() => {});
      }
    }
  },
});
