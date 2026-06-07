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
    // 第五周要求：商品数组放全局，多个页面共享
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
  },
});
