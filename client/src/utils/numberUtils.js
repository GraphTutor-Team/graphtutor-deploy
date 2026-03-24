/**
 * GraphTutor V3.0 - 数字工具函数
 * 
 * 功能：数字格式化、计算、验证等工具函数
 */

/**
 * 格式化数字（添加千分位）
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  const fixed = decimals > 0 ? num.toFixed(decimals) : String(Math.floor(num));
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * 格式化百分比
 * @param {number} num - 数字（0-1之间的小数）
 * @param {number} decimals - 小数位数
 * @returns {string} 百分比字符串
 */
export function formatPercent(num, decimals = 1) {
  if (num === null || num === undefined || isNaN(num)) return '0%';
  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * 限制数字范围
 * @param {number} num - 数字
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的数字
 */
export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * 四舍五入到指定精度
 * @param {number} num - 数字
 * @param {number} precision - 精度（小数位数）
 * @returns {number} 四舍五入后的数字
 */
export function roundTo(num, precision = 0) {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

/**
 * 生成随机数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机数
 */
export function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 判断是否为有效数字
 * @param {*} value - 值
 * @returns {boolean}
 */
export function isValidNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 安全转换为数字
 * @param {*} value - 值
 * @param {number} defaultValue - 默认值
 * @returns {number}
 */
export function toNumber(value, defaultValue = 0) {
  const num = Number(value);
  return isValidNumber(num) ? num : defaultValue;
}

