const api = require('../../../utils/api.js');
const apiExt = require('../../../utils/api-ext.js');
const authHelper = require('../../../utils/auth-helper.js');
const config = require('../../../utils/config.js');

const PREFS_KEY = 'gt_exam_setup_prefs';
const ALL_BANK = { _id: '', id: '', name: '全部题库', questionCount: null };
const SIZE_OPTIONS = [10, 20, 30, 50];
const TIME_OPTIONS = [0, 15, 30, 45, 60];
const TIME_LABELS = ['不限时', '15 分钟', '30 分钟', '45 分钟', '60 分钟'];
const DIFFICULTY_OPTIONS = ['', '1', '2', '3', '4', '5'];
const DIFFICULTY_LABELS = ['不限', '1 - 容易', '2 - 较易', '3 - 中等', '4 - 较难', '5 - 困难'];

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
    sizeIndex: 1,
    sizeLabels: SIZE_OPTIONS.map((n) => `${n} 题`),
    timeIndex: 2,
    timeLabels: TIME_LABELS,
    difficultyIndex: 0,
    difficultyLabels: DIFFICULTY_LABELS,
  },

  onShow() {
    if (!authHelper.ensureProfileComplete()) return;
    const token = wx.getStorageSync('token');
    if (!token || config.USE_VIRTUAL_LOGIN || api.isVirtualToken()) {
      this.setData({ isLoggedIn: false });
      return;
    }
    const prefs = this.loadPrefs();
    this.setData({
      isLoggedIn: true,
      sizeIndex: prefs.sizeIndex != null ? prefs.sizeIndex : 1,
      timeIndex: prefs.timeIndex != null ? prefs.timeIndex : 2,
      difficultyIndex: prefs.difficultyIndex != null ? prefs.difficultyIndex : 0,
      subjectIndex: prefs.subjectIndex != null ? prefs.subjectIndex : 0,
    });
    this.presetBankId = prefs.bankId || '';
    this.loadBanks();
    this.loadSubjects();
  },

  loadPrefs() {
    try {
      return wx.getStorageSync(PREFS_KEY) || {};
    } catch (e) {
      return {};
    }
  },

  savePrefs() {
    const bank = this.data.banks[this.data.bankIndex];
    wx.setStorageSync(PREFS_KEY, {
      bankIndex: this.data.bankIndex,
      bankId: bank ? (bank._id || bank.id || '') : '',
      sizeIndex: this.data.sizeIndex,
      timeIndex: this.data.timeIndex,
      difficultyIndex: this.data.difficultyIndex,
      subjectIndex: this.data.subjectIndex,
    });
  },

  loadSubjects() {
    apiExt.getSubjectTree().then((tree) => {
      const flat = apiExt.flattenSubjects(tree, []);
      const subjects = [{ code: '', name: '全部学科' }].concat(flat);
      this.setData({ subjects, subjectNames: subjects.map((s) => s.name) });
    }).catch(() => {});
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
      .catch(() => this.setData({ loadingBanks: false, banks: [ALL_BANK], bankNames: ['全部题库'] }));
  },

  buildBankDesc(bank) {
    if (!bank || (!bank._id && !bank.id)) {
      return '从所有公开题库中随机抽题，与 Web 考试模式一致';
    }
    const parts = [];
    if (bank.description) parts.push(String(bank.description).slice(0, 60));
    return parts.join(' · ');
  },

  onBankChange(e) {
    const bankIndex = Number(e.detail.value) || 0;
    const bank = this.data.banks[bankIndex];
    this.setData({ bankIndex, selectedBankDesc: bank ? this.buildBankDesc(bank) : '' });
    this.savePrefs();
  },

  onSizeChange(e) { this.setData({ sizeIndex: Number(e.detail.value) || 0 }); this.savePrefs(); },
  onTimeChange(e) { this.setData({ timeIndex: Number(e.detail.value) || 0 }); this.savePrefs(); },
  onDifficultyChange(e) { this.setData({ difficultyIndex: Number(e.detail.value) || 0 }); this.savePrefs(); },
  onSubjectChange(e) { this.setData({ subjectIndex: Number(e.detail.value) || 0 }); this.savePrefs(); },

  goLogin() { wx.navigateTo({ url: '/pages/login/login' }); },

  startExam() {
    const userId = authHelper.getUserId();
    const bank = this.data.banks[this.data.bankIndex];
    if (!userId || !bank) {
      wx.showToast({ title: '请选择题库', icon: 'none' });
      return;
    }
    const bankId = bank._id || bank.id;
    const subject = this.data.subjects[this.data.subjectIndex];
    const limitMin = TIME_OPTIONS[this.data.timeIndex] || 0;
    const payload = {
      userId,
      size: SIZE_OPTIONS[this.data.sizeIndex] || 20,
      difficulty: DIFFICULTY_OPTIONS[this.data.difficultyIndex] || undefined,
      subjectCode: subject && subject.code ? subject.code : undefined,
    };
    if (bankId) payload.bankId = String(bankId);

    this.savePrefs();
    this.setData({ starting: true });
    api.ensureValidAccessToken()
      .then(() => api.startQuizSession(payload))
      .then((res) => {
        const sessionId = res && (res.id || res._id);
        if (!sessionId) throw new Error('创建考试失败');
        wx.navigateTo({
          url: `/pages/quiz/session/session?id=${sessionId}&exam=1&limitMin=${limitMin}`,
        });
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '开始考试失败', icon: 'none' });
      })
      .finally(() => this.setData({ starting: false }));
  },
});
