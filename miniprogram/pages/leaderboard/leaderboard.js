const apiExt = require('../../utils/api-ext.js');
const featurePage = require('../../utils/feature-page.js');

const TYPES = [
  { key: 'total', label: '总榜' },
  { key: 'questions', label: '题量' },
  { key: 'accuracy', label: '正确率' },
  { key: 'streak', label: '连续学习' },
];

const PERIODS = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
];

Page({
  data: {
    isLoggedIn: false,
    loading: true,
    loadError: '',
    typeIndex: 0,
    periodIndex: 0,
    typeLabels: TYPES.map((t) => t.label),
    periodLabels: PERIODS.map((p) => p.label),
    items: [],
  },

  onShow() {
    featurePage.requireLogin(this, () => this.loadData());
  },

  loadData() {
    this.setData({ loading: true, loadError: '' });
    const type = TYPES[this.data.typeIndex].key;
    const period = PERIODS[this.data.periodIndex].key;
    apiExt.getLeaderboard({ type, period, limit: 50 })
      .then((items) => {
        const list = (items || []).map((item, idx) => ({
          rank: item.rank != null ? item.rank : idx + 1,
          name: item.name || item.userName || item.nickname || '学习者',
          score: item.score != null ? item.score : (item.value != null ? item.value : '—'),
          isMe: !!item.isCurrentUser,
        }));
        this.setData({ loading: false, items: list });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: (err && err.message) || '加载失败' });
      });
  },

  onTypeChange(e) {
    this.setData({ typeIndex: Number(e.detail.value) || 0 }, () => this.loadData());
  },

  onPeriodChange(e) {
    this.setData({ periodIndex: Number(e.detail.value) || 0 }, () => this.loadData());
  },

  goLogin() { featurePage.goLogin(); },
  reload() { this.loadData(); },
});
