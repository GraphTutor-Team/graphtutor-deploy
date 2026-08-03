const apiExt = require('../../../utils/api-ext.js');
const featurePage = require('../../../utils/feature-page.js');

Page({
  data: {
    isLoggedIn: false,
    title: '',
    content: '',
    submitting: false,
  },

  onShow() {
    featurePage.requireLogin(this, () => {});
  },

  onTitleInput(e) {
    this.setData({ title: (e.detail && e.detail.value) || '' });
  },

  onContentInput(e) {
    this.setData({ content: (e.detail && e.detail.value) || '' });
  },

  submit() {
    const title = (this.data.title || '').trim();
    const content = (this.data.content || '').trim();
    if (!title) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!content) {
      wx.showToast({ title: '请填写内容', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;

    this.setData({ submitting: true });
    apiExt.createDiscussion({ title, content, type: 'general' })
      .then((created) => {
        const id = created && (created._id || created.id);
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => {
          if (id) {
            wx.redirectTo({ url: `/pages/community/detail/detail?id=${id}` });
          } else {
            wx.navigateBack();
          }
        }, 400);
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '发布失败', icon: 'none' });
      })
      .finally(() => this.setData({ submitting: false }));
  },

  goLogin() {
    featurePage.goLogin();
  },
});
