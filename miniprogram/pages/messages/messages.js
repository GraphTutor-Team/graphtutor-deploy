const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const quizHelper = require('../../utils/quiz-helper.js');
const homeApi = require('../../utils/home-api.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    items: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true });
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
        this.setData({ loading: false, items });
      })
      .catch(() => this.setData({ loading: false, items: [] }));
  },

  openChat(e) {
    const userId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '用户';
    if (!userId) return;
    wx.navigateTo({ url: `/pages/messages/chat/chat?userId=${userId}&name=${encodeURIComponent(name)}` });
  },

  goLogin() { featurePage.goLogin(); },
});
