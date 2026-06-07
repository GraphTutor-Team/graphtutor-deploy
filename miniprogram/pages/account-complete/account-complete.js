const api = require('../../utils/api.js');
const authHelper = require('../../utils/auth-helper.js');

Page({
  data: {
    mode: 'link',
    isLinkMode: true,
    isRegisterMode: false,
    linkTabClass: 'mode-btn mode-btn--active',
    registerTabClass: 'mode-btn',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    school: '',
    grade: '',
    showPassword: false,
    passwordToggleText: '显示',
    loading: false,
    error: '',
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('userInfo');
    if (!token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    if (!authHelper.needsProfileCompletion(user)) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  switchMode(e) {
    const mode = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'link';
    const isLink = mode === 'link';
    this.setData({
      mode,
      isLinkMode: isLink,
      isRegisterMode: !isLink,
      linkTabClass: isLink ? 'mode-btn mode-btn--active' : 'mode-btn',
      registerTabClass: isLink ? 'mode-btn' : 'mode-btn mode-btn--active',
      error: '',
    });
  },

  onEmailInput(e) {
    this.setData({ email: ((e.detail && e.detail.value) || '').trim(), error: '' });
  },

  onPasswordInput(e) {
    this.setData({ password: (e.detail && e.detail.value) || '', error: '' });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: (e.detail && e.detail.value) || '', error: '' });
  },

  onNameInput(e) {
    this.setData({ name: ((e.detail && e.detail.value) || '').trim(), error: '' });
  },

  onSchoolInput(e) {
    this.setData({ school: ((e.detail && e.detail.value) || '').trim(), error: '' });
  },

  onGradeInput(e) {
    this.setData({ grade: ((e.detail && e.detail.value) || '').trim(), error: '' });
  },

  togglePassword() {
    const showPassword = !this.data.showPassword;
    this.setData({
      showPassword,
      passwordToggleText: showPassword ? '隐藏' : '显示',
    });
  },

  submit() {
    const { mode, email, password, confirmPassword, name, school, grade } = this.data;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.setData({ error: '请输入有效邮箱' });
      return;
    }
    if (!password || password.length < 6) {
      this.setData({ error: '密码至少 6 位' });
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      this.setData({ error: '两次输入的密码不一致' });
      return;
    }

    this.setData({ loading: true, error: '' });

    api.completeAccount({
      mode,
      email,
      password,
      confirmPassword,
      name,
      school,
      grade,
    }).then((res) => {
      if (!res || !res.success) {
        this.setData({ loading: false, error: (res && res.message) || '操作失败' });
        return;
      }

      const token = res.accessToken || res.token;
      const user = res.user || {};
      authHelper.persistSession(token, user, res.refreshToken);

      wx.showToast({
        title: mode === 'link' ? '绑定成功' : '完善成功',
        icon: 'success',
      });

      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 500);
    }).catch((err) => {
      this.setData({ loading: false, error: (err && err.message) || '操作失败，请稍后重试' });
    });
  },
});
