const api = require('../../utils/api.js');
const config = require('../../utils/config.js');

const fs = wx.getFileSystemManager();

const GENDER_OPTIONS = ['未填', '男', '女', '其他'];

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    phoneCode: '',
    phoneNumber: '',
    genderIndex: 0,
    genderOptions: GENDER_OPTIONS,
    school: '',
    grade: '',
    loading: false,
    error: '',
    useVirtual: config.USE_VIRTUAL_LOGIN,
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail || {};
    if (!avatarUrl) return;
    // 临时路径需持久化，否则关闭小程序后无法再显示
    fs.saveFile({
      tempFilePath: avatarUrl,
      success: (res) => {
        this.setData({ avatarUrl: res.savedFilePath, error: '' });
      },
      fail: () => {
        this.setData({ avatarUrl: avatarUrl, error: '' });
      },
    });
  },

  onNicknameInput(e) {
    const nickname = (e.detail && e.detail.value) || '';
    this.setData({ nickname: nickname.trim(), error: '' });
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') return;
    const code = e.detail.code;
    const number = e.detail.phoneNumber || '';
    this.setData({ phoneCode: code || this.data.phoneCode, phoneNumber: number || this.data.phoneNumber, error: '' });
    if (code) wx.showToast({ title: '已授权手机号', icon: 'none' });
  },

  onPhoneInput(e) {
    this.setData({ phoneNumber: (e.detail && e.detail.value) || '', error: '' });
  },

  onGenderChange(e) {
    const i = parseInt(e.detail.value, 10) || 0;
    this.setData({ genderIndex: i });
  },

  onSchoolInput(e) {
    this.setData({ school: (e.detail && e.detail.value) || '' });
  },

  onGradeInput(e) {
    this.setData({ grade: (e.detail && e.detail.value) || '' });
  },

  submit() {
    const { nickname, avatarUrl, phoneCode, phoneNumber, genderIndex, genderOptions, school, grade } = this.data;
    if (!nickname) {
      this.setData({ error: '请填写昵称' });
      return;
    }
    const gender = genderIndex > 0 ? genderOptions[genderIndex] : '';
    this.setData({ loading: true, error: '' });
    wx.login({
      success: (res) => {
        const wxCode = res.code || '';
        const extra = { phoneCode, phoneNumber: phoneNumber.trim(), gender, school: school.trim(), grade: grade.trim(), wxCode };
        this.doLogin(nickname, avatarUrl, extra);
      },
      fail: () => {
        const extra = { phoneCode, phoneNumber: phoneNumber.trim(), gender, school: school.trim(), grade: grade.trim(), wxCode: '' };
        this.doLogin(nickname, avatarUrl, extra);
      },
    });
  },

  doLogin(nickname, avatarUrl, extra) {
    api.loginWithAvatar(nickname, avatarUrl, extra).then((res) => {
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
      }, 500);
    }).catch((err) => {
      this.setData({
        loading: false,
        error: (err && err.message) || '登录失败',
      });
    });
  },
});
