const apiExt = require('../../../utils/api-ext.js');

const quizHelper = require('../../../utils/quiz-helper.js');

const homeApi = require('../../../utils/home-api.js');



Page({

  data: { loading: true, noteId: '', title: '', content: '', timeText: '' },



  onLoad(options) {

    const id = options && options.id;

    if (!id) {

      this.setData({ loading: false });

      return;

    }

    this.setData({ noteId: id });

    apiExt.getNoteDetail(id).then((note) => {

      this.setData({

        loading: false,

        title: quizHelper.stripHtml(note.title || '笔记'),

        content: quizHelper.stripHtml(note.content || note.body || ''),

        timeText: homeApi.formatTimeAgo(note.updatedAt || note.createdAt),

      });

    }).catch(() => this.setData({ loading: false }));

  },



  editNote() {

    const id = this.data.noteId;

    if (!id) return;

    wx.navigateTo({ url: `/pages/notes/edit/edit?id=${id}` });

  },

});

