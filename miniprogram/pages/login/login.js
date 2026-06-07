const api = require('../../utils/api.js');
const config = require('../../utils/config.js');
const authHelper = require('../../utils/auth-helper.js');

Page({
  data: {
    email: '',
    password: '',
    showPassword: false,
    passwordToggleText: '显示',
    loading: false,
    mpLoading: false,
    error: '',
    useVirtual: config.USE_VIRTUAL_LOGIN,
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

  onLoginSuccess(res) {
    if (!res || !res.success) {
      this.setData({ loading: false, mpLoading: false, error: (res && res.message) || '登录失败' });
      return;
    }

    const token = res.accessToken || res.token;
    const user = res.user || {};
    authHelper.persistSession(token, user, res.refreshToken);
    this.setData({ loading: false, mpLoading: false, error: '' });
    wx.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => {
      authHelper.afterLoginNavigate(user);
    }, 450);
  },

  onMiniProgramLogin() {
    if (this.data.loading || this.data.mpLoading) return;
    this.setData({ mpLoading: true, error: '' });
    wx.login({
      success: (res) => {
        const code = (res && res.code) || '';
        if (!code) {
          this.setData({ mpLoading: false, error: '微信登录失败，请重试' });
          return;
        }
        api.loginWithMiniProgram(code).then((result) => {
          this.onLoginSuccess(result);
        }).catch((err) => {
          this.setData({ mpLoading: false, error: (err && err.message) || '微信登录失败' });
        });
      },
      fail: () => {
        this.setData({ mpLoading: false, error: '微信登录失败，请检查网络后重试' });
      },
    });
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },
});
