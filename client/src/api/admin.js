/**
 * GraphTutor V3.0 - 管理后台API客户端
 * 
 * 作用：提供管理后台相关的API调用函数，包括系统统计、报表生成等
 * 关联页面：
 *   - pages/admin/Reports.jsx (统计报表页面)
 *   - pages/Admin.jsx (管理后台首页)
 *   - api/api.js (API基础配置)
 * 技术栈：
 *   - Axios (HTTP请求)
 *   - RESTful API
 *   - 数据格式化
 */

import api from './api';

/**
 * 生成系统统计报表
 * @param {Object} params - 报表参数
 * @param {string} params.type - 报表类型（daily/weekly/monthly/custom）
 * @param {string} params.startDate - 开始日期（ISO字符串，custom类型必需）
 * @param {string} params.endDate - 结束日期（ISO字符串，custom类型必需）
 * @returns {Promise<Object>} 报表数据
 */
export async function generateSystemReport(params = {}) {
  const res = await api.post('/admin/reports/generate', params);
  return res.data?.data;
}

/**
 * 获取系统统计信息
 * @returns {Promise<Object>} 统计数据
 */
export async function getSystemStats() {
  const res = await api.get('/admin/stats');
  return res.data?.data || res.data;
}
