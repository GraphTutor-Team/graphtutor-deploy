/**
 * Tab 页通用：登录检测 + 拉取数据
 */
const api = require('./api.js');
const authHelper = require('./auth-helper.js');
const config = require('./config.js');

function loadAuthenticatedPage(page, fetchFn, applyData) {
  if (!authHelper.ensureProfileComplete()) return;

  const token = wx.getStorageSync('token');
  if (!token || config.USE_VIRTUAL_LOGIN || api.isVirtualToken()) {
    page.setData({
      isLoggedIn: false,
      loading: false,
      connected: false,
    });
    return;
  }

  page.setData({ isLoggedIn: true, loading: true });
  fetchFn()
    .then((data) => {
      applyData(page, data);
      page.setData({ loading: false, connected: !!data.connected });
    })
    .catch((err) => {
      const msg = (err && err.message) || '';
      if (msg.indexOf('登录') >= 0 || msg.indexOf('过期') >= 0) {
        authHelper.clearSession();
        page.setData({ isLoggedIn: false, loading: false, connected: false });
        wx.showToast({ title: '请重新登录', icon: 'none' });
        return;
      }
      page.setData({ loading: false, connected: false });
    });
}

module.exports = {
  loadAuthenticatedPage,
};
