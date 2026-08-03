const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const quizHelper = require('../../utils/quiz-helper.js');
const homeApi = require('../../utils/home-api.js');

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  return (res && res.items) || [];
}

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    tab: 'discussions',
    discussions: [],
    posts: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true });
    Promise.all([
      apiExt.getDiscussions({ limit: 30 }),
      apiExt.getLearningPosts({ limit: 20 }),
    ]).then(([disc, posts]) => {
      this.setData({
        loading: false,
        discussions: normalizeList(disc).map((d) => ({
          id: d._id || d.id,
          title: quizHelper.stripHtml(d.title || '讨论').slice(0, 48),
          author: (d.author && (d.author.name || d.author.email)) || d.authorName || '用户',
          replyCount: (d.replies && d.replies.length) || d.replyCount || 0,
          timeText: homeApi.formatTimeAgo(d.createdAt),
        })),
        posts: normalizeList(posts).map((p) => ({
          id: p._id || p.id,
          title: quizHelper.stripHtml(p.title || p.content || '动态').slice(0, 48),
          author: (p.author && p.author.name) || p.authorName || '用户',
          timeText: homeApi.formatTimeAgo(p.createdAt),
        })),
      });
    }).catch(() => this.setData({ loading: false }));
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  openDiscussion(e) {
    wx.navigateTo({ url: `/pages/community/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/community/create/create' });
  },

  goLogin() { featurePage.goLogin(); },
});
