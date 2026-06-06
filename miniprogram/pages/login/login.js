const api = require('../../utils/api.js');
const config = require('../../utils/config.js');

function normalizePhone(str) {
  return String(str || '').replace(/\D/g, '').slice(0, 11);
}

Page({
  data: {
    loginMode: 'password', // password | sms
    isPasswordMode: true,
    isSmsMode: false,
    passwordTabClass: 'mode-btn mode-btn--active',
    smsTabClass: 'mode-btn',
    email: '',
    password: '',
    showPassword: false,
    passwordToggleText: '显示',
    phoneNumber: '',
    smsCode: '',
    sendCooldown: 0,
    smsSending: false,
    smsSendText: '获取验证码',
    canSendSms: false,
    loading: false,
    githubLoading: false,
    wechatLoading: false,
    mpLoading: false,
    error: '',
    useVirtual: config.USE_VIRTUAL_LOGIN,
  },

  timer: null,

  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },

  switchMode(e) {
    const mode = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'password';
    const isPassword = mode === 'password';
    this.setData({
      loginMode: mode,
      isPasswordMode: isPassword,
      isSmsMode: !isPassword,
      passwordTabClass: isPassword ? 'mode-btn mode-btn--active' : 'mode-btn',
      smsTabClass: isPassword ? 'mode-btn' : 'mode-btn mode-btn--active',
      error: '',
    });
  },

  onEmailInput(e) {
    this.setData({ email: ((e.detail && e.detail.value) || '').trim(), error: '' });
  },

  onPasswordInput(e) {
    this.setData({ password: (e.detail && e.detail.value) || '', error: '' });
  },

  togglePassword() {
    const showPassword = !this.data.showPassword;
    this.setData({
      showPassword,
      passwordToggleText: showPassword ? '隐藏' : '显示',
    });
  },

  onPhoneInput(e) {
    const phoneNumber = normalizePhone((e.detail && e.detail.value) || '');
    this.setData({
      phoneNumber,
      canSendSms: phoneNumber.length === 11 && this.data.sendCooldown === 0 && !this.data.smsSending && !this.data.loading,
      error: '',
    });
  },

  onSmsCodeInput(e) {
    const code = String((e.detail && e.detail.value) || '').replace(/\D/g, '').slice(0, 6);
    this.setData({ smsCode: code, error: '' });
  },

  startSmsCooldown(seconds) {
    if (this.timer) clearInterval(this.timer);
    let remain = Math.max(0, parseInt(seconds, 10) || 0);
    this.setData({
      sendCooldown: remain,
      smsSendText: remain > 0 ? `${remain}s 后重发` : '获取验证码',
      canSendSms: this.data.phoneNumber.length === 11 && remain === 0 && !this.data.smsSending && !this.data.loading,
    });
    if (!remain) return;
    this.timer = setInterval(() => {
      remain -= 1;
      if (remain <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.setData({
          sendCooldown: 0,
          smsSendText: '获取验证码',
          canSendSms: this.data.phoneNumber.length === 11 && !this.data.smsSending && !this.data.loading,
        });
        return;
      }
      this.setData({ sendCooldown: remain, smsSendText: `${remain}s 后重发`, canSendSms: false });
    }, 1000);
  },

  sendSmsCode() {
    const phone = normalizePhone(this.data.phoneNumber);
    if (phone.length !== 11 || phone.indexOf('1') !== 0) {
      this.setData({ error: '请输入正确的 11 位手机号' });
      return;
    }
    if (!this.data.canSendSms) return;

    this.setData({ smsSending: true, canSendSms: false, error: '' });
    api.sendSmsCode(phone).then((res) => {
      if (!res || !res.success) {
        this.setData({ error: (res && res.message) || '发送失败' });
        return;
      }
      this.startSmsCooldown(60);
      wx.showToast({ title: '验证码已发送', icon: 'success' });
    }).catch((err) => {
      const cooldown = err && err.cooldown;
      if (typeof cooldown === 'number' && cooldown > 0) {
        this.startSmsCooldown(cooldown);
      }
      this.setData({ error: (err && err.message) || '发送验证码失败' });
    }).finally(() => {
      this.setData({
        smsSending: false,
        canSendSms: this.data.phoneNumber.length === 11 && this.data.sendCooldown === 0 && !this.data.loading,
      });
    });
  },

  submitPassword() {
    const { email, password } = this.data;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.setData({ error: '请输入有效邮箱' });
      return;
    }
    if (!password || password.length < 6) {
      this.setData({ error: '密码至少 6 位' });
      return;
    }

    this.setData({ loading: true, error: '' });
    api.login(email, password).then((res) => {
      this.onLoginSuccess(res);
    }).catch((err) => {
      this.setData({ loading: false, error: (err && err.message) || '登录失败，请检查邮箱和密码' });
    });
  },

  submitSms() {
    const phone = normalizePhone(this.data.phoneNumber);
    const code = String(this.data.smsCode || '');
    if (phone.length !== 11 || phone.indexOf('1') !== 0) {
      this.setData({ error: '请输入正确的 11 位手机号' });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      this.setData({ error: '请输入 6 位数字验证码' });
      return;
    }

    this.setData({ loading: true, error: '' });
    api.loginWithSms(phone, code).then((res) => {
      this.onLoginSuccess(res);
    }).catch((err) => {
      this.setData({ loading: false, error: (err && err.message) || '验证码错误或已过期' });
    });
  },

  onLoginSuccess(res) {
    if (!res || !res.success) {
      this.setData({ loading: false, error: (res && res.message) || '登录失败' });
      return;
    }

    const app = getApp();
    const token = res.accessToken || res.token;
    const user = res.user || {};
    app.globalData.token = token;
    app.globalData.userInfo = user;
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', user);
    this.setData({ loading: false, error: '' });
    wx.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 450);
  },

  onGithubLogin() {
    this.setData({ githubLoading: true, error: '' });
    setTimeout(() => {
      this.setData({ githubLoading: false });
      wx.showToast({ title: '小程序暂不支持 GitHub 跳转', icon: 'none' });
    }, 400);
  },

  onWechatScanLogin() {
    this.setData({ wechatLoading: true, error: '' });
    setTimeout(() => {
      this.setData({ wechatLoading: false });
      wx.showToast({ title: '请使用本页方式登录', icon: 'none' });
    }, 400);
  },

  onMiniProgramIdentifyLogin() {
    if (this.data.loading || this.data.mpLoading) return;
    this.setData({ mpLoading: true, error: '' });
    wx.login({
      success: (res) => {
        const code = (res && res.code) || '';
        if (!code) {
          this.setData({ mpLoading: false, error: '微信识别失败，请重试' });
          return;
        }
        api.loginWithMiniProgram(code).then((result) => {
          this.setData({ mpLoading: false });
          this.onLoginSuccess(result);
        }).catch((err) => {
          this.setData({ mpLoading: false, error: (err && err.message) || '微信识别登录失败' });
        });
      },
      fail: () => {
        this.setData({ mpLoading: false, error: '微信识别失败，请检查网络后重试' });
      },
    });
  },

  goRegisterTip() {
    wx.showModal({
      title: '注册提示',
      content: '当前小程序未接入独立注册页，请先使用邮箱密码或验证码登录。',
      showCancel: false,
    });
  },
});
