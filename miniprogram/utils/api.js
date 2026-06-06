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

/** 是否为虚拟登录（token 以 virtual- 开头） */
function isVirtualToken() {
  const t = getToken();
  return typeof t === 'string' && t.indexOf('virtual-') === 0;
}

// ========== 以下为请求后端用，接后端时无需改逻辑，只需在 config.js 关闭虚拟登录 ==========

/**
 * 请求后端 API（GET/POST 等）
 * 请求头已带 X-Client: miniprogram、Authorization: Bearer <token>
 */
function request(url, options = {}) {
  const baseUrl = getBaseUrl();
  const token = getToken();
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.message) || (res.data && res.data.error) || ('请求失败 ' + res.statusCode);
          reject(new Error(msg));
        }
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

module.exports = {
  request,
  getBaseUrl,
  getToken,
  login,
  sendSmsCode,
  loginWithSms,
  loginWithMiniProgram,
  loginWithAvatar,
  getMe,
  health,
  isVirtualToken,
  virtualLogin,
};
