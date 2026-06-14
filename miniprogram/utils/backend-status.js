/**
 * 全局后端连通状态（供首页、我的页展示）
 */
const config = require('./config.js');
const api = require('./api.js');

function applyStatus(app, status) {
  if (!app) return status;
  app.globalData.backendReady = !!status.ok;
  app.globalData.backendStatus = status;
  return status;
}

function refreshBackendStatus() {
  const app = getApp();
  if (config.USE_VIRTUAL_LOGIN) {
    return Promise.resolve(applyStatus(app, {
      ok: false,
      virtual: true,
      miniprogramLogin: false,
      message: '虚拟登录模式，未连接后端',
    }));
  }
  return api.checkBackendConnection().then((status) => applyStatus(app, status));
}

function getBackendStatus() {
  try {
    const app = getApp();
    return (app && app.globalData.backendStatus) || {
      ok: false,
      message: '尚未检测',
    };
  } catch (e) {
    return { ok: false, message: '尚未检测' };
  }
}

module.exports = {
  refreshBackendStatus,
  getBackendStatus,
};
