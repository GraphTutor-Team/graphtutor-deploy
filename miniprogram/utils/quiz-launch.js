/**
 * 从题目 ID 列表一键创建练习会话并跳转答题页
 */
const api = require('./api.js');
const authHelper = require('./auth-helper.js');

function extractQuestionId(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (item.questionId != null && item.questionId !== '') {
    const nested = item.questionId;
    if (typeof nested === 'object') {
      return String(nested._id || nested.id || '');
    }
    return String(nested);
  }
  return String(item._id || item.id || '');
}

function launchQuizWithIds(questionIds) {
  const ids = (questionIds || []).map((id) => String(id)).filter(Boolean);
  if (!ids.length) {
    wx.showToast({ title: '暂无可用题目', icon: 'none' });
    return Promise.resolve(false);
  }

  const userId = authHelper.getUserId();
  if (!userId) {
    wx.navigateTo({ url: '/pages/login/login' });
    return Promise.resolve(false);
  }

  wx.showLoading({ title: '准备题目…', mask: true });
  return api.ensureValidAccessToken()
    .then(() => api.startQuizSession({ userId, questionIds: ids }))
    .then((res) => {
      const sessionId = res && (res.id || res._id);
      if (!sessionId) throw new Error('创建练习失败');
      wx.navigateTo({ url: `/pages/quiz/session/session?id=${sessionId}` });
      return true;
    })
    .catch((err) => {
      wx.showToast({
        title: (err && err.message) || '开始练习失败',
        icon: 'none',
        duration: 2500,
      });
      return false;
    })
    .finally(() => {
      wx.hideLoading();
    });
}

function launchTodayReview() {
  return api.ensureValidAccessToken()
    .then(() => api.getTodayReviewQuestions({ limit: 50 }))
    .then((data) => {
      const items = (data && data.questions) || [];
      const ids = items.map(extractQuestionId).filter(Boolean);
      if (!ids.length) {
        wx.showToast({ title: '今日暂无待复习题目', icon: 'none' });
        return false;
      }
      return launchQuizWithIds(ids);
    });
}

function launchRecommendedPractice(limit) {
  return api.ensureValidAccessToken()
    .then(() => api.getRecommendedQuestions({
      limit: limit || 10,
      includeReasons: false,
    }))
    .then((list) => {
      const ids = (list || []).map((q) => q._id || q.id).filter(Boolean);
      if (!ids.length) {
        wx.showToast({ title: '暂无推荐题目', icon: 'none' });
        return false;
      }
      return launchQuizWithIds(ids);
    });
}

function launchWrongPractice(options) {
  const p = options || {};
  return api.ensureValidAccessToken()
    .then(() => api.getWrongQuestions({
      limit: p.limit || 20,
      masteryStatus: p.masteryStatus || 'unmastered',
      sortBy: 'lastErrorAt',
      sortOrder: 'desc',
    }))
    .then((data) => {
      const items = (data && data.items) || [];
      const ids = items.map(extractQuestionId).filter(Boolean);
      if (!ids.length) {
        wx.showToast({ title: '暂无待巩固错题', icon: 'none' });
        return false;
      }
      return launchQuizWithIds(ids);
    });
}

function launchSingleQuestion(questionId) {
  if (!questionId) {
    wx.showToast({ title: '题目无效', icon: 'none' });
    return Promise.resolve(false);
  }
  return launchQuizWithIds([questionId]);
}

function launchDailyChallenge() {
  const apiExt = require('./api-ext.js');
  return apiExt.getDailyChallenge()
    .then((data) => {
      const ids = (data && data.questionIds) || [];
      if (!ids.length) {
        wx.showToast({ title: '今日挑战暂无题目', icon: 'none' });
        return false;
      }
      return launchQuizWithIds(ids);
    });
}

function launchFavoritePractice(folderId) {
  const apiExt = require('./api-ext.js');
  return apiExt.getFavorites({ folderId, limit: 30 })
    .then((data) => {
      const items = (data && data.items) || [];
      const ids = items.map((item) => {
        const q = item.question || item.questionId;
        if (q && typeof q === 'object') return q._id || q.id;
        return item.questionId;
      }).filter(Boolean);
      if (!ids.length) {
        wx.showToast({ title: '收藏夹暂无题目', icon: 'none' });
        return false;
      }
      return launchQuizWithIds(ids);
    });
}

function launchPathPractice(nodeKey, limit) {
  if (!nodeKey) {
    wx.showToast({ title: '知识点无效', icon: 'none' });
    return Promise.resolve(false);
  }
  return api.ensureValidAccessToken()
    .then(() => api.getRecommendedQuestions({
      knowledgeNodeId: nodeKey,
      limit: limit || 10,
      includeReasons: false,
    }))
    .then((list) => {
      const ids = (list || []).map((q) => q._id || q.id).filter(Boolean);
      if (!ids.length) {
        wx.showToast({ title: '该知识点暂无推荐题', icon: 'none' });
        return false;
      }
      return launchQuizWithIds(ids);
    });
}

function launchReviewPlan(planId) {
  const apiExt = require('./api-ext.js');
  return apiExt.executeReviewPlan(planId)
    .then((data) => {
      const fromApi = (data && data.questionIds) || [];
      const items = (data && data.questions) || [];
      const ids = (fromApi.length ? fromApi : items.map(extractQuestionId))
        .map((id) => String(id))
        .filter(Boolean);
      if (!ids.length) {
        wx.showToast({ title: '今日暂无复习题目', icon: 'none' });
        return false;
      }
      return launchQuizWithIds(ids);
    });
}

module.exports = {
  extractQuestionId,
  launchQuizWithIds,
  launchTodayReview,
  launchRecommendedPractice,
  launchWrongPractice,
  launchSingleQuestion,
  launchDailyChallenge,
  launchFavoritePractice,
  launchPathPractice,
  launchReviewPlan,
};
