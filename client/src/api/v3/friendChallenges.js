/**
 * GraphTutor V3.0 - 好友挑战API客户端
 */

import api from '../api.js';

/**
 * 创建好友挑战
 */
export async function createFriendChallenge(participantId, challengeData) {
  const res = await api.post('/v3/friend-challenges', {
    participantId,
    ...challengeData,
  });
  return res.data;
}

/**
 * 获取挑战列表
 */
export async function getFriendChallenges(params = {}) {
  const res = await api.get('/v3/friend-challenges', { params });
  return res.data;
}

/**
 * 获取挑战统计
 */
export async function getChallengeStats() {
  const res = await api.get('/v3/friend-challenges/stats');
  return res.data;
}

/**
 * 获取两个用户之间的挑战
 */
export async function getChallengesBetweenUsers(userId) {
  const res = await api.get(`/v3/friend-challenges/between/${userId}`);
  return res.data;
}

/**
 * 接受挑战
 */
export async function acceptChallenge(challengeId) {
  const res = await api.put(`/v3/friend-challenges/${challengeId}/accept`);
  return res.data;
}

/**
 * 取消挑战
 */
export async function cancelChallenge(challengeId) {
  const res = await api.put(`/v3/friend-challenges/${challengeId}/cancel`);
  return res.data;
}

/**
 * 更新挑战进度
 */
export async function updateChallengeProgress(challengeId) {
  const res = await api.put(`/v3/friend-challenges/${challengeId}/progress`);
  return res.data;
}

/**
 * 同步当前用户所有进行中挑战的进度（交卷后调用）
 */
export async function syncActiveChallengeProgress() {
  const res = await api.put('/v3/friend-challenges/sync-progress');
  return res.data;
}

/**
 * 获取挑战详情
 */
export async function getChallengeDetail(challengeId) {
  const res = await api.get(`/v3/friend-challenges/${challengeId}`);
  return res.data;
}

