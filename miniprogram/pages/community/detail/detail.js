const apiExt = require('../../../utils/api-ext.js');
const quizHelper = require('../../../utils/quiz-helper.js');
const homeApi = require('../../../utils/home-api.js');

Page({
  data: {
    loading: true,
    id: '',
    title: '',
    content: '',
    replies: [],
    replyText: '',
    submitting: false,
  },

  onLoad(options) {
    this.setData({ id: options && options.id ? options.id : '' });
    this.loadDetail();
  },

  loadDetail() {
    const { id } = this.data;
    if (!id) return;
    apiExt.getDiscussionDetail(id).then((d) => {
      const replies = (d.replies || []).map((r) => ({
        id: r._id || r.id,
        content: quizHelper.stripHtml(r.content || ''),
        author: (r.author && r.author.name) || '用户',
        timeText: homeApi.formatTimeAgo(r.createdAt),
      }));
      this.setData({
        loading: false,
        title: quizHelper.stripHtml(d.title || ''),
        content: quizHelper.stripHtml(d.content || d.body || ''),
        replies,
      });
    }).catch(() => this.setData({ loading: false }));
  },

  onReplyInput(e) {
    this.setData({ replyText: e.detail.value });
  },

  submitReply() {
    const { id, replyText, submitting } = this.data;
    if (submitting || !replyText.trim()) return;
    this.setData({ submitting: true });
    apiExt.addDiscussionReply(id, replyText.trim())
      .then(() => {
        wx.showToast({ title: '回复成功', icon: 'success' });
        this.setData({ replyText: '' });
        this.loadDetail();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '回复失败', icon: 'none' });
      })
      .finally(() => this.setData({ submitting: false }));
  },
});
