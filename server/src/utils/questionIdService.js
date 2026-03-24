/**
 * GraphTutor V3.0 - 题目ID生成器服务
 * 
 * 功能：生成格式化的题目业务ID（qid）
 * 格式：{学科代码}-{年份}-{三位序列号}
 * 示例：CS-DS-2024-001
 */

import Question from '../models/Question.js';

/**
 * 生成题目ID（qid）
 * @param {string} subjectCode - 学科代码，如 "CS-DS"
 * @param {number} year - 年份，默认为当前年份
 * @returns {Promise<string>} 生成的题目ID
 * 
 * @example
 * const qid = await generateQuestionId('CS-DS', 2024);
 * // 返回: "CS-DS-2024-001"
 */
export async function generateQuestionId(subjectCode = 'DEFAULT', year = null) {
  // 验证学科代码格式
  if (!subjectCode || typeof subjectCode !== 'string') {
    throw new Error('学科代码必须是非空字符串');
  }

  // 验证学科代码格式（只允许大写字母、数字和连字符）
  if (!/^[A-Z0-9-]+$/.test(subjectCode)) {
    throw new Error('学科代码格式无效，只能包含大写字母、数字和连字符');
  }

  // 如果没有指定年份，使用当前年份
  if (!year) {
    year = new Date().getFullYear();
  }

  // 验证年份
  if (typeof year !== 'number' || year < 2000 || year > 2100) {
    throw new Error('年份必须在 2000-2100 之间');
  }

  // 查找该学科和年份下的最大序列号
  const prefix = `${subjectCode}-${year}-`;
  const regex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);

  // 查询所有匹配的题目ID
  const existingQuestions = await Question.find({
    qid: { $regex: regex },
  })
    .select('qid')
    .lean();

  // 提取序列号并找到最大值
  let maxSeq = 0;
  for (const question of existingQuestions) {
    const match = question.qid.match(regex);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  // 生成新的序列号（最大值 + 1）
  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(3, '0');

  // 生成完整的题目ID
  const qid = `${prefix}${seqStr}`;

  // 检查是否已存在（防止并发冲突）
  const exists = await Question.findOne({ qid });
  if (exists) {
    // 如果已存在，递归调用（理论上不应该发生）
    return generateQuestionId(subjectCode, year);
  }

  return qid;
}

/**
 * 解析题目ID（qid）
 * @param {string} qid - 题目ID，如 "CS-DS-2024-001"
 * @returns {Object|null} 解析结果 { subjectCode, year, seq } 或 null
 * 
 * @example
 * const parsed = parseQuestionId('CS-DS-2024-001');
 * // 返回: { subjectCode: 'CS-DS', year: 2024, seq: 1 }
 */
export function parseQuestionId(qid) {
  if (!qid || typeof qid !== 'string') {
    return null;
  }

  // 匹配格式：SUBJECT_CODE-YEAR-SEQ
  const match = qid.match(/^([A-Z0-9-]+)-(\d{4})-(\d{3})$/);
  if (!match) {
    return null;
  }

  return {
    subjectCode: match[1],
    year: parseInt(match[2], 10),
    seq: parseInt(match[3], 10),
  };
}

/**
 * 验证题目ID格式
 * @param {string} qid - 题目ID
 * @returns {boolean} 是否为有效格式
 */
export function validateQuestionId(qid) {
  if (!qid || typeof qid !== 'string') {
    return false;
  }

  return /^[A-Z0-9-]+-\d{4}-\d{3}$/.test(qid);
}

