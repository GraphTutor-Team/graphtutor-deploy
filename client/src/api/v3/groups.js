/**
 * GraphTutor V3.0 - 群组管理API
 */

import api from '../api.js';

/**
 * 获取群组列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Array>}
 */
export async function getGroups(params = {}) {
  const { type, status } = params;
  const queryParams = new URLSearchParams();
  if (type) queryParams.append('type', type);
  if (status) queryParams.append('status', status);

  const res = await api.get(`/v3/groups?${queryParams.toString()}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取群组列表失败');
}

/**
 * 获取群组详情
 * @param {string} id - 群组ID
 * @returns {Promise<Object>}
 */
export async function getGroup(id) {
  const res = await api.get(`/v3/groups/${id}`);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '获取群组详情失败');
}

/**
 * 创建群组
 * @param {Object} data - 群组数据
 * @returns {Promise<Object>}
 */
export async function createGroup(data) {
  const res = await api.post('/v3/groups', data);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '创建群组失败');
}

/**
 * 更新群组
 * @param {string} id - 群组ID
 * @param {Object} data - 更新数据
 * @returns {Promise<Object>}
 */
export async function updateGroup(id, data) {
  const res = await api.put(`/v3/groups/${id}`, data);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '更新群组失败');
}

/**
 * 删除群组
 * @param {string} id - 群组ID
 * @returns {Promise<void>}
 */
export async function deleteGroup(id) {
  const res = await api.delete(`/v3/groups/${id}`);
  if (res.data?.success) {
    return;
  }
  throw new Error(res.data?.message || '删除群组失败');
}

/**
 * 加入群组（通过代码）
 * @param {string} code - 群组代码
 * @returns {Promise<Object>}
 */
export async function joinGroupByCode(code) {
  const res = await api.post('/v3/groups/join', { code });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '加入群组失败');
}

/**
 * 添加成员到群组
 * @param {string} groupId - 群组ID
 * @param {string} memberUserId - 成员用户ID
 * @param {string} role - 角色（teacher/student）
 * @returns {Promise<Object>}
 */
export async function addMemberToGroup(groupId, memberUserId, role = 'student') {
  const res = await api.post(`/v3/groups/${groupId}/members`, {
    memberUserId,
    role,
  });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '添加成员失败');
}

/**
 * 移除群组成员
 * @param {string} groupId - 群组ID
 * @param {string} memberId - 成员ID
 * @returns {Promise<void>}
 */
export async function removeMemberFromGroup(groupId, memberId) {
  const res = await api.delete(`/v3/groups/${groupId}/members/${memberId}`);
  if (res.data?.success) {
    return;
  }
  throw new Error(res.data?.message || '移除成员失败');
}

/**
 * 修改成员角色
 * @param {string} groupId - 群组ID
 * @param {string} memberId - 成员ID
 * @param {string} role - 新角色
 * @returns {Promise<void>}
 */
export async function updateMemberRole(groupId, memberId, role) {
  const res = await api.put(`/v3/groups/${groupId}/members/${memberId}/role`, {
    role,
  });
  if (res.data?.success) {
    return;
  }
  throw new Error(res.data?.message || '修改成员角色失败');
}

/**
 * 关联题库到群组
 * @param {string} groupId - 群组ID
 * @param {string} bankId - 题库ID
 * @returns {Promise<void>}
 */
export async function linkBankToGroup(groupId, bankId) {
  const res = await api.post(`/v3/groups/${groupId}/banks`, { bankId });
  if (res.data?.success) {
    return;
  }
  throw new Error(res.data?.message || '关联题库失败');
}

/**
 * 取消题库关联
 * @param {string} groupId - 群组ID
 * @param {string} bankId - 题库ID
 * @returns {Promise<void>}
 */
export async function unlinkBankFromGroup(groupId, bankId) {
  const res = await api.delete(`/v3/groups/${groupId}/banks/${bankId}`);
  if (res.data?.success) {
    return;
  }
  throw new Error(res.data?.message || '取消关联失败');
}

/**
 * 群组内排行榜
 * @param {string} groupId - 群组ID
 * @param {string} period - week | month | all
 * @returns {Promise<{ items, period }>}
 */
export async function getGroupLeaderboard(groupId, period = 'all') {
  const res = await api.get(`/v3/groups/${groupId}/leaderboard`, {
    params: { period },
  });
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取排行榜失败');
}

/**
 * 群组内共同练习列表
 * @param {string} groupId - 群组ID
 * @returns {Promise<Array>}
 */
export async function getGroupPractices(groupId) {
  const res = await api.get(`/v3/groups/${groupId}/practices`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取练习列表失败');
}

/**
 * 发起群组共同练习（仅老师）
 * @param {string} groupId - 群组ID
 * @param {Object} body - { bankId, questionCount, title }
 * @returns {Promise<Object>}
 */
export async function createGroupPractice(groupId, body) {
  const res = await api.post(`/v3/groups/${groupId}/practice`, body);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '发起练习失败');
}

/**
 * 获取共同练习详情（含题目 ID，用于开始答题）
 * @param {string} groupId - 群组ID
 * @param {string} sessionId - 练习会话ID
 * @returns {Promise<Object>}
 */
export async function getGroupPracticeSession(groupId, sessionId) {
  const res = await api.get(`/v3/groups/${groupId}/practice/${sessionId}`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取练习失败');
}

/**
 * 群组错题集锦（仅老师可见）
 * @param {string} groupId - 群组ID
 * @returns {Promise<{ items }>}
 */
export async function getGroupWrongSummary(groupId) {
  const res = await api.get(`/v3/groups/${groupId}/wrong-summary`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取错题集锦失败');
}

/**
 * 群组作业列表
 * @param {string} groupId
 * @returns {Promise<Array>}
 */
export async function getGroupAssignments(groupId) {
  const res = await api.get(`/v3/groups/${groupId}/assignments`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取作业列表失败');
}

/**
 * 布置作业
 * @param {string} groupId
 * @param {Object} body - { bankId, questionCount, dueAt, title }
 * @returns {Promise<Object>}
 */
export async function createGroupAssignment(groupId, body) {
  const res = await api.post(`/v3/groups/${groupId}/assignments`, body);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '布置作业失败');
}

/**
 * 作业详情
 * @param {string} groupId
 * @param {string} assignmentId
 * @returns {Promise<Object>}
 */
export async function getGroupAssignment(groupId, assignmentId) {
  const res = await api.get(`/v3/groups/${groupId}/assignments/${assignmentId}`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取作业详情失败');
}

/**
 * 作业完成情况（老师）
 * @param {string} groupId
 * @param {string} assignmentId
 * @returns {Promise<{ assignment, submitted, notSubmitted, totalMembers, submittedCount }>}
 */
export async function getGroupAssignmentCompletion(groupId, assignmentId) {
  const res = await api.get(`/v3/groups/${groupId}/assignments/${assignmentId}/completion`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取完成情况失败');
}

/**
 * 提交作业（学生交卷时调用）
 * @param {string} groupId
 * @param {string} assignmentId
 * @param {Object} body - { totalQuestions, totalCorrect }
 * @returns {Promise<Object>}
 */
export async function submitGroupAssignment(groupId, assignmentId, body) {
  const res = await api.post(`/v3/groups/${groupId}/assignments/${assignmentId}/submit`, body);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '提交作业失败');
}

// ---------- 小组 2.0：自习室 ----------

/**
 * 自习室在线成员列表
 * @param {string} groupId
 * @returns {Promise<Array<{ userId, name, todayGoal, lastSeenAt }>>}
 */
export async function getStudyRoomPresence(groupId) {
  const res = await api.get(`/v3/groups/${groupId}/study-room/presence`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取在线列表失败');
}

/**
 * 进入自习室
 * @param {string} groupId
 * @param {Object} body - { todayGoal? }
 */
export async function enterStudyRoom(groupId, body = {}) {
  const res = await api.post(`/v3/groups/${groupId}/study-room/enter`, body);
  if (res.data?.success) return;
  throw new Error(res.data?.message || '进入自习室失败');
}

/**
 * 离开自习室
 * @param {string} groupId
 */
export async function leaveStudyRoom(groupId) {
  const res = await api.post(`/v3/groups/${groupId}/study-room/leave`);
  if (res.data?.success) return;
  throw new Error(res.data?.message || '离开自习室失败');
}

/**
 * 自习室心跳（保持在线）
 * @param {string} groupId
 */
export async function studyRoomHeartbeat(groupId) {
  const res = await api.post(`/v3/groups/${groupId}/study-room/heartbeat`);
  if (res.data?.success) return;
  throw new Error(res.data?.message || '心跳失败');
}

/**
 * 更新今日学习目标
 * @param {string} groupId
 * @param {Object} body - { todayGoal }
 */
export async function updateStudyRoomStatus(groupId, body) {
  const res = await api.put(`/v3/groups/${groupId}/study-room/status`, body);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '更新状态失败');
}

// ---------- 小组 2.0：小组题库 ----------

/**
 * 小组题库列表（组内共享错题/好题）
 * @param {string} groupId
 * @returns {Promise<Array>}
 */
export async function getGroupSharedQuestions(groupId) {
  const res = await api.get(`/v3/groups/${groupId}/shared-questions`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '获取小组题库失败');
}

/**
 * 添加题目到小组题库
 * @param {string} groupId
 * @param {Object} body - { questionId, type: 'wrong'|'good', note? }
 */
export async function addGroupSharedQuestion(groupId, body) {
  const res = await api.post(`/v3/groups/${groupId}/shared-questions`, body);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '添加失败');
}

/**
 * 从小组题库移除题目
 * @param {string} groupId
 * @param {string} questionId
 */
export async function removeGroupSharedQuestion(groupId, questionId) {
  const res = await api.delete(`/v3/groups/${groupId}/shared-questions/${questionId}`);
  if (res.data?.success) return;
  throw new Error(res.data?.message || '移除失败');
}

