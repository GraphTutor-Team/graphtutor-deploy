/**
 * GraphTutor V3.0 - 用户管理API客户端
 * 
 * 作用：提供用户管理相关的API调用函数，包括用户列表查询、角色管理、批量操作、权限查询、操作日志等
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面)
 *   - pages/admin/OperationLogs.jsx (操作日志页面)
 *   - hooks/useUserManagement.js (用户管理hook)
 *   - api/api.js (API基础配置)
 * 技术栈：
 *   - Axios (HTTP请求)
 *   - RESTful API
 *   - 错误处理
 *   - 数据转换
 */

import api from './api.js';

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @param {string} params.search - 搜索关键词
 * @param {string} params.role - 角色筛选
 * @param {string} params.createdAtFrom - 注册时间起始（ISO日期字符串）
 * @param {string} params.createdAtTo - 注册时间结束（ISO日期字符串）
 * @param {string} params.lastLoginFrom - 最后登录时间起始（ISO日期字符串）
 * @param {string} params.lastLoginTo - 最后登录时间结束（ISO日期字符串）
 * @param {number} params.activeDays - 活跃天数（最近N天内有登录）
 * @param {string} params.sort - 排序字段
 * @param {string} params.order - 排序方向
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @returns {Promise<Object>} { data, meta }
 */
export async function getUsers(params = {}) {
  const {
    search,
    role,
    createdAtFrom,
    createdAtTo,
    lastLoginFrom,
    lastLoginTo,
    activeDays,
    sort = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
  } = params;

  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (role) queryParams.append('role', role);
  if (createdAtFrom) queryParams.append('createdAtFrom', createdAtFrom);
  if (createdAtTo) queryParams.append('createdAtTo', createdAtTo);
  if (lastLoginFrom) queryParams.append('lastLoginFrom', lastLoginFrom);
  if (lastLoginTo) queryParams.append('lastLoginTo', lastLoginTo);
  if (activeDays) queryParams.append('activeDays', activeDays);
  queryParams.append('sort', sort);
  queryParams.append('order', order);
  queryParams.append('page', page);
  queryParams.append('limit', limit);

  const res = await api.get(`/users?${queryParams.toString()}`);
  return {
    data: res.data?.data || [],
    meta: res.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/**
 * 获取用户详情
 * @param {string} id - 用户ID
 * @returns {Promise<Object>}
 */
export async function getUser(id) {
  const res = await api.get(`/users/${id}`);
  return res.data?.data;
}

/**
 * 获取用户学习统计
 * @param {string} id - 用户ID
 * @param {number} days - 天数（默认30）
 * @returns {Promise<Object>}
 */
export async function getUserStats(id, days = 30) {
  const res = await api.get(`/users/${id}/stats?days=${days}`);
  return res.data?.data;
}

/**
 * 获取用户活跃度数据
 * @param {string} id - 用户ID
 * @param {number} days - 天数（默认30）
 * @returns {Promise<Array>}
 */
export async function getUserActivity(id, days = 30) {
  const res = await api.get(`/users/${id}/activity?days=${days}`);
  return res.data?.data || [];
}

/**
 * 获取用户排名信息
 * @param {string} id - 用户ID
 * @returns {Promise<Object>}
 */
export async function getUserRanking(id) {
  const res = await api.get(`/users/${id}/ranking`);
  return res.data?.data;
}

/**
 * 获取用户权限详情
 * @param {string} id - 用户ID
 * @returns {Promise<Object>} 权限详情对象
 */
export async function getUserPermissions(id) {
  const res = await api.get(`/users/${id}/permissions`);
  return res.data?.data;
}

/**
 * 获取用户操作日志列表
 * @param {Object} params - 查询参数
 * @param {string} params.operatorId - 操作人ID
 * @param {string} params.targetUserId - 目标用户ID
 * @param {string} params.action - 操作类型
 * @param {string} params.result - 操作结果
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @returns {Promise<Object>} { data, meta }
 */
export async function getUserOperationLogs(params = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const res = await api.get(`/users/operation-logs?${queryParams.toString()}`);
  return {
    data: res.data?.data || [],
    meta: res.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/**
 * 获取操作日志统计
 * @param {Object} params - 查询参数
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @returns {Promise<Object>} 统计信息
 */
export async function getOperationLogStats(params = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  });

  const res = await api.get(`/users/operation-logs/stats?${queryParams.toString()}`);
  return res.data?.data;
}

/**
 * 修改用户角色
 * @param {string} id - 用户ID
 * @param {string} role - 角色
 * @returns {Promise<Object>}
 */
export async function updateUserRole(id, role) {
  const res = await api.patch(`/users/${id}/role`, { role });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '更新角色失败');
}

/**
 * 批量修改用户角色
 * @param {Array<string>} userIds - 用户ID数组
 * @param {string} role - 角色
 * @returns {Promise<Object>}
 */
export async function batchUpdateUserRole(userIds, role) {
  const res = await api.post('/users/batch-update-role', { userIds, role });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '批量更新角色失败');
}

/**
 * 批量删除用户
 * @param {Array<string>} userIds - 用户ID数组
 * @returns {Promise<Object>}
 */
export async function batchDeleteUsers(userIds) {
  const res = await api.delete('/users/batch', { data: { userIds } });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '批量删除用户失败');
}

/**
 * 批量导入用户
 * @param {Array<Object>} users - 用户数据数组
 * @returns {Promise<Object>} { total, successCount, failedCount, success, failed }
 */
export async function batchImportUsers(users) {
  const res = await api.post('/users/batch-import', { users });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '批量导入用户失败');
}
