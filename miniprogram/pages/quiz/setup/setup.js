const api = require('../../../utils/api.js');
const apiExt = require('../../../utils/api-ext.js');
const authHelper = require('../../../utils/auth-helper.js');
const config = require('../../../utils/config.js');

const PREFS_KEY = 'gt_quiz_setup_prefs';
const SIZE_OPTIONS = [5, 10, 15, 20, 30, 50];
const DIFFICULTY_OPTIONS = ['', '1', '2', '3', '4', '5'];
const DIFFICULTY_LABELS = ['不限', '1 - 容易', '2 - 较易', '3 - 中等', '4 - 较难', '5 - 困难'];
const ALL_BANK = { _id: '', id: '', name: '全部题库', questionCount: null };

Page({
  data: {
    isLoggedIn: false,
    loadingBanks: false,
    starting: false,
    banks: [],
    bankNames: [],
    bankIndex: 0,
    selectedBankDesc: '',
    subjects: [{ code: '', name: '全部学科' }],
    subjectNames: ['全部学科'],
    subjectIndex: 0,
    sizeIndex: 4,
    sizeLabels: SIZE_OPTIONS.map((n) => `${n} 题`),
    difficultyIndex: 0,
    difficultyLabels: DIFFICULTY_LABELS,
  },

  onLoad(options) {
    this.presetBankId = (options && options.bankId) || '';
  },

  onShow() {
    if (!authHelper.ensureProfileComplete()) return;
    this.checkLoginAndLoad();
  },

  loadPrefs() {
    try {
      return wx.getStorageSync(PREFS_KEY) || {};
    } catch (e) {
      return {};
    }
  },

  savePrefs() {
    const { bankIndex, sizeIndex, difficultyIndex, subjectIndex } = this.data;
    wx.setStorageSync(PREFS_KEY, { bankIndex, sizeIndex, difficultyIndex, subjectIndex });
  },

  checkLoginAndLoad() {
    const token = wx.getStorageSync('token');
    if (!token || config.USE_VIRTUAL_LOGIN || api.isVirtualToken()) {
      this.setData({ isLoggedIn: false, banks: [], bankNames: [] });
      return;
    }
    const prefs = this.loadPrefs();
    this.setData({
      isLoggedIn: true,
      sizeIndex: prefs.sizeIndex != null ? prefs.sizeIndex : 4,
      difficultyIndex: prefs.difficultyIndex != null ? prefs.difficultyIndex : 0,
      subjectIndex: prefs.subjectIndex != null ? prefs.subjectIndex : 0,
    });
    this.presetBankId = prefs.bankId || '';
    this.loadBanks();
    this.loadSubjects();
  },

  loadSubjects() {
    apiExt.getSubjectTree()
      .then((tree) => {
        const flat = apiExt.flattenSubjects(tree, []);
        const subjects = [{ code: '', name: '全部学科' }].concat(flat);
        this.setData({
          subjects,
          subjectNames: subjects.map((s) => s.name),
        });
      })
      .catch(() => {});
  },

  loadBanks() {
    this.setData({ loadingBanks: true });
    api.ensureValidAccessToken()
      .then(() => api.getQuestionBanks({ limit: 100 }))
      .then((banks) => {
        const list = [ALL_BANK].concat(Array.isArray(banks) ? banks : []);
        const bankNames = list.map((b) => {
          if (!b._id && !b.id) return '全部题库';
          const count = b.questionCount != null ? b.questionCount : '?';
          return `${b.name || '未命名题库'}（${count} 题）`;
        });
        let bankIndex = 0;
        if (this.presetBankId) {
          const idx = list.findIndex((b) => String(b._id || b.id) === String(this.presetBankId));
          if (idx >= 0) bankIndex = idx;
        } else {
          const prefs = this.loadPrefs();
          if (prefs.bankIndex != null && prefs.bankIndex < list.length) {
            bankIndex = prefs.bankIndex;
          }
        }
        const selected = list[bankIndex] || list[0];
        this.setData({
          loadingBanks: false,
          banks: list,
          bankNames,
          bankIndex,
          selectedBankDesc: selected ? this.buildBankDesc(selected) : '',
        });
      })
      .catch((err) => {
        const msg = (err && err.message) || '';
        if (msg.indexOf('登录') >= 0 || msg.indexOf('过期') >= 0) {
          authHelper.clearSession();
          this.setData({ isLoggedIn: false, loadingBanks: false });
          wx.showToast({ title: '请重新登录', icon: 'none' });
          return;
        }
        this.setData({ loadingBanks: false, banks: [ALL_BANK], bankNames: ['全部题库'] });
        wx.showToast({ title: msg || '加载题库失败', icon: 'none' });
      });
  },

  buildBankDesc(bank) {
    if (!bank || (!bank._id && !bank.id)) {
      return '从所有公开题库中随机抽题，与 Web 练习模式一致';
    }
    const parts = [];
    if (bank.description) parts.push(String(bank.description).slice(0, 60));
    if (bank.subjectCode && bank.subjectCode.name) {
      parts.push(`学科：${bank.subjectCode.name}`);
    }
    return parts.join(' · ');
  },

  reloadBanks() {
    this.loadBanks();
  },

  onBankChange(e) {
    const bankIndex = Number(e.detail.value) || 0;
    const bank = this.data.banks[bankIndex];
    this.setData({
      bankIndex,
      selectedBankDesc: bank ? this.buildBankDesc(bank) : '',
    });
    this.savePrefs();
  },

  onSizeChange(e) {
    this.setData({ sizeIndex: Number(e.detail.value) || 0 });
    this.savePrefs();
  },

  onDifficultyChange(e) {
    this.setData({ difficultyIndex: Number(e.detail.value) || 0 });
    this.savePrefs();
  },

  onSubjectChange(e) {
    this.setData({ subjectIndex: Number(e.detail.value) || 0 });
    this.savePrefs();
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  startQuiz() {
    const userId = authHelper.getUserId();
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const bank = this.data.banks[this.data.bankIndex];
    if (!bank) {
      wx.showToast({ title: '请选择题库', icon: 'none' });
      return;
    }

    const bankId = bank._id || bank.id;
    const size = SIZE_OPTIONS[this.data.sizeIndex] || 10;
    const difficulty = DIFFICULTY_OPTIONS[this.data.difficultyIndex] || '';
    const subject = this.data.subjects[this.data.subjectIndex];
    const subjectCode = subject && subject.code ? subject.code : undefined;

    const payload = {
      userId,
      size,
      difficulty: difficulty || undefined,
      subjectCode,
    };
    if (bankId) payload.bankId = String(bankId);

    wx.setStorageSync(PREFS_KEY, {
      bankIndex: this.data.bankIndex,
      bankId: bankId || '',
      sizeIndex: this.data.sizeIndex,
      difficultyIndex: this.data.difficultyIndex,
      subjectIndex: this.data.subjectIndex,
    });

    this.setData({ starting: true });
    api.ensureValidAccessToken()
      .then(() => api.startQuizSession(payload))
      .then((res) => {
        const sessionId = res && (res.id || res._id);
        if (!sessionId) throw new Error('创建练习失败');
        wx.navigateTo({ url: `/pages/quiz/session/session?id=${sessionId}` });
      })
      .catch((err) => {
        wx.showToast({
          title: (err && err.message) || '开始练习失败',
          icon: 'none',
          duration: 2500,
        });
      })
      .finally(() => {
        this.setData({ starting: false });
      });
  },
});
