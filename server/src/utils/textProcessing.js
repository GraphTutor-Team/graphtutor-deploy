// server/src/utils/textProcessing.js
// 文本处理工具函数：提取公共逻辑，避免代码重复

/**
 * 将文本分割成句子
 * @param {string} raw - 原始文本
 * @param {object} options - 配置选项
 * @returns {string[]} - 句子数组
 */
export function splitSentences(raw, options = {}) {
  const {
    minLength = 15,
    maxLength = 200,
    maxCount = 400,
  } = options;

  const text = (raw || '')
    .replace(/[\r\t]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

  const parts = text.split(/(?<=[。！？.!?])\s+/);
  
  return parts
    .filter(s => s.length >= minLength && s.length <= maxLength)
    .slice(0, maxCount);
}

/**
 * 从句子中提取关键词（用于生成选择题的答案）
 * @param {string} s - 句子
 * @returns {string|null} - 关键词或 null
 */
export function pickKeyword(s) {
  if (!s || typeof s !== 'string') return null;
  
  // 尝试找到一段话中最长的中文词 / 英文单词，当成"空格答案"
  const words = s.match(/[\u4e00-\u9fa5]{2,}|[A-Za-z]{4,}/g) || [];
  if (words.length === 0) return null;
  
  // 返回最长的词
  return words.reduce((longest, current) => 
    current.length > longest.length ? current : longest
  , '');
}

/**
 * 清理和规范化文本
 * @param {string} text - 原始文本
 * @returns {string} - 清理后的文本
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[\r\t]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

