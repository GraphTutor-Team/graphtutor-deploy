/**
 * 小程序请求封装
 * 登录/用户信息：通过 config.USE_VIRTUAL_LOGIN 切换虚拟与真实后端，接后端时只需改 utils/config.js。
 */

const app = getApp();
const config = require('./config.js');

function getBaseUrl() {
  return app ? app.globalData.baseUrl : config.BASE_URL;
}

function getToken() {
  return app ? app.globalData.token : wx.getStorageSync('token');
}

function getRefreshToken() {
  return app && app.globalData.refreshToken
    ? app.globalData.refreshToken
    : wx.getStorageSync('refreshToken');
}

function saveTokens(accessToken, refreshToken) {
  if (app) {
    app.globalData.token = accessToken;
    if (refreshToken) app.globalData.refreshToken = refreshToken;
  }
  wx.setStorageSync('token', accessToken);
  if (refreshToken) wx.setStorageSync('refreshToken', refreshToken);
}

function clearSession() {
  if (app) {
    app.globalData.token = null;
    app.globalData.userInfo = null;
    app.globalData.refreshToken = null;
  }
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('refreshToken');
}

/** 是否为虚拟登录（token 以 virtual- 开头） */
function isVirtualToken() {
  const t = getToken();
  return typeof t === 'string' && t.indexOf('virtual-') === 0;
}

let refreshingPromise = null;

function refreshAccessToken() {
  if (refreshingPromise) return refreshingPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error('登录已过期，请重新登录'));
  }
  refreshingPromise = new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl();
    wx.request({
      url: baseUrl.replace(/\/$/, '') + '/api/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json', 'X-Client': 'miniprogram' },
      success(res) {
        const data = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && data.success && data.accessToken) {
          saveTokens(data.accessToken, data.refreshToken || refreshToken);
          resolve(data.accessToken);
          return;
        }
        clearSession();
        reject(new Error((data && data.message) || '登录已过期，请重新登录'));
      },
      fail(err) {
        clearSession();
        reject(err || new Error('刷新登录失败'));
      },
      complete() {
        refreshingPromise = null;
      },
    });
  });
  return refreshingPromise;
}

// ========== 以下为请求后端用，接后端时无需改逻辑，只需在 config.js 关闭虚拟登录 ==========

/**
 * 请求后端 API（GET/POST 等）
 * 请求头已带 X-Client: miniprogram、Authorization: Bearer <token>
 */
function request(url, options = {}, retryOn401 = true) {
  const baseUrl = getBaseUrl();
  const token = options.skipAuth ? '' : getToken();
  const fullUrl = url.startsWith('http') ? url : baseUrl.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);

  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'X-Client': 'miniprogram',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {}),
      },
      success(res) {
        if (res.statusCode === 401 && retryOn401 && !options.skipAuth && !config.USE_VIRTUAL_LOGIN) {
          refreshAccessToken()
            .then(() => request(url, options, false).then(resolve).catch(reject))
            .catch(reject);
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        const msg = (res.data && res.data.message) || (res.data && res.data.error) || ('请求失败 ' + res.statusCode);
        reject(new Error(msg));
      },
      fail(err) {
        reject(err || new Error('网络错误'));
      },
    });
  });
}

/** 虚拟登录：不请求后端，支持微信头像+昵称+更多选填信息 */
function virtualLogin(nickname, avatarUrl, extra) {
  const e = extra || {};
  const user = {
    id: 'virtual-user',
    name: nickname || '微信用户',
    avatarUrl: avatarUrl || '',
    email: (nickname || 'user') + '@wechat.local',
    role: 'student',
    phoneCode: e.phoneCode || '',
    phoneNumber: e.phoneNumber || '',
    gender: e.gender || '',
    school: e.school || '',
    grade: e.grade || '',
    wxCode: e.wxCode || '',
  };
  return Promise.resolve({
    success: true,
    token: 'virtual-' + Date.now(),
    accessToken: 'virtual-' + Date.now(),
    user,
  });
}

/**
 * 微信头像昵称登录（当前仅虚拟模式使用）
 * extra: { phoneCode, phoneNumber, gender, school, grade, wxCode }，接后端时可传 wxCode 换 openid、phoneCode 换手机号。
 */
function loginWithAvatar(nickname, avatarUrl, extra) {
  if (config.USE_VIRTUAL_LOGIN) {
    return virtualLogin(nickname, avatarUrl, extra);
  }
  return Promise.reject(new Error('请配置后端小程序登录接口，或使用邮箱密码登录'));
}

/**
 * 登录（邮箱密码，接后端时使用）
 * 接后端时：return request('/api/auth/login', { method: 'POST', data: { email, password } });
 */
function login(email, password) {
  if (config.USE_VIRTUAL_LOGIN) {
    return virtualLogin((email || '').trim(), '', { password: password || '' });
  }
  return request('/api/auth/login', { method: 'POST', data: { email, password } });
}

/** 邮箱注册（与 Web 端 /api/auth/register 一致） */
function register(email, password, name) {
  if (config.USE_VIRTUAL_LOGIN) {
    return virtualLogin((email || '').trim(), '', { password: password || '', name: name || '' });
  }
  return request('/api/auth/register', {
    method: 'POST',
    data: { email, password, name: name || undefined },
  });
}

/** 发送短信验证码 */
function sendSmsCode(phone) {
  if (config.USE_VIRTUAL_LOGIN) {
    return Promise.resolve({ success: true, message: 'ok', cooldown: 60 });
  }
  return request('/api/auth/sms/send', { method: 'POST', data: { phone } });
}

/** 手机验证码登录 */
function loginWithSms(phone, code) {
  if (config.USE_VIRTUAL_LOGIN) {
    const masked = String(phone || '').replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
    return virtualLogin(masked || '手机号用户', '', { phoneNumber: phone || '', smsCode: code || '' });
  }
  return request('/api/auth/sms/login', { method: 'POST', data: { phone, code } });
}

/** 微信小程序识别登录（wx.login code） */
function loginWithMiniProgram(wxCode) {
  if (config.USE_VIRTUAL_LOGIN) {
    const suffix = String(wxCode || '').slice(-6) || String(Date.now()).slice(-6);
    return virtualLogin(`微信用户${suffix}`, '', { wxCode: wxCode || '' });
  }
  return request('/api/auth/mp/login', { method: 'POST', data: { code: wxCode } });
}

/**
 * 获取当前用户
 * 接后端时：可去掉 isVirtualToken 分支，统一 return request('/api/auth/me', { method: 'GET' });
 */
function getMe() {
  if (config.USE_VIRTUAL_LOGIN && isVirtualToken()) {
    const userInfo = wx.getStorageSync('userInfo');
    return Promise.resolve({ success: true, user: userInfo || {} });
  }
  return request('/api/auth/me', { method: 'GET' });
}

function health() {
  return request('/api/health', { method: 'GET' });
}

/**
 * 微信临时账号完善 / 绑定已有 Web 账号
 * mode: 'link' | 'register'
 */
function completeAccount(payload) {
  if (config.USE_VIRTUAL_LOGIN) {
    const user = wx.getStorageSync('userInfo') || {};
    return Promise.resolve({
      success: true,
      user: { ...user, needsProfileCompletion: false, accountType: 'full', email: payload.email },
      accessToken: wx.getStorageSync('token'),
      token: wx.getStorageSync('token'),
    });
  }
  return request('/api/auth/mp/complete-account', { method: 'POST', data: payload });
}

function getNotifications(params) {
  const p = params || {};
  return request('/api/v3/notifications', {
    method: 'GET',
    data: {
      page: p.page || 1,
      limit: p.limit || 5,
      type: p.type,
    },
  }).then((res) => (res && res.success && res.data) || { items: [] });
}

function getRecommendedQuestions(params) {
  const p = params || {};
  return request('/api/v3/recommendations/questions', {
    method: 'GET',
    data: {
      limit: p.limit || 3,
      strategy: p.strategy || 'adaptive',
      includeReasons: p.includeReasons === false ? 'false' : 'true',
    },
  }).then((res) => (res && res.success && res.data) || []);
}

function getTodayReviewQuestions(params) {
  const p = params || {};
  return request('/api/v3/smart-review/today', {
    method: 'GET',
    data: { limit: p.limit || 50 },
  }).then((res) => (res && res.success && res.data) || { questions: [] });
}

function getComprehensiveAnalysis(days) {
  return request('/api/v3/enhanced-analytics/comprehensive', {
    method: 'GET',
    data: { days: days || 7 },
  }).then((res) => (res && res.success && res.data) || null);
}

module.exports = {
  request,
  getBaseUrl,
  getToken,
  getRefreshToken,
  saveTokens,
  clearSession,
  refreshAccessToken,
  login,
  register,
  sendSmsCode,
  loginWithSms,
  loginWithMiniProgram,
  loginWithAvatar,
  getMe,
  health,
  completeAccount,
  getNotifications,
  getRecommendedQuestions,
  getTodayReviewQuestions,
  getComprehensiveAnalysis,
  isVirtualToken,
  virtualLogin,
};
