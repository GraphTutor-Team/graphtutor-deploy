/**
 * GraphTutor V3.0 - 题库管理API
 */

import api from '../api.js';

/**
 * 获取题库列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} { data, meta }
 */
export async function getBanks(params = {}) {
  const {
    subjectCode,
    managerId,
    isPublic,
    search,
    page = 1,
    limit = 20,
  } = params;

  const queryParams = new URLSearchParams();
  if (subjectCode) queryParams.append('subjectCode', subjectCode);
  if (managerId) queryParams.append('managerId', managerId);
  if (isPublic !== undefined) queryParams.append('isPublic', isPublic);
  if (search) queryParams.append('search', search);
  queryParams.append('page', page);
  queryParams.append('limit', limit);

  const res = await api.get(`/v3/banks?${queryParams.toString()}`);
  return {
    data: res.data?.data || [],
    meta: res.data?.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/**
 * 获取题库详情
 * @param {string} id - 题库ID
 * @returns {Promise<Object>}
 */
export async function purchaseBank(id) {
  const res = await api.post(`/v3/banks/${id}/purchase`);
  if (res.data?.success) return res.data.data;
  throw new Error(res.data?.message || '解锁失败');
}

export async function getBank(id) {
  const res = await api.get(`/v3/banks/${id}`);
  return res.data?.data;
}

/**
 * 创建题库
 * @param {Object} payload - 题库数据
 * @returns {Promise<Object>}
 */
export async function createBank(payload) {
  const res = await api.post('/v3/banks', payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '创建题库失败');
}

/**
 * 更新题库
 * @param {string} id - 题库ID
 * @param {Object} payload - 更新数据
 * @returns {Promise<Object>}
 */
export async function updateBank(id, payload) {
  const res = await api.put(`/v3/banks/${id}`, payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '更新题库失败');
}

/**
 * 删除题库
 * @param {string} id - 题库ID
 * @returns {Promise<void>}
 */
export async function deleteBank(id) {
  const res = await api.delete(`/v3/banks/${id}`);
  if (!res.data?.success) {
    throw new Error(res.data?.message || '删除题库失败');
  }
}

/**
 * 获取题库统计信息
 * @param {string} id - 题库ID
 * @returns {Promise<Object>}
 */
export async function getBankStats(id) {
  const res = await api.get(`/v3/banks/${id}/stats`);
  return res.data?.data;
}

/**
 * 获取题库活跃度数据
 * @param {string} id - 题库ID
 * @param {number} days - 天数（默认30）
 * @returns {Promise<Array>}
 */
export async function getBankActivity(id, days = 30) {
  const res = await api.get(`/v3/banks/${id}/activity?days=${days}`);
  return res.data?.data || [];
}

/**
 * 获取题目分布统计
 * @param {string} id - 题库ID
 * @returns {Promise<Object>}
 */
export async function getBankDistribution(id) {
  const res = await api.get(`/v3/banks/${id}/distribution`);
  return res.data?.data;
}

/**
 * 获取题库使用情况统计
 * @param {string} id - 题库ID
 * @returns {Promise<Object>}
 */
export async function getBankUsage(id) {
  const res = await api.get(`/v3/banks/${id}/usage`);
  return res.data?.data;
}

/**
 * 分配题库管理者
 * @param {string} id - 题库ID
 * @param {Array<string>} managers - 管理者ID数组
 * @returns {Promise<Object>}
 */
export async function assignBankManagers(id, managers) {
  const res = await api.put(`/v3/banks/${id}/managers`, { managers });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '分配管理者失败');
}

