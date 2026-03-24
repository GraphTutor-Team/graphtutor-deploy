/**
 * GraphTutor V3.0 - 学科管理API
 */

import api from '../api.js';

/**
 * 获取学科列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export async function getSubjects(params = {}) {
  const { tree, level, managerId, enabled } = params;
  const queryParams = new URLSearchParams();
  
  if (tree) queryParams.append('tree', 'true');
  if (level) queryParams.append('level', level);
  if (managerId) queryParams.append('managerId', managerId);
  if (enabled !== undefined) queryParams.append('enabled', enabled);

  const res = await api.get(`/v3/subjects?${queryParams.toString()}`);
  return res.data?.data || [];
}

/**
 * 获取学科树形结构
 * @returns {Promise<Array>}
 */
export async function getSubjectTree() {
  const res = await api.get('/v3/subjects?tree=true');
  return res.data?.data || [];
}

/**
 * 获取学科详情
 * @param {string} code - 学科代码
 * @returns {Promise<Object>}
 */
export async function getSubject(code) {
  const res = await api.get(`/v3/subjects/${code}`);
  return res.data?.data;
}

/**
 * 创建学科
 * @param {Object} payload - 学科数据
 * @returns {Promise<Object>}
 */
export async function createSubject(payload) {
  const res = await api.post('/v3/subjects', payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '创建学科失败');
}

/**
 * 更新学科
 * @param {string} code - 学科代码
 * @param {Object} payload - 更新数据
 * @returns {Promise<Object>}
 */
export async function updateSubject(code, payload) {
  const res = await api.put(`/v3/subjects/${code}`, payload);
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '更新学科失败');
}

/**
 * 删除学科
 * @param {string} code - 学科代码
 * @returns {Promise<void>}
 */
export async function deleteSubject(code) {
  const res = await api.delete(`/v3/subjects/${code}`);
  if (!res.data?.success) {
    throw new Error(res.data?.message || '删除学科失败');
  }
}

/**
 * 分配学科负责人
 * @param {string} code - 学科代码
 * @param {Array<string>} managers - 负责人ID数组
 * @returns {Promise<Object>}
 */
export async function assignSubjectManagers(code, managers) {
  const res = await api.put(`/v3/subjects/${code}/managers`, { managers });
  if (res.data?.success) {
    return res.data.data;
  }
  throw new Error(res.data?.message || '分配负责人失败');
}

