const api = require('../../utils/api.js');
const authHelper = require('../../utils/auth-helper.js');
const { ICON } = require('../../utils/icons.js');

const roleMap = { student: '学生', question_manager: '出题负责人', admin: '管理员', user: '用户' };

Page({
  data: {
    icons: ICON,
    isLoggedIn: false,
    userInfo: null,
    roleText: '学生',
    userFirstChar: '用',
    needsComplete: false,
    learningCenter: [
      { title: '练习模式', desc: '选择题库开始刷题', url: '/pages/quiz/setup/setup', iconKey: 'practice' },
      { title: '测验会话', desc: '历史测验记录', url: '/pages/history/history', iconKey: 'history' },
      { title: '考试模式', desc: '计时答题与交卷', url: '/pages/exam/setup/setup', iconKey: 'history' },
      { title: '知识图谱', desc: '掌握度与路径推荐', url: '/pages/graph/graph', iconKey: 'graph' },
    ],
    learningTools: [
      { title: '我的收藏', desc: '收藏夹题目练习', url: '/pages/favorites/favorites', iconKey: 'favorite' },
      { title: '学习笔记', desc: '笔记列表与详情', url: '/pages/notes/notes', iconKey: 'practice' },
      { title: '学习计划', desc: '今日复习与计划', tab: '/pages/plan/plan', iconKey: 'plan' },
      { title: '每日打卡', desc: '学习计划打卡', url: '/pages/checkin/checkin', iconKey: 'plan' },
    ],
    learningAnalysis: [
      { title: '学习统计', desc: '正确率与做题趋势', url: '/pages/statistics/statistics', iconKey: 'graph' },
      { title: '学习目标', desc: '目标进度跟踪', url: '/pages/goals/goals', iconKey: 'plan' },
      { title: '学习成就', desc: '徽章与解锁进度', url: '/pages/achievements/achievements', iconKey: 'favorite' },
    ],
    socialTools: [
      { title: '消息', desc: '私信会话', url: '/pages/messages/messages', iconKey: 'notification' },
      { title: '好友管理', desc: '好友与请求', url: '/pages/friends/friends', iconKey: 'user' },
      { title: '学习社区', desc: '讨论与学习动态', url: '/pages/community/community', iconKey: 'notification' },
      { title: '排行榜', desc: '题量与正确率排名', url: '/pages/leaderboard/leaderboard', iconKey: 'user' },
    ],
    profileTools: [
      { title: '成就商城', desc: '积分兑换道具', url: '/pages/shop/shop', iconKey: 'shop' },
      { title: '通知中心', desc: '系统消息与提醒', url: '/pages/notifications/notifications', iconKey: 'notification' },
    ],
  },

  onShow() {
    if (!authHelper.ensureProfileComplete()) return;

    const app = getApp();
    const token = app.globalData.token;
    let userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.applyUser(userInfo);
      return;
    }
    if (token) {
      api.getMe().then((res) => {
        if (res && res.success && res.user) {
          userInfo = res.user;
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
          if (!authHelper.ensureProfileComplete()) return;
          this.applyUser(userInfo);
        }
      }).catch(() => {
        this.setData({ isLoggedIn: false, userInfo: null });
      });
    } else {
      this.setData({ isLoggedIn: false, userInfo: null });
    }
  },

  applyUser(userInfo) {
    const name = userInfo.name || userInfo.email || '用';
    this.setData({
      isLoggedIn: true,
      userInfo,
      needsComplete: authHelper.needsProfileCompletion(userInfo),
      roleText: roleMap[userInfo.role] || userInfo.role || '学生',
      userFirstChar: name.charAt(0) || '用',
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  goCompleteAccount() {
    authHelper.goCompleteAccount();
  },

  onToolTap(e) {
    const url = e.currentTarget.dataset.url;
    const tab = e.currentTarget.dataset.tab;
    if (tab) {
      wx.switchTab({ url: tab });
      return;
    }
    if (url) wx.navigateTo({ url });
  },

  logout() {
    authHelper.clearSession();
    this.setData({ isLoggedIn: false, userInfo: null, needsComplete: false });
    wx.showToast({ title: '已退出', icon: 'none' });
  },
});
