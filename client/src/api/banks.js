// client/src/api/banks.js
// 题库（QuestionBank）相关 API：获取题库列表 & 新建题库

import api from "./api";

/**
 * 获取题库列表
 * GET /api/banks
 * 返回数组：[{ _id, name, key, description, isPublic, ... }]
 */
export async function listBanks() {
  const res = await api.get("/banks");
  const data = res.data;
  return data?.data || [];
}

/**
 * 创建新的题库
 * POST /api/banks
 * body: { name, key?, description? }
 * 返回创建好的题库对象
 */
export async function createBank(payload) {
  const res = await api.post("/banks", payload);
  const data = res.data;
  if (data?.success && data.data) {
    return data.data;
  }
  throw new Error(data?.message || "创建题库失败");
}
