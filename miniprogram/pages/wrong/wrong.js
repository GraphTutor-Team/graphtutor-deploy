const api = require('../../utils/api.js');

const pageSession = require('../../utils/page-session.js');

const quizLaunch = require('../../utils/quiz-launch.js');

const apiExt = require('../../utils/api-ext.js');

const { PAGE_BANNER_SET } = require('../../utils/image-library.js');

const { stripHtml } = require('../../utils/home-api.js');



const MASTERY_TABS = [

  { key: '', label: '全部' },

  { key: 'unmastered', label: '待巩固' },

  { key: 'learning', label: '学习中' },

  { key: 'mastered', label: '已掌握' },

];



function shortText(text, max) {

  const s = stripHtml(text || '');

  if (!s) return '';

  return s.length > max ? `${s.slice(0, max)}…` : s;

}



function extractQuestionId(item) {

  if (!item) return '';

  const nested = item.questionId;

  if (nested && typeof nested === 'object') {

    return String(nested._id || nested.id || '');

  }

  return String(item.questionId || item._id || item.id || '');

}



Page({

  data: {

    bannerImage: PAGE_BANNER_SET.wrong.imageUrl,

    bannerFallback: PAGE_BANNER_SET.wrong.fallback,

    bannerTitle: PAGE_BANNER_SET.wrong.title,

    bannerSubTitle: PAGE_BANNER_SET.wrong.subTitle,



    isLoggedIn: false,

    loading: false,

    connected: false,

    total: 0,

    unmastered: 0,

    learning: 0,

    mastered: 0,

    masteryTabs: MASTERY_TABS,

    masteryTab: '',

    items: [],

  },



  onShow() {

    pageSession.loadAuthenticatedPage(this, () => this.loadAll(), (page, data) => {

      page.setData({

        total: data.total || 0,

        unmastered: data.unmastered || 0,

        learning: data.learning || 0,

        mastered: data.mastered || 0,

        items: data.items || [],

        connected: data.connected,

      });

    });

  },



  loadAll() {

    const masteryTab = this.data.masteryTab;

    return Promise.allSettled([

      api.getWrongQuestionStats(),

      api.getWrongQuestions({

        limit: 30,

        masteryStatus: masteryTab || undefined,

        sortBy: 'lastErrorAt',

        sortOrder: 'desc',

      }),

    ]).then(([statsRes, listRes]) => {

      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;

      const rawItems = listRes.status === 'fulfilled'

        ? ((listRes.value && listRes.value.items) || [])

        : [];

      return {

        connected: statsRes.status === 'fulfilled' || listRes.status === 'fulfilled',

        total: stats && stats.total != null ? stats.total : 0,

        unmastered: stats && stats.unmastered != null ? stats.unmastered : 0,

        learning: stats && stats.learning != null ? stats.learning : 0,

        mastered: stats && stats.mastered != null ? stats.mastered : 0,

        items: rawItems.map((item) => ({

          id: item._id || item.questionId,

          questionId: extractQuestionId(item),

          title: shortText(

            (item.question && (item.question.content || item.question.title)) || '错题',

            40

          ),

          errorCount: item.errorCount || 0,

          masteryStatus: item.masteryStatus || '',

        })),

      };

    });

  },



  switchMasteryTab(e) {

    const masteryTab = e.currentTarget.dataset.key;

    if (masteryTab === this.data.masteryTab) return;

    this.setData({ masteryTab, loading: true });

    pageSession.loadAuthenticatedPage(this, () => this.loadAll(), (page, data) => {

      page.setData({

        loading: false,

        items: data.items || [],

        connected: data.connected,

      });

    });

  },



  goReviewPlans() {

    wx.navigateTo({ url: '/pages/review-plans/review-plans' });

  },



  reload() {

    this.onShow();

  },



  goLogin() {

    wx.navigateTo({ url: '/pages/login/login' });

  },



  startWrongPractice() {

    if (!this.data.isLoggedIn) {

      this.goLogin();

      return;

    }

    quizLaunch.launchWrongPractice({ limit: 20, masteryStatus: 'unmastered' });

  },



  startSingleWrong(e) {

    if (!this.data.isLoggedIn) {

      this.goLogin();

      return;

    }

    const questionId = e.currentTarget.dataset.qid;

    quizLaunch.launchSingleQuestion(questionId);

  },



  markMastered(e) {

    if (!this.data.isLoggedIn) return;

    const questionId = e.currentTarget.dataset.qid;

    if (!questionId) return;

    apiExt.markWrongQuestionMastered(questionId)

      .then(() => {

        wx.showToast({ title: '已标记掌握', icon: 'success' });

        this.onShow();

      })

      .catch((err) => {

        wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });

      });

  },



  onBannerError() {

    this.setData({ bannerImage: this.data.bannerFallback });

  },

});

