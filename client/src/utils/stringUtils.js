/**
 * GraphTutor V3.0 - 字符串工具函数
 * 
 * 功能：字符串格式化、处理、验证等工具函数
 */

/**
 * 截断字符串
 * @param {string} str - 字符串
 * @param {number} length - 最大长度
 * @param {string} suffix - 后缀
 * @returns {string} 截断后的字符串
 */
export function truncate(str, length = 50, suffix = '...') {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
}

/**
 * 首字母大写
 * @param {string} str - 字符串
 * @returns {string} 首字母大写的字符串
 */
export function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 驼峰命名转短横线命名
 * @param {string} str - 驼峰命名字符串
 * @returns {string} 短横线命名字符串
 */
export function camelToKebab(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 短横线命名转驼峰命名
 * @param {string} str - 短横线命名字符串
 * @returns {string} 驼峰命名字符串
 */
export function kebabToCamel(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * 移除HTML标签
 * @param {string} html - HTML字符串
 * @returns {string} 纯文本字符串
 */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * 转义HTML
 * @param {string} str - 字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 反转义HTML
 * @param {string} str - 转义后的字符串
 * @returns {string} 原始字符串
 */
export function unescapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  const map = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
  };
  return str.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (m) => map[m]);
}

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @returns {string} 随机字符串
 */
export function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 判断字符串是否为空
 * @param {*} value - 值
 * @returns {boolean}
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 格式化文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 扩展名（不含点）
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

