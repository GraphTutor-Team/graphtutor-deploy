/**
 * 小程序请求封装
 * 登录/用户信息：通过 config.USE_VIRTUAL_LOGIN 切换虚拟与真实后端，接后端时只需改 utils/config.js。
 */

const config = require('./config.js');

function getAppSafe() {
  try {
    return getApp();
  } catch (e) {
    return null;
  }
}

function getBaseUrl() {
  const app = getAppSafe();
  return app ? app.globalData.baseUrl : config.BASE_URL;
}

function getToken() {
  const app = getAppSafe();
  return app && app.globalData.token ? app.globalData.token : wx.getStorageSync('token');
}

function getRefreshToken() {
  const app = getAppSafe();
  if (app && app.globalData.refreshToken) return app.globalData.refreshToken;
  return wx.getStorageSync('refreshToken');
}

function cleanQuery(data) {
  const out = {};
  Object.keys(data || {}).forEach((key) => {
    const val = data[key];
    if (val !== undefined && val !== null && val !== '') out[key] = val;
  });
  return out;
}

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    let json = '';
    if (typeof atob === 'function') {
      json = atob(base64);
    } else {
      const buffer = wx.base64ToArrayBuffer(base64);
      json = String.fromCharCode.apply(null, new Uint8Array(buffer));
    }
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function isAccessTokenExpired(token, skewMs) {
  if (!token || typeof token !== 'string') return true;
  if (token.indexOf('virtual-') === 0) return false;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const skew = typeof skewMs === 'number' ? skewMs : 60000;
  return Date.now() >= payload.exp * 1000 - skew;
}

function saveTokens(accessToken, refreshToken) {
  const app = getAppSafe();
  if (app) {
    app.globalData.token = accessToken;
    if (refreshToken) app.globalData.refreshToken = refreshToken;
  }
  wx.setStorageSync('token', accessToken);
  if (refreshToken) wx.setStorageSync('refreshToken', refreshToken);
}

function clearSession() {
  const app = getAppSafe();
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

/** 请求 v3 接口前确保 access token 有效（过期则自动 refresh） */
function ensureValidAccessToken() {
  if (config.USE_VIRTUAL_LOGIN) {
    if (isVirtualToken()) return Promise.resolve(getToken());
    return Promise.reject(new Error('未登录'));
  }

  const token = getToken();
  if (!token) {
    return Promise.reject(new Error('登录已过期，请重新登录'));
  }
  if (isVirtualToken()) {
    clearSession();
    return Promise.reject(new Error('登录已过期，请重新登录'));
  }
  if (!isAccessTokenExpired(token)) {
    return Promise.resolve(token);
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    return Promise.reject(new Error('登录已过期，请重新登录'));
  }
  return refreshAccessToken();
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
        if (res.statusCode === 429) {
          const retry = res.data && res.data.retryAfter;
          const hint = retry ? `请约 ${Math.ceil(retry / 60) || 1} 分钟后再试` : '请稍后再试';
          reject(new Error(`${msg}（${hint}）`));
          return;
        }
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
  return request('/api/health', { method: 'GET', skipAuth: true }, false);
}

/** 检测后端是否可达（无需登录） */
function checkBackendConnection() {
  if (config.USE_VIRTUAL_LOGIN) {
    return Promise.resolve({ ok: false, virtual: true, message: '当前为虚拟登录，未连接后端' });
  }
  return health()
    .then((data) => {
      const mp = data && data.features && data.features.miniprogramLogin;
      return {
        ok: !!(data && data.ok),
        virtual: false,
        miniprogramLogin: !!(mp && mp.configured),
        message: data && data.ok ? '后端已连接' : '后端响应异常',
      };
    })
    .catch((err) => ({
      ok: false,
      virtual: false,
      miniprogramLogin: false,
      message: (err && err.message) || '无法连接后端，请检查网络与 BASE_URL',
    }));
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
    data: cleanQuery({
      page: p.page || 1,
      limit: p.limit || 5,
      type: p.type,
    }),
  }).then((res) => (res && res.success && res.data) || { items: [] });
}

function getRecommendedQuestions(params) {
  const p = params || {};
  return request('/api/v3/recommendations/questions', {
    method: 'GET',
    data: cleanQuery({
      limit: p.limit || 3,
      strategy: p.strategy || 'random',
      includeReasons: p.includeReasons === false ? 'false' : 'true',
      knowledgeNodeId: p.knowledgeNodeId,
    }),
  })
    .then((res) => (res && res.success && res.data) || [])
    .catch(() => []);
}

function getTodayReviewQuestions(params) {
  const p = params || {};
  return request('/api/v3/smart-review/today', {
    method: 'GET',
    data: cleanQuery({ limit: p.limit || 50 }),
  })
    .then((res) => (res && res.success && res.data) || { questions: [] })
    .catch(() => ({ questions: [] }));
}

function getComprehensiveAnalysis(days) {
  return request('/api/v3/enhanced-analytics/comprehensive', {
    method: 'GET',
    data: cleanQuery({ days: days || 7 }),
  })
    .then((res) => (res && res.success && res.data) || null)
    .catch(() => null);
}

function getLearningTrend(days) {
  return request('/api/analytics/trend', {
    method: 'GET',
    data: cleanQuery({ days: days || 30 }),
  }).then((res) => (res && res.success && res.data) || []);
}

function getNodeQuestions(node, limit) {
  return request('/api/questions', {
    method: 'GET',
    data: cleanQuery({
      node,
      limit: limit || 10,
      random: 'true',
    }),
  }).then((res) => {
    const items = (res && (res.items || res.data)) || [];
    return Array.isArray(items) ? items : [];
  }).catch(() => []);
}

function getWrongQuestions(params) {
  const p = params || {};
  return request('/api/v3/wrong-questions', {
    method: 'GET',
    data: cleanQuery({
      page: p.page || 1,
      limit: p.limit || 10,
      masteryStatus: p.masteryStatus,
      sortBy: p.sortBy || 'lastErrorAt',
      sortOrder: p.sortOrder || 'desc',
    }),
  }).then((res) => (res && res.success && res.data) || { items: [], total: 0 });
}

function getWrongQuestionStats() {
  return request('/api/v3/wrong-questions/stats', { method: 'GET' })
    .then((res) => (res && res.success && res.data) || null);
}

function getStudyPlans(params) {
  const p = params || {};
  return request('/api/v3/study-plans', {
    method: 'GET',
    data: cleanQuery({
      page: p.page || 1,
      limit: p.limit || 5,
      status: p.status,
    }),
  }).then((res) => (res && res.success && res.data) || { items: [], total: 0 });
}

function createStudyPlan(data) {
  return request('/api/v3/study-plans', {
    method: 'POST',
    data: data || {},
  }).then((res) => {
    if (res && res.success === false) {
      throw new Error(res.message || '创建学习计划失败');
    }
    return (res && res.data) || res;
  });
}

function getStudyPlanStats() {
  return request('/api/v3/study-plans/stats', { method: 'GET' })
    .then((res) => (res && res.success && res.data) || null);
}

function getGraphHeatmap(days) {
  return request('/api/v3/enhanced-analytics/graph-heatmap', {
    method: 'GET',
    data: cleanQuery({ days: days || 90 }),
  }).then((res) => (res && res.success && res.data) || []);
}

function getPathRecommendations(params) {
  const p = params || {};
  return request('/api/v3/enhanced-analytics/path-recommendations', {
    method: 'GET',
    data: cleanQuery({
      days: p.days || 90,
      limit: p.limit || 5,
    }),
  }).then((res) => (res && res.success && res.data) || []);
}

function getQuestionBanks(params) {
  const p = params || {};
  return request('/api/v3/banks', {
    method: 'GET',
    data: cleanQuery({
      page: p.page || 1,
      limit: p.limit || 100,
      search: p.search,
      subjectCode: p.subjectCode,
    }),
  }).then((res) => (res && res.success && res.data) || []);
}

function startQuizSession(payload) {
  return request('/api/quizzes/session/start', { method: 'POST', data: payload });
}

function getQuizSession(sessionId, reveal) {
  const qs = reveal ? '?reveal=1' : '';
  return request(`/api/quizzes/session/${sessionId}${qs}`, { method: 'GET' });
}

function submitQuizAnswer(sessionId, payload) {
  return request(`/api/quizzes/session/${sessionId}/answer`, { method: 'POST', data: payload });
}

function submitQuizAnswersBatch(sessionId, payload) {
  return request(`/api/quizzes/session/${sessionId}/answers/batch`, { method: 'POST', data: payload });
}

function isBatchSubmitUnavailable(err) {
  const msg = String((err && err.message) || '');
  return msg.indexOf('404') >= 0
    || msg.indexOf('Not Found') >= 0
    || msg.indexOf('批量提交') >= 0;
}

/** 优先批量提交；旧服务器无 batch 接口时逐条降级 */
function submitSessionAnswers(sessionId, payload) {
  const list = (payload && payload.answers) || [];
  if (!list.length) return Promise.resolve({ ok: true, submitted: 0 });
  return submitQuizAnswersBatch(sessionId, payload).catch((err) => {
    if (!isBatchSubmitUnavailable(err)) throw err;
    return list.reduce(
      (chain, item) => chain.then(() => submitQuizAnswer(sessionId, item)),
      Promise.resolve()
    ).then(() => ({ ok: true, submitted: list.length, fallback: true }));
  });
}

function finishQuizSession(sessionId) {
  return request(`/api/quizzes/session/${sessionId}/finish`, { method: 'POST' });
}

module.exports = {
  request,
  getBaseUrl,
  getToken,
  getRefreshToken,
  saveTokens,
  clearSession,
  refreshAccessToken,
  ensureValidAccessToken,
  isAccessTokenExpired,
  login,
  register,
  sendSmsCode,
  loginWithSms,
  loginWithMiniProgram,
  loginWithAvatar,
  getMe,
  health,
  checkBackendConnection,
  completeAccount,
  getNotifications,
  getRecommendedQuestions,
  getTodayReviewQuestions,
  getComprehensiveAnalysis,
  getLearningTrend,
  getNodeQuestions,
  getWrongQuestions,
  getWrongQuestionStats,
  getStudyPlans,
  createStudyPlan,
  getStudyPlanStats,
  getGraphHeatmap,
  getPathRecommendations,
  getQuestionBanks,
  startQuizSession,
  getQuizSession,
  submitQuizAnswer,
  submitQuizAnswersBatch,
  submitSessionAnswers,
  finishQuizSession,
  isVirtualToken,
  virtualLogin,
};
