const api = require('../../../utils/api.js');
const authHelper = require('../../../utils/auth-helper.js');
const quizHelper = require('../../../utils/quiz-helper.js');

Page({
  data: {
    sessionId: '',
    loading: true,
    loadError: '',
    submitting: false,
    finished: false,
    questions: [],
    answers: {},
    answerMeta: {},
    currentIndex: 0,
    totalCount: 0,
    currentQuestion: null,
    currentContent: '',
    currentOptions: [],
    fillBlanks: [],
    shortAnswer: '',
    currentExplain: '',
    reviewVerdict: '',
    reviewVerdictClass: '',
    typeText: '',
    isCoding: false,
    isFill: false,
    isShort: false,
    isLast: false,
    progressPercent: 0,
    resultCorrect: 0,
    resultTotal: 0,
    resultAcc: 0,
    reviewMode: false,
    readonly: false,
    examMode: false,
    limitMin: 0,
    timeText: '00:00',
    showSheet: false,
    sheetItems: [],
    answeredCount: 0,
  },

  questionStartAt: 0,
  reviewMode: false,
  examMode: false,
  limitMin: 0,
  startTime: 0,
  timerHandle: null,
  initialIndex: 0,

  onLoad(options) {
    const sessionId = options && options.id ? options.id : '';
    this.reviewMode = !!(options && options.review === '1');
    this.examMode = !!(options && options.exam === '1');
    this.limitMin = parseInt(options && options.limitMin, 10) || 0;
    const idx = parseInt(options && options.index, 10);
    this.initialIndex = Number.isNaN(idx) ? 0 : idx;
    this.setData({
      sessionId,
      reviewMode: this.reviewMode,
      readonly: this.reviewMode,
      examMode: this.examMode,
      limitMin: this.limitMin,
    });
    if (this.reviewMode) wx.setNavigationBarTitle({ title: '逐题回顾' });
    if (!sessionId) {
      this.setData({ loading: false, loadError: '缺少练习会话 ID' });
      return;
    }
    if (!authHelper.ensureProfileComplete()) return;
    this.reloadSession();
  },

  onUnload() {
    this.clearTimer();
  },

  clearTimer() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  },

  startTimer() {
    if (!this.examMode) return;
    this.startTime = Date.now();
    this.clearTimer();
    this.timerHandle = setInterval(() => this.tickTimer(), 1000);
    this.tickTimer();
  },

  tickTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    this.setData({ timeText: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` });
    if (this.limitMin > 0 && elapsed >= this.limitMin * 60) {
      this.clearTimer();
      wx.showToast({ title: '时间到，自动交卷', icon: 'none' });
      this.submitExam(true);
    }
  },

  reloadSession() {
    const { sessionId } = this.data;
    if (!sessionId) return;

    this.setData({ loading: true, loadError: '', finished: false });
    api.ensureValidAccessToken()
      .then(() => api.getQuizSession(sessionId, this.reviewMode))
      .then((session) => {
        if (!session) throw new Error('会话不存在');
        if (session.status === 'finished' && !this.reviewMode) {
          this.showFinishedResult(session);
          return;
        }
        const questions = session.questions || [];
        const answers = {};
        const answerMeta = {};
        (session.answers || []).forEach((a) => {
          const qid = String(a.questionId);
          answers[qid] = a.userAnswer !== undefined ? a.userAnswer : a.answerIndex;
          answerMeta[qid] = { isCorrect: !!a.isCorrect, answered: true };
        });
        const startIndex = questions.length
          ? Math.min(Math.max(this.initialIndex, 0), questions.length - 1)
          : 0;
        this.setData({
          loading: false,
          questions,
          answers,
          answerMeta,
          totalCount: questions.length,
          currentIndex: startIndex,
        });
        if (session.status === 'finished' && this.reviewMode) {
          const total = session.totalQuestions || questions.length;
          const correct = session.totalCorrect != null ? session.totalCorrect : 0;
          this.setData({
            resultTotal: total,
            resultCorrect: correct,
            resultAcc: total > 0 ? Math.round((correct * 100) / total) : 0,
          });
        }
        this.questionStartAt = Date.now();
        this.renderCurrent();
        this.updateSheet();
        if (this.examMode) {
          wx.setNavigationBarTitle({ title: '考试中' });
          this.startTimer();
        }
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
      });
  },

  countAnswered() {
    const { questions, answers } = this.data;
    return questions.filter((q) => {
      const qid = quizHelper.normalizeQuestionId(q);
      const selected = quizHelper.getSelectedAnswer(answers, qid);
      return quizHelper.hasValidSelection(q.type || 'single', selected);
    }).length;
  },

  updateSheet() {
    const { questions, answers, answerMeta, reviewMode } = this.data;
    const sheetItems = questions.map((q, index) => {
      const qid = quizHelper.normalizeQuestionId(q);
      const selected = quizHelper.getSelectedAnswer(answers, qid);
      const type = q.type || 'single';
      const answered = quizHelper.hasValidSelection(type, selected);
      const meta = answerMeta[qid];
      let reviewClass = '';
      if (reviewMode && meta) reviewClass = meta.isCorrect ? 'ok' : 'bad';
      return { index, num: index + 1, answered, reviewClass };
    });
    this.setData({ sheetItems, answeredCount: this.countAnswered() });
  },

  renderCurrent() {
    const { questions, answers, answerMeta, currentIndex, totalCount, reviewMode } = this.data;
    const question = questions[currentIndex];
    if (!question) {
      this.setData({ currentQuestion: null });
      return;
    }

    const qid = quizHelper.normalizeQuestionId(question);
    const selected = quizHelper.getSelectedAnswer(answers, qid);
    const type = question.type || 'single';
    const meta = answerMeta[qid];
    const explain = reviewMode ? quizHelper.stripHtml(question.explain || '') : '';
    let reviewVerdict = '';
    let reviewVerdictClass = '';
    if (reviewMode) {
      if (meta && meta.isCorrect) {
        reviewVerdict = '回答正确';
        reviewVerdictClass = 'ok';
      } else if (meta && meta.answered) {
        reviewVerdict = '回答错误';
        reviewVerdictClass = 'bad';
      } else {
        reviewVerdict = '未作答';
        reviewVerdictClass = 'empty';
      }
    }

    const options = quizHelper.normalizeOptions(question);
    this.setData({
      currentQuestion: question,
      currentContent: quizHelper.stripHtml(question.content),
      currentOptions: options.map((text, index) => {
        const optSelected = quizHelper.isOptionSelected(selected, index, type);
        const isCorrect = reviewMode && quizHelper.isCorrectOption(question, index);
        const isWrong = reviewMode && optSelected && !quizHelper.isCorrectOption(question, index);
        return {
          index,
          label: quizHelper.optionLabel(index),
          text: quizHelper.stripHtml(text),
          selected: optSelected,
          isCorrect,
          isWrong,
        };
      }),
      fillBlanks: type === 'fill' ? quizHelper.buildFillBlanks(question, selected) : [],
      shortAnswer: type === 'short' && typeof selected === 'string' ? selected : '',
      currentExplain: explain,
      reviewVerdict,
      reviewVerdictClass,
      typeText: quizHelper.typeLabel(type),
      isCoding: type === 'coding',
      isFill: type === 'fill',
      isShort: type === 'short',
      isLast: currentIndex >= totalCount - 1,
      progressPercent: totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0,
    });
    this.questionStartAt = Date.now();
  },

  onSelectOption(e) {
    if (this.data.readonly) return;
    const index = Number(e.currentTarget.dataset.index);
    const question = this.data.currentQuestion;
    if (!question || question.type === 'coding' || question.type === 'fill' || question.type === 'short') return;

    const qid = quizHelper.normalizeQuestionId(question);
    const type = question.type || 'single';
    const prev = quizHelper.getSelectedAnswer(this.data.answers, qid);
    const next = quizHelper.toggleAnswer(prev, index, type);
    const answers = Object.assign({}, this.data.answers, { [qid]: next });

    this.setData({ answers }, () => {
      this.renderCurrent();
      this.updateSheet();
    });
  },

  onFillInput(e) {
    if (this.data.readonly) return;
    const blankIndex = Number(e.currentTarget.dataset.index);
    const question = this.data.currentQuestion;
    if (!question || question.type !== 'fill') return;
    const qid = quizHelper.normalizeQuestionId(question);
    const prev = quizHelper.getSelectedAnswer(this.data.answers, qid);
    const arr = Array.isArray(prev) ? prev.slice() : [];
    arr[blankIndex] = (e.detail && e.detail.value) || '';
    const answers = Object.assign({}, this.data.answers, { [qid]: arr });
    const fillBlanks = quizHelper.buildFillBlanks(question, arr);
    this.setData({ answers, fillBlanks }, () => this.updateSheet());
  },

  onShortInput(e) {
    if (this.data.readonly) return;
    const question = this.data.currentQuestion;
    if (!question || question.type !== 'short') return;
    const qid = quizHelper.normalizeQuestionId(question);
    const value = (e.detail && e.detail.value) || '';
    const answers = Object.assign({}, this.data.answers, { [qid]: value });
    this.setData({ answers, shortAnswer: value }, () => this.updateSheet());
  },

  skipCoding() {
    if (this.data.readonly || !this.data.isCoding) return;
    if (this.data.currentIndex >= this.data.totalCount - 1) {
      if (!this.data.examMode && !this.reviewMode) this.finishPracticeSession();
      return;
    }
    this.setData({ currentIndex: this.data.currentIndex + 1 }, () => this.renderCurrent());
  },

  goPrev() {
    if (this.data.currentIndex <= 0 || this.data.submitting) return;
    this.setData({ currentIndex: this.data.currentIndex - 1 }, () => this.renderCurrent());
  },

  validateCurrentAnswer() {
    const { currentQuestion, answers } = this.data;
    if (!currentQuestion) return false;
    const type = currentQuestion.type || 'single';
    const qid = quizHelper.normalizeQuestionId(currentQuestion);
    const selected = quizHelper.getSelectedAnswer(answers, qid);
    if (!quizHelper.hasValidSelection(type, selected)) {
      wx.showToast({ title: quizHelper.selectionHint(type), icon: 'none' });
      return false;
    }
    return true;
  },

  advancePractice() {
    if (this.data.isLast) {
      this.finishPracticeSession();
      return;
    }
    this.setData({ currentIndex: this.data.currentIndex + 1 }, () => {
      this.renderCurrent();
      this.updateSheet();
    });
  },

  goNext() {
    if (this.data.readonly) {
      if (this.data.currentIndex >= this.data.totalCount - 1) return;
      this.setData({ currentIndex: this.data.currentIndex + 1 }, () => this.renderCurrent());
      return;
    }
    if (this.data.examMode) {
      if (this.data.currentIndex >= this.data.totalCount - 1) return;
      this.setData({ currentIndex: this.data.currentIndex + 1 }, () => this.renderCurrent());
      return;
    }
    if (!this.validateCurrentAnswer()) return;
    this.advancePractice();
  },

  buildBatchAnswers() {
    const { questions, answers } = this.data;
    const userId = authHelper.getUserId();
    const payloads = [];
    questions.forEach((q) => {
      const type = q.type || 'single';
      const qid = quizHelper.normalizeQuestionId(q);
      const selected = quizHelper.getSelectedAnswer(answers, qid);
      if (!quizHelper.hasValidSelection(type, selected)) return;
      q._timeSpentMs = 0;
      payloads.push(quizHelper.buildAnswerPayload(q, selected, userId));
    });
    return payloads;
  },

  finishPracticeSession() {
    if (this.data.submitting) return;
    const { sessionId } = this.data;
    const batch = this.buildBatchAnswers();
    if (!batch.length) {
      wx.showToast({ title: '请至少完成一题', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中…', mask: true });
    api.submitSessionAnswers(sessionId, { userId: authHelper.getUserId(), answers: batch })
      .then(() => api.finishQuizSession(sessionId))
      .then((result) => {
        this.showFinishedResult({
          totalQuestions: result.total,
          totalCorrect: result.correct,
          acc: result.acc,
        });
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ submitting: false });
        this.updateSheet();
      });
  },

  confirmSubmitExam() {
    wx.showModal({
      title: '交卷',
      content: '确定要交卷吗？未作答题目将不计分。',
      success: (res) => {
        if (res.confirm) this.submitExam(true);
      },
    });
  },

  submitExam(force) {
    if (this.data.submitting) return;
    if (!force && this.data.examMode) {
      this.confirmSubmitExam();
      return;
    }
    const { sessionId } = this.data;
    const batch = this.buildBatchAnswers();
    this.clearTimer();
    this.setData({ submitting: true });
    wx.showLoading({ title: '交卷中…', mask: true });

    const submitChain = batch.length
      ? api.submitSessionAnswers(sessionId, { userId: authHelper.getUserId(), answers: batch })
      : Promise.resolve({ ok: true });

    submitChain
      .then(() => api.finishQuizSession(sessionId))
      .then((result) => {
        this.showFinishedResult({
          totalQuestions: result.total,
          totalCorrect: result.correct,
          acc: result.acc,
        });
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '交卷失败', icon: 'none' });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ submitting: false });
      });
  },

  toggleSheet() {
    this.setData({ showSheet: !this.data.showSheet });
  },

  jumpToQuestion(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({ currentIndex: index, showSheet: false }, () => this.renderCurrent());
  },

  showFinishedResult(sessionOrResult) {
    const total = (sessionOrResult && (sessionOrResult.totalQuestions || sessionOrResult.total)) || 0;
    const correct = (sessionOrResult && (sessionOrResult.totalCorrect || sessionOrResult.correct)) || 0;
    let acc = sessionOrResult && sessionOrResult.acc;
    if (acc == null && total > 0) acc = Math.round((correct * 100) / total);

    if (this.examMode) {
      wx.redirectTo({
        url: `/pages/result/result?id=${this.data.sessionId}&acc=${acc || 0}&correct=${correct}&total=${total}`,
      });
      return;
    }

    this.setData({
      loading: false,
      finished: true,
      currentQuestion: null,
      resultTotal: total,
      resultCorrect: correct,
      resultAcc: acc != null ? acc : 0,
    });
    wx.setNavigationBarTitle({ title: '练习结果' });
  },

  goReview() {
    wx.redirectTo({ url: `/pages/quiz/session/session?id=${this.data.sessionId}&review=1` });
  },

  goSetupAgain() {
    wx.redirectTo({ url: this.data.examMode ? '/pages/exam/setup/setup' : '/pages/quiz/setup/setup' });
  },

  goPracticeTab() {
    wx.switchTab({ url: '/pages/practice/practice' });
  },
});
