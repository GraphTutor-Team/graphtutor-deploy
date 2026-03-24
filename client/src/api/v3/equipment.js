/**
 * GraphTutor V3.0 - 装备系统 API
 */

import api from '../api.js';

/**
 * 获取当前用户装备列表及解锁状态
 */
export async function getEquipment() {
  const res = await api.get('/v3/equipment');
  return res.data;
}
