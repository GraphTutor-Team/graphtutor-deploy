const api = require('../../utils/api.js');
const config = require('../../utils/config.js');
const authHelper = require('../../utils/auth-helper.js');

Page({
  data: {
    email: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    passwordToggleText: '显示',
    loading: false,
    error: '',
    useVirtual: config.USE_VIRTUAL_LOGIN,
  },

  onEmailInput(e) {
    this.setData({ email: ((e.detail && e.detail.value) || '').trim(), error: '' });
  },

  onPasswordInput(e) {
    this.setData({ password: (e.detail && e.detail.value) || '', error: '' });
  },

  onConfirmInput(e) {
    this.setData({ confirmPassword: (e.detail && e.detail.value) || '', error: '' });
  },

  togglePassword() {
    const showPassword = !this.data.showPassword;
    this.setData({
      showPassword,
      passwordToggleText: showPassword ? '隐藏' : '显示',
    });
  },

  submit() {
    const { email, password, confirmPassword } = this.data;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.setData({ error: '请输入有效邮箱' });
      return;
    }
    if (!password || password.length < 6) {
      this.setData({ error: '密码至少 6 位' });
      return;
    }
    if (/\s/.test(password)) {
      this.setData({ error: '密码不能包含空格' });
      return;
    }
    if (password !== confirmPassword) {
      this.setData({ error: '两次密码不一致' });
      return;
    }

    this.setData({ loading: true, error: '' });
    api.register(email, password).then((res) => {
      if (!res || !res.success) {
        this.setData({ loading: false, error: (res && res.message) || '注册失败' });
        return;
      }

      const token = res.accessToken || res.token;
      const user = res.user || {};
      authHelper.persistSession(token, user, res.refreshToken);
      this.setData({ loading: false, error: '' });
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => {
        authHelper.afterLoginNavigate(user);
      }, 450);
    }).catch((err) => {
      this.setData({ loading: false, error: (err && err.message) || '注册失败，请稍后重试' });
    });
  },

  goLogin() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/login/login' }),
    });
  },
});
