const api = require('../../utils/api.js');
const quizHelper = require('../../utils/quiz-helper.js');

Page({
  data: {
    loading: true,
    sessionId: '',
    acc: 0,
    correct: 0,
    total: 0,
    items: [],
  },

  onLoad(options) {
    const sessionId = options && options.id ? options.id : '';
    this.setData({
      sessionId,
      acc: parseInt(options && options.acc, 10) || 0,
      correct: parseInt(options && options.correct, 10) || 0,
      total: parseInt(options && options.total, 10) || 0,
    });
    if (!sessionId) {
      this.setData({ loading: false });
      return;
    }
    this.loadDetail(sessionId);
  },

  loadDetail(sessionId) {
    api.ensureValidAccessToken()
      .then(() => api.getQuizSession(sessionId, true))
      .then((session) => {
        const answersMap = {};
        (session.answers || []).forEach((a) => {
          answersMap[String(a.questionId)] = a;
        });
        const items = (session.questions || []).map((q, idx) => {
          const qid = String(q.id || q._id);
          const ans = answersMap[qid];
          const isCorrect = ans && ans.isCorrect;
          return {
            index: idx,
            num: idx + 1,
            title: quizHelper.stripHtml(q.content).slice(0, 36),
            status: isCorrect ? '正确' : (ans ? '错误' : '未答'),
            statusClass: isCorrect ? 'ok' : (ans ? 'bad' : 'empty'),
          };
        });
        this.setData({
          loading: false,
          items,
          correct: session.totalCorrect != null ? session.totalCorrect : this.data.correct,
          total: session.totalQuestions || this.data.total,
        });
      })
      .catch(() => this.setData({ loading: false }));
  },

  goExamAgain() {
    wx.redirectTo({ url: '/pages/exam/setup/setup' });
  },

  goHistory() {
    wx.redirectTo({ url: '/pages/history/history' });
  },

  goReview() {
    const { sessionId } = this.data;
    if (!sessionId) return;
    wx.redirectTo({ url: `/pages/quiz/session/session?id=${sessionId}&review=1` });
  },

  openQuestion(e) {
    const index = Number(e.currentTarget.dataset.index);
    const { sessionId } = this.data;
    if (!sessionId || Number.isNaN(index)) return;
    wx.redirectTo({
      url: `/pages/quiz/session/session?id=${sessionId}&review=1&index=${index}`,
    });
  },
});
