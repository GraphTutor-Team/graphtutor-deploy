const api = require('../../utils/api.js');
const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const homeApi = require('../../utils/home-api.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    items: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    api.getNotifications({ page: 1, limit: 50 })
      .then((data) => {
        const items = (data.items || []).map((n) => ({
          id: n._id || n.id,
          title: n.title || n.message || '通知',
          content: homeApi.stripHtml(n.content || n.message || ''),
          timeText: homeApi.formatTimeAgo(n.createdAt),
          isRead: !!n.isRead,
        }));
        this.setData({ loading: false, items });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
      });
  },

  markAllRead() {
    apiExt.markAllNotificationsRead().then(() => {
      wx.showToast({ title: '已全部标为已读', icon: 'success' });
      this.loadData();
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
    });
  },

  tapItem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    apiExt.markNotificationRead(id).finally(() => this.loadData());
  },

  goLogin() {
    featurePage.goLogin();
  },

  reload() {
    this.loadData();
  },
});
