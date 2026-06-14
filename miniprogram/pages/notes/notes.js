const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const quizHelper = require('../../utils/quiz-helper.js');
const homeApi = require('../../utils/home-api.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    tab: 'mine',
    items: [],
    publicItems: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true });
    Promise.all([
      apiExt.getNotes({ limit: 30 }),
      apiExt.getPublicNotes({ limit: 20 }),
    ]).then(([mine, pub]) => {
      const mapItem = (n) => ({
        id: n._id || n.id,
        title: quizHelper.stripHtml(n.title || n.content || '笔记').slice(0, 40) || '无标题',
        timeText: homeApi.formatTimeAgo(n.updatedAt || n.createdAt),
        isPublic: !!n.isPublic,
      });
      this.setData({
        loading: false,
        items: ((mine && mine.items) || mine || []).map(mapItem),
        publicItems: ((pub && pub.items) || pub || []).map(mapItem),
      });
    }).catch(() => this.setData({ loading: false }));
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  openNote(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/notes/detail/detail?id=${id}` });
  },

  createNote() {
    wx.navigateTo({ url: '/pages/notes/edit/edit' });
  },

  goLogin() { featurePage.goLogin(); },
});
