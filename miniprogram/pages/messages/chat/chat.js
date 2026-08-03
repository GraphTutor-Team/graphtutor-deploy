const api = require('../../../utils/api.js');
const apiExt = require('../../../utils/api-ext.js');
const authHelper = require('../../../utils/auth-helper.js');
const quizHelper = require('../../../utils/quiz-helper.js');
const homeApi = require('../../../utils/home-api.js');

const POLL_MS = 15000;

function sortMessagesAsc(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return ta - tb;
  });
}

Page({
  data: {
    userId: '',
    userName: '用户',
    loading: true,
    sending: false,
    clearing: false,
    messages: [],
    draft: '',
    myId: '',
    scrollInto: '',
    pollHint: '',
  },

  _pollTimer: null,
  _lastMessageId: '',

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
    this.loadMessages({ silent: false });
  },

  onShow() {
    if (this.data.userId) this.startPolling();
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
      this.loadMessages({ silent: true });
    }, POLL_MS);
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  loadMessages(opts) {
    const silent = !!(opts && opts.silent);
    const { userId, myId } = this.data;
    if (!userId) return;
    if (!silent) this.setData({ loading: true });

    api.ensureValidAccessToken()
      .then(() => apiExt.getConversation(userId, { limit: 50 }))
      .then((list) => {
        const raw = Array.isArray(list) ? list : (list && list.items) || [];
        const sorted = sortMessagesAsc(raw);
        const messages = sorted.map((m) => {
          const senderId = String(m.senderId || (m.sender && (m.sender._id || m.sender.id)) || '');
          const id = m._id || m.id;
          return {
            id,
            scrollId: `msg-${id}`,
            content: quizHelper.stripHtml(m.content || ''),
            timeText: homeApi.formatTimeAgo(m.createdAt),
            isMine: senderId === String(myId),
          };
        });

        const last = messages.length ? messages[messages.length - 1] : null;
        const lastId = last ? String(last.id) : '';
        const prevLastId = this._lastMessageId;
        const hasIncoming =
          silent &&
          lastId &&
          prevLastId &&
          lastId !== prevLastId &&
          last &&
          !last.isMine;

        if (lastId) this._lastMessageId = lastId;

        const scrollInto = messages.length ? messages[messages.length - 1].scrollId : '';
        this.setData({
          loading: false,
          messages,
          scrollInto: hasIncoming || !silent ? scrollInto : this.data.scrollInto,
          pollHint: hasIncoming ? '收到新消息' : '',
        });

        if (hasIncoming) {
          wx.showToast({ title: '收到新消息', icon: 'none' });
          setTimeout(() => this.setData({ pollHint: '' }), 2000);
        }

        apiExt.markMessagesAsRead(userId).catch(() => {});
      })
      .catch(() => {
        if (!silent) this.setData({ loading: false, messages: [] });
      });
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
        this.loadMessages({ silent: false });
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '发送失败', icon: 'none' });
      })
      .finally(() => this.setData({ sending: false }));
  },

  confirmClearChat() {
    const { userId, userName, clearing } = this.data;
    if (!userId || clearing) return;
    wx.showModal({
      title: '清空聊天记录',
      content: `确定清空与「${userName}」的聊天记录吗？仅对你隐藏，对方仍可见。`,
      confirmColor: '#d32f2f',
      success: (res) => {
        if (res.confirm) this.clearChat();
      },
    });
  },

  clearChat() {
    const { userId } = this.data;
    if (!userId) return;
    this.setData({ clearing: true });
    apiExt.deleteConversation(userId)
      .then(() => {
        wx.showToast({ title: '已清空', icon: 'success' });
        this.setData({ messages: [], scrollInto: '' });
        this._lastMessageId = '';
        setTimeout(() => wx.navigateBack(), 400);
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '清空失败', icon: 'none' });
      })
      .finally(() => this.setData({ clearing: false }));
  },
});
