const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const quizHelper = require('../../utils/quiz-helper.js');
const homeApi = require('../../utils/home-api.js');

const POLL_MS = 15000;

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    items: [],
    deletingId: '',
    newMsgTip: '',
  },

  _pollTimer: null,
  _lastUnreadTotal: null,

  onShow() {
    featurePage.requireLogin(this, () => {
      this.loadData({ silent: false });
      this.startPolling();
    });
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  startPolling() {
    this.stopPolling();
    this._pollTimer = setInterval(() => {
      if (this.data.isLoggedIn) this.loadData({ silent: true });
    }, POLL_MS);
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  loadData(opts) {
    const silent = !!(opts && opts.silent);
    if (!silent) this.setData({ loading: true });

    apiExt.getConversations()
      .then((list) => {
        const raw = Array.isArray(list) ? list : (list && list.items) || [];
        const items = raw.map((c) => {
          const lastMsg = c.lastMessage;
          const previewText = typeof lastMsg === 'string'
            ? lastMsg
            : (lastMsg && (lastMsg.content || lastMsg.text)) || c.preview || '';
          return {
            id: c.userId || c._id || (c.user && (c.user._id || c.user.id)),
            name: c.name || (c.user && c.user.name) || (c.partner && c.partner.name) || '用户',
            preview: quizHelper.stripHtml(previewText).slice(0, 40),
            timeText: homeApi.formatTimeAgo(c.lastMessageAt || (lastMsg && lastMsg.createdAt) || c.updatedAt),
            unread: c.unreadCount || 0,
          };
        });

        const unreadTotal = items.reduce((sum, it) => sum + (Number(it.unread) || 0), 0);
        const prev = this._lastUnreadTotal;
        const hasNew = silent && prev !== null && unreadTotal > prev;
        this._lastUnreadTotal = unreadTotal;

        this.setData({
          loading: false,
          items,
          newMsgTip: hasNew ? `有 ${unreadTotal} 条未读消息` : '',
        });

        if (hasNew) {
          wx.showToast({ title: '有新消息', icon: 'none' });
          setTimeout(() => this.setData({ newMsgTip: '' }), 2500);
        }
      })
      .catch(() => {
        if (!silent) this.setData({ loading: false, items: [] });
      });
  },

  openChat(e) {
    const userId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '用户';
    if (!userId) return;
    wx.navigateTo({ url: `/pages/messages/chat/chat?userId=${userId}&name=${encodeURIComponent(name)}` });
  },

  confirmDelete(e) {
    const userId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '用户';
    if (!userId || this.data.deletingId) return;
    wx.showModal({
      title: '删除会话',
      content: `确定删除与「${name}」的会话吗？聊天记录将对你隐藏。`,
      confirmColor: '#d32f2f',
      success: (res) => {
        if (res.confirm) this.deleteConversation(userId);
      },
    });
  },

  deleteConversation(userId) {
    this.setData({ deletingId: userId });
    apiExt.deleteConversation(userId)
      .then(() => {
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadData({ silent: false });
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
      })
      .finally(() => this.setData({ deletingId: '' }));
  },

  goLogin() { featurePage.goLogin(); },
});
