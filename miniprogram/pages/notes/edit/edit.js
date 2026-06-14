const apiExt = require('../../../utils/api-ext.js');

Page({
  data: {
    noteId: '',
    title: '',
    content: '',
    isPublic: false,
    saving: false,
  },

  onLoad(options) {
    const noteId = options && options.id;
    if (noteId) {
      this.setData({ noteId });
      wx.setNavigationBarTitle({ title: '编辑笔记' });
      apiExt.getNoteDetail(noteId).then((note) => {
        this.setData({
          title: note.title || '',
          content: note.content || note.body || '',
          isPublic: !!note.isPublic,
        });
      }).catch(() => {
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
    } else {
      wx.setNavigationBarTitle({ title: '新建笔记' });
    }
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onPublicChange(e) { this.setData({ isPublic: !!e.detail.value }); },

  saveNote() {
    const { noteId, title, content, isPublic } = this.data;
    if (!title.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!content.trim()) {
      wx.showToast({ title: '请填写内容', icon: 'none' });
      return;
    }
    const payload = {
      type: 'general',
      title: title.trim(),
      content: content.trim(),
      isPublic,
    };
    this.setData({ saving: true });
    const req = noteId
      ? apiExt.updateNote(noteId, payload)
      : apiExt.createNote(payload);
    req.then(() => {
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 500);
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
    }).finally(() => this.setData({ saving: false }));
  },
});
