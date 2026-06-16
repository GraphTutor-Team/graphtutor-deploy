/**
 * 功能页通用：登录检测 + 加载态
 */
const api = require('./api.js');
const authHelper = require('./auth-helper.js');
const config = require('./config.js');

function requireLogin(page, onReady) {
  if (!authHelper.ensureProfileComplete()) {
    page.setData({ isLoggedIn: false, loading: false });
    return false;
  }

  const token = wx.getStorageSync('token');
  if (!token || config.USE_VIRTUAL_LOGIN || api.isVirtualToken()) {
    page.setData({ isLoggedIn: false, loading: false });
    return false;
  }

  page.setData({ isLoggedIn: true, loading: true });
  api.ensureValidAccessToken()
    .then(() => onReady())
    .catch((err) => {
      const msg = (err && err.message) || '';
      if (msg.indexOf('登录') >= 0 || msg.indexOf('过期') >= 0) {
        authHelper.clearSession();
        page.setData({ isLoggedIn: false, loading: false });
        wx.showToast({ title: '请重新登录', icon: 'none' });
        return;
      }
      page.setData({ loading: false, loadError: msg || '加载失败' });
    });
  return true;
}

function goLogin() {
  wx.navigateTo({ url: '/pages/login/login' });
}

module.exports = {
  requireLogin,
  goLogin,
};
