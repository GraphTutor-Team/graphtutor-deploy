/**
 * 扩展 API（对齐 Web client/src/api/v3）
 */
const api = require('./api.js');

function cleanQuery(data) {
  const out = {};
  Object.keys(data || {}).forEach((key) => {
    const val = data[key];
    if (val !== undefined && val !== null && val !== '') out[key] = val;
  });
  return out;
}

function dataOf(res) {
  if (res && res.success === false) {
    throw new Error(res.message || '请求失败');
  }
  if (res && res.data !== undefined) return res.data;
  return res;
}

function withAuth(fn) {
  return api.ensureValidAccessToken().then(fn);
}

function getAchievements(type) {
  return withAuth(() => api.request('/api/v3/achievements', {
    method: 'GET',
    data: cleanQuery({ type }),
  }).then(dataOf));
}

function getAchievementStats() {
  return withAuth(() => api.request('/api/v3/achievements/stats', { method: 'GET' }).then(dataOf));
}

function getDailyChallenge(date) {
  return withAuth(() => api.request('/api/v3/daily-challenge', {
    method: 'GET',
    data: cleanQuery({ date }),
  }).then(dataOf));
}

function getNotificationUnreadCount() {
  return withAuth(() => api.request('/api/v3/notifications/unread-count', { method: 'GET' })
    .then((res) => (res && res.data && res.data.count != null ? res.data.count : 0)));
}

function markNotificationRead(id) {
  return withAuth(() => api.request(`/api/v3/notifications/${id}/read`, { method: 'PUT' }).then(dataOf));
}

function markAllNotificationsRead(type) {
  return withAuth(() => api.request('/api/v3/notifications/read-all', {
    method: 'PUT',
    data: type ? { type } : {},
  }).then(dataOf));
}

function deleteNotification(id) {
  return withAuth(() => api.request(`/api/v3/notifications/${id}`, { method: 'DELETE' }).then(dataOf));
}

function getFavoriteFolders() {
  return withAuth(() => api.request('/api/v3/favorites/folders', { method: 'GET' }).then(dataOf));
}

function getFavorites(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/favorites', {
    method: 'GET',
    data: cleanQuery({
      folderId: p.folderId,
      page: p.page || 1,
      limit: p.limit || 30,
      searchKeyword: p.searchKeyword,
    }),
  }).then(dataOf));
}

function getFavoriteStats() {
  return withAuth(() => api.request('/api/v3/favorites/stats', { method: 'GET' }).then(dataOf));
}

function getLearningGoals(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/learning-goals', {
    method: 'GET',
    data: cleanQuery({ status: p.status, type: p.type }),
  }).then(dataOf));
}

function getLearningGoalStats() {
  return withAuth(() => api.request('/api/v3/learning-goals/stats', { method: 'GET' }).then(dataOf));
}

function getLeaderboard(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/leaderboard', {
    method: 'GET',
    data: cleanQuery({
      type: p.type || 'total',
      period: p.period || 'week',
      limit: p.limit || 50,
    }),
  }).then((res) => (res && res.data && res.data.items) || []));
}

function getFriends(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/friends', {
    method: 'GET',
    data: cleanQuery({ page: p.page || 1, limit: p.limit || 50, status: p.status || 'active' }),
  }).then(dataOf));
}

function getFriendRequests(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/friends/requests', {
    method: 'GET',
    data: cleanQuery({ type: p.type || 'received', page: p.page || 1, limit: p.limit || 20 }),
  }).then(dataOf));
}

function acceptFriendRequest(requestId) {
  return withAuth(() => api.request(`/api/v3/friends/requests/${requestId}/accept`, {
    method: 'PUT',
  }).then(dataOf));
}

function rejectFriendRequest(requestId) {
  return withAuth(() => api.request(`/api/v3/friends/requests/${requestId}/reject`, {
    method: 'PUT',
  }).then(dataOf));
}

function getReviewPlans(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/review-plans', {
    method: 'GET',
    data: cleanQuery({ status: p.status }),
  }).then(dataOf));
}

function executeReviewPlan(planId) {
  return withAuth(() => api.request(`/api/v3/review-plans/${planId}/execute`, {
    method: 'POST',
  }).then(dataOf));
}

function createReviewPlan(data) {
  return withAuth(() => api.request('/api/v3/review-plans', {
    method: 'POST',
    data: data || {},
  }).then(dataOf));
}

function defaultStudyPlanPayload() {
  const now = new Date();
  const start = now.toISOString().slice(0, 10);
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1);
  return {
    name: '每日学习',
    type: 'daily',
    startDate: start,
    endDate: endDate.toISOString().slice(0, 10),
    dailyTarget: 10,
  };
}

function defaultReviewPlanPayload() {
  return {
    name: '每日错题复习',
    type: 'daily',
    strategy: 'due',
    dailyCount: 10,
  };
}

function createNote(data) {
  return withAuth(() => api.request('/api/v3/notes', {
    method: 'POST',
    data: data || {},
  }).then(dataOf));
}

function updateNote(noteId, data) {
  return withAuth(() => api.request(`/api/v3/notes/${noteId}`, {
    method: 'PUT',
    data: data || {},
  }).then(dataOf));
}

function getShopItems() {
  return withAuth(() => api.request('/api/v3/shop/items', { method: 'GET' }).then(dataOf));
}

function getShopInventory() {
  return withAuth(() => api.request('/api/v3/shop/inventory', { method: 'GET' }).then(dataOf));
}

function purchaseShopItem(itemId, quantity) {
  return withAuth(() => api.request('/api/v3/shop/purchase', {
    method: 'POST',
    data: { itemId, quantity: quantity || 1 },
  }).then(dataOf));
}

function getSubjectTree() {
  return withAuth(() => api.request('/api/v3/subjects', {
    method: 'GET',
    data: { tree: 'true' },
  }).then(dataOf));
}

function getQuestionBankDetail(id) {
  return withAuth(() => api.request(`/api/v3/banks/${id}`, { method: 'GET' }).then(dataOf));
}

function listQuizSessions(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/quizzes', {
    method: 'GET',
    data: cleanQuery({ userId: p.userId, status: p.status }),
  }));
}

function getAllCheckIns(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/study-plans/check-ins', {
    method: 'GET',
    data: cleanQuery({ page: p.page || 1, limit: p.limit || 30 }),
  }).then(dataOf));
}

function checkInStudyPlan(planId, payload) {
  return withAuth(() => api.request(`/api/v3/study-plans/${planId}/check-in`, {
    method: 'POST',
    data: payload || {},
  }).then(dataOf));
}

function markWrongQuestionMastered(questionId) {
  return withAuth(() => api.request(`/api/v3/wrong-questions/${questionId}/mastered`, {
    method: 'PUT',
  }).then(dataOf));
}

function flattenSubjects(tree, out) {
  const list = out || [];
  (tree || []).forEach((node) => {
    if (node.code) list.push({ code: node.code, name: node.name || node.code });
    if (node.children && node.children.length) flattenSubjects(node.children, list);
  });
  return list;
}

function getNotes(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/notes', {
    method: 'GET',
    data: cleanQuery({
      page: p.page || 1,
      limit: p.limit || 30,
      searchKeyword: p.searchKeyword,
      type: p.type,
    }),
  }).then(dataOf));
}

function getPublicNotes(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/notes/public', {
    method: 'GET',
    data: cleanQuery({ page: p.page || 1, limit: p.limit || 30, searchKeyword: p.searchKeyword }),
  }).then(dataOf));
}

function getNoteDetail(noteId) {
  return withAuth(() => api.request(`/api/v3/notes/${noteId}`, { method: 'GET' }).then(dataOf));
}

function getDiscussions(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/discussions', {
    method: 'GET',
    data: cleanQuery({ page: p.page || 1, limit: p.limit || 30, search: p.search }),
  }).then(dataOf));
}

function getDiscussionDetail(id) {
  return withAuth(() => api.request(`/api/v3/discussions/${id}`, { method: 'GET' }).then(dataOf));
}

function addDiscussionReply(discussionId, content) {
  return withAuth(() => api.request(`/api/v3/discussions/${discussionId}/replies`, {
    method: 'POST',
    data: { content },
  }).then(dataOf));
}

function getLearningPosts(params) {
  const p = params || {};
  return withAuth(() => api.request('/api/v3/learning-posts', {
    method: 'GET',
    data: cleanQuery({ page: p.page || 1, limit: p.limit || 20 }),
  }).then(dataOf));
}

function getConversations() {
  return withAuth(() => api.request('/api/v3/messages/conversations', { method: 'GET' })
    .then((res) => (res && res.data) || dataOf(res) || []));
}

function getForgettingCurve(limit) {
  return withAuth(() => api.request('/api/v3/enhanced-analytics/forgetting-curve', {
    method: 'GET',
    data: cleanQuery({ limit: limit || 20 }),
  }).then(dataOf));
}

function getConversation(userId, params) {
  const p = params || {};
  return withAuth(() => api.request(`/api/v3/messages/conversation/${userId}`, {
    method: 'GET',
    data: cleanQuery({ limit: p.limit || 50, before: p.before }),
  }).then(dataOf));
}

function sendMessage(data) {
  return withAuth(() => api.request('/api/v3/messages', {
    method: 'POST',
    data: data || {},
  }).then(dataOf));
}

function markMessagesAsRead(userId) {
  return withAuth(() => api.request(`/api/v3/messages/read/${userId}`, {
    method: 'PUT',
  }).then(dataOf));
}

module.exports = {
  getAchievements,
  getAchievementStats,
  getDailyChallenge,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getFavoriteFolders,
  getFavorites,
  getFavoriteStats,
  getLearningGoals,
  getLearningGoalStats,
  getLeaderboard,
  getFriends,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getReviewPlans,
  executeReviewPlan,
  createReviewPlan,
  defaultStudyPlanPayload,
  defaultReviewPlanPayload,
  createNote,
  updateNote,
  getShopItems,
  getShopInventory,
  purchaseShopItem,
  getSubjectTree,
  flattenSubjects,
  getQuestionBankDetail,
  listQuizSessions,
  getAllCheckIns,
  checkInStudyPlan,
  markWrongQuestionMastered,
  getNotes,
  getPublicNotes,
  getNoteDetail,
  getDiscussions,
  getDiscussionDetail,
  addDiscussionReply,
  getLearningPosts,
  getConversations,
  getForgettingCurve,
  getConversation,
  sendMessage,
  markMessagesAsRead,
};
