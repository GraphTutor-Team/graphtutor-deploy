// src/api/records.js

import api from "./api";

/**
 * 提交单题练习记录
 * 用于 Quiz.jsx，每答一题立即调用一次。
 * @param {Object} payload
 * @param {string} payload.userId 用户ID
 * @param {string} payload.questionId 题目ID
 * @param {string} payload.knowledgeNodeId 知识点ID
 * @param {number} payload.answerIndex 用户选择的选项索引
 * @param {number} payload.correctIndex 正确选项索引
 * @param {boolean} payload.isCorrect 是否答对
 */
export async function submitRecord(payload) {
  const res = await api.post("/records", payload);
  return res.data;
}

/**
 * 批量提交考试记录
 * 用于 Exam.jsx，当整张试卷提交后，将所有题目结果一次性写入数据库。
 * @param {Object} payload
 * @param {string} payload.userId 用户ID
 * @param {Array} payload.records 题目作答记录数组
 * [
 *   {
 *     questionId: String,
 *     knowledgeNodeId: String,
 *     answerIndex: Number,
 *     correctIndex: Number,
 *     isCorrect: Boolean
 *   }
 * ]
 */
export async function batchSubmitRecords(payload) {
  const res = await api.post("/records/batch", payload);
  return res.data;
}

/**
 * 获取错题列表
 * 用于未来的 Review 页面。
 */
export async function getWrongRecords(userId) {
  const res = await api.get(`/records/wrong?userId=${encodeURIComponent(userId)}`);
  return res.data;
}

/**
 * 获取最近学习进度
 * 例如最近7天记录，用于学习分析页。
 */
export async function getRecentProgress(userId) {
  const res = await api.get(`/records/progress7d?userId=${encodeURIComponent(userId)}`);
  return res.data;
}
