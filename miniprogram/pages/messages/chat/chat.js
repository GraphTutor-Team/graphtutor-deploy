const api = require('../../../utils/api.js');
const apiExt = require('../../../utils/api-ext.js');
const authHelper = require('../../../utils/auth-helper.js');
const quizHelper = require('../../../utils/quiz-helper.js');
const homeApi = require('../../../utils/home-api.js');

Page({
  data: {
    userId: '',
    userName: '用户',
    loading: true,
    sending: false,
    messages: [],
    draft: '',
    myId: '',
  },

  onLoad(options) {
    const userId = options && options.userId ? options.userId : '';
    const userName = options && options.name ? decodeURIComponent(options.name) : '用户';
    this.setData({
      userId,
      userName,
      myId: authHelper.getUserId() || '',
    });
    if (!userId) {
      this.setData({ loading: false });
      return;
    }
    wx.setNavigationBarTitle({ title: userName });
    this.loadMessages();
  },

  loadMessages() {
    const { userId, myId } = this.data;
    if (!userId) return;
    this.setData({ loading: true });
    api.ensureValidAccessToken()
      .then(() => apiExt.getConversation(userId, { limit: 50 }))
      .then((list) => {
        const raw = Array.isArray(list) ? list : (list && list.items) || [];
        const messages = raw.map((m) => {
          const senderId = String(m.senderId || (m.sender && (m.sender._id || m.sender.id)) || '');
          return {
            id: m._id || m.id,
            content: quizHelper.stripHtml(m.content || ''),
            timeText: homeApi.formatTimeAgo(m.createdAt),
            isMine: senderId === String(myId),
          };
        });
        this.setData({ loading: false, messages });
        apiExt.markMessagesAsRead(userId).catch(() => {});
      })
      .catch(() => this.setData({ loading: false, messages: [] }));
  },

  onInput(e) {
    this.setData({ draft: (e.detail && e.detail.value) || '' });
  },

  send() {
    const { userId, draft, sending } = this.data;
    const content = (draft || '').trim();
    if (!userId || !content || sending) return;
    this.setData({ sending: true });
    apiExt.sendMessage({ receiverId: userId, content, type: 'text' })
      .then(() => {
        this.setData({ draft: '' });
        this.loadMessages();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '发送失败', icon: 'none' });
      })
      .finally(() => this.setData({ sending: false }));
  },
});
