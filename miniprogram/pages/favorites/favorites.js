const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');
const quizLaunch = require('../../utils/quiz-launch.js');
const quizHelper = require('../../utils/quiz-helper.js');

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    folders: [],
    folderIndex: 0,
    folderNames: [],
    items: [],
    stats: null,
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    Promise.all([
      apiExt.getFavoriteFolders().catch(() => ({ folders: [] })),
      apiExt.getFavoriteStats().catch(() => null),
    ]).then(([folderRes, stats]) => {
      const folders = folderRes.folders || folderRes.items || folderRes || [];
      const list = Array.isArray(folders) ? folders : [];
      const folderNames = list.length
        ? list.map((f) => f.name || '收藏夹')
        : ['默认收藏'];
      this.setData({
        folders: list.length ? list : [{ _id: '', name: '默认收藏' }],
        folderNames,
        folderIndex: 0,
        stats,
        loading: false,
      });
      return this.loadFavorites();
    }).catch((err) => {
      this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
    });
  },

  loadFavorites() {
    const folder = this.data.folders[this.data.folderIndex];
    const folderId = folder && (folder._id || folder.id);
    return apiExt.getFavorites({ folderId: folderId || undefined, limit: 30 })
      .then((data) => {
        const items = (data.items || []).map((item) => {
          const q = item.question || {};
          return {
            id: item._id || item.questionId,
            questionId: item.questionId && (item.questionId._id || item.questionId) || item.questionId,
            title: quizHelper.stripHtml(q.content || q.title || '收藏题目').slice(0, 48),
          };
        });
        this.setData({ items });
      });
  },

  onFolderChange(e) {
    this.setData({ folderIndex: Number(e.detail.value) || 0 }, () => this.loadFavorites());
  },

  practiceFolder() {
    const folder = this.data.folders[this.data.folderIndex];
    const folderId = folder && (folder._id || folder.id);
    quizLaunch.launchFavoritePractice(folderId);
  },

  practiceOne(e) {
    quizLaunch.launchSingleQuestion(e.currentTarget.dataset.qid);
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
