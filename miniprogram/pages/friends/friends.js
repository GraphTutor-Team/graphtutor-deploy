const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    friends: [],
    requests: [],
    processingId: '',
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    Promise.all([
      apiExt.getFriends({ limit: 50 }),
      apiExt.getFriendRequests({ type: 'received', limit: 10 }),
    ]).then(([friendsRes, reqRes]) => {
      const friendList = friendsRes.items || friendsRes.friends || (Array.isArray(friendsRes) ? friendsRes : []);
      const reqList = reqRes.items || reqRes.requests || (Array.isArray(reqRes) ? reqRes : []);
      const friends = (Array.isArray(friendList) ? friendList : []).map((f) => {
        const u = f.friend || f.user || f;
        return {
          id: u._id || u.id || f._id,
          name: u.name || u.nickname || u.email || '好友',
          email: u.email || '',
        };
      });
      const requests = (Array.isArray(reqList) ? reqList : []).map((r) => ({
        id: r._id || r.id,
        name: (r.fromUser && (r.fromUser.name || r.fromUser.email)) || '好友请求',
      }));
      this.setData({ loading: false, friends, requests });
    }).catch((err) => {
      this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
    });
  },

  acceptRequest(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || this.data.processingId) return;
    this.setData({ processingId: id });
    apiExt.acceptFriendRequest(id)
      .then(() => {
        wx.showToast({ title: '已接受', icon: 'success' });
        this.loadData();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
      })
      .finally(() => this.setData({ processingId: '' }));
  },

  rejectRequest(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || this.data.processingId) return;
    this.setData({ processingId: id });
    apiExt.rejectFriendRequest(id)
      .then(() => {
        wx.showToast({ title: '已拒绝', icon: 'none' });
        this.loadData();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
      })
      .finally(() => this.setData({ processingId: '' }));
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
