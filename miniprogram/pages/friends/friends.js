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
    keyword: '',
    searching: false,
    searchResults: [],
    searchTimer: null,
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

  onSearchInput(e) {
    const keyword = (e.detail && e.detail.value) || '';
    this.setData({ keyword });
    if (this.data.searchTimer) clearTimeout(this.data.searchTimer);
    if (!keyword.trim()) {
      this.setData({ searchResults: [], searching: false });
      return;
    }
    const timer = setTimeout(() => this.doSearch(keyword.trim()), 400);
    this.setData({ searchTimer: timer });
  },

  doSearch(keyword) {
    this.setData({ searching: true });
    apiExt.searchUsers({ keyword, limit: 20 })
      .then((res) => {
        const list = res.items || (Array.isArray(res) ? res : []);
        const searchResults = list.map((u) => ({
          id: u._id || u.id,
          name: u.name || u.email || '用户',
          email: u.email || '',
          relationship: u.relationship || 'none',
        }));
        this.setData({ searching: false, searchResults });
      })
      .catch((err) => {
        this.setData({ searching: false, searchResults: [] });
        wx.showToast({ title: (err && err.message) || '搜索失败', icon: 'none' });
      });
  },

  sendRequest(e) {
    const userId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '用户';
    if (!userId || this.data.processingId) return;
    this.setData({ processingId: userId });
    apiExt.sendFriendRequest(userId)
      .then(() => {
        wx.showToast({ title: `已向 ${name} 发送请求`, icon: 'success' });
        const searchResults = this.data.searchResults.map((u) => (
          u.id === userId ? { ...u, relationship: 'request_sent' } : u
        ));
        this.setData({ searchResults });
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '发送失败', icon: 'none' });
      })
      .finally(() => this.setData({ processingId: '' }));
  },

  openChat(e) {
    const userId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '用户';
    if (!userId) return;
    wx.navigateTo({
      url: `/pages/messages/chat/chat?userId=${userId}&name=${encodeURIComponent(name)}`,
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
