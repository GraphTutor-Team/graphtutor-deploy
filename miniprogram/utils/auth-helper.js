/**
 * 登录态与账号完善引导
 */

const config = require('./config.js');
const api = require('./api.js');

function isVirtualToken(token) {
  return typeof token === 'string' && token.indexOf('virtual-') === 0;
}

function needsProfileCompletion(user) {
  if (config.USE_VIRTUAL_LOGIN) return false;
  return !!(user && user.needsProfileCompletion);
}

function persistSession(token, user, refreshToken) {
  api.saveTokens(token, refreshToken);
  const app = getApp();
  app.globalData.userInfo = user;
  wx.setStorageSync('userInfo', user);
}

function clearSession() {
  api.clearSession();
}

function afterLoginNavigate(user) {
  if (needsProfileCompletion(user)) {
    wx.redirectTo({ url: '/pages/account-complete/account-complete' });
    return;
  }
  wx.switchTab({ url: '/pages/index/index' });
}

/** 若未完善账号则跳转完善页，返回 false 表示已拦截 */
function ensureProfileComplete() {
  const token = wx.getStorageSync('token');
  const user = wx.getStorageSync('userInfo');
  if (!token || isVirtualToken(token)) return true;
  if (needsProfileCompletion(user)) {
    wx.redirectTo({ url: '/pages/account-complete/account-complete' });
    return false;
  }
  return true;
}

function goCompleteAccount() {
  wx.navigateTo({ url: '/pages/account-complete/account-complete' });
}

module.exports = {
  needsProfileCompletion,
  persistSession,
  clearSession,
  afterLoginNavigate,
  ensureProfileComplete,
  goCompleteAccount,
};
