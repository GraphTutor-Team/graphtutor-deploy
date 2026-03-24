/**
 * GraphTutor V3.0 - 数组工具函数
 * 
 * 功能：数组操作、处理、转换等工具函数
 */

/**
 * 数组去重
 * @param {Array} arr - 数组
 * @param {Function} keyFn - 键函数（可选）
 * @returns {Array} 去重后的数组
 */
export function unique(arr, keyFn) {
  if (!Array.isArray(arr)) return [];
  
  if (keyFn) {
    const seen = new Set();
    return arr.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  return [...new Set(arr)];
}

/**
 * 数组分组
 * @param {Array} arr - 数组
 * @param {Function|string} keyFn - 分组键函数或键名
 * @returns {Object} 分组后的对象
 */
export function groupBy(arr, keyFn) {
  if (!Array.isArray(arr)) return {};
  
  const getKey = typeof keyFn === 'function' 
    ? keyFn 
    : (item) => item[keyFn];
  
  return arr.reduce((groups, item) => {
    const key = getKey(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * 数组排序
 * @param {Array} arr - 数组
 * @param {Function|string} keyFn - 排序键函数或键名
 * @param {string} order - 排序方向（'asc' | 'desc'）
 * @returns {Array} 排序后的数组
 */
export function sortBy(arr, keyFn, order = 'asc') {
  if (!Array.isArray(arr)) return [];
  
  const getValue = typeof keyFn === 'function'
    ? keyFn
    : (item) => item[keyFn];
  
  return [...arr].sort((a, b) => {
    const aVal = getValue(a);
    const bVal = getValue(b);
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * 数组分页
 * @param {Array} arr - 数组
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页大小
 * @returns {Object} { items, total, page, pageSize, totalPages }
 */
export function paginate(arr, page = 1, pageSize = 20) {
  if (!Array.isArray(arr)) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 0,
    };
  }
  
  const total = arr.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = arr.slice(start, end);
  
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * 数组扁平化
 * @param {Array} arr - 数组
 * @param {number} depth - 深度
 * @returns {Array} 扁平化后的数组
 */
export function flatten(arr, depth = Infinity) {
  if (!Array.isArray(arr)) return [];
  return arr.flat(depth);
}

/**
 * 数组交集
 * @param {Array} arr1 - 数组1
 * @param {Array} arr2 - 数组2
 * @returns {Array} 交集数组
 */
export function intersection(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  const set2 = new Set(arr2);
  return arr1.filter(item => set2.has(item));
}

/**
 * 数组差集
 * @param {Array} arr1 - 数组1
 * @param {Array} arr2 - 数组2
 * @returns {Array} 差集数组（arr1中有但arr2中没有的）
 */
export function difference(arr1, arr2) {
  if (!Array.isArray(arr1)) return [];
  if (!Array.isArray(arr2)) return arr1;
  const set2 = new Set(arr2);
  return arr1.filter(item => !set2.has(item));
}

/**
 * 数组并集
 * @param {Array} arr1 - 数组1
 * @param {Array} arr2 - 数组2
 * @returns {Array} 并集数组
 */
export function union(arr1, arr2) {
  if (!Array.isArray(arr1) && !Array.isArray(arr2)) return [];
  if (!Array.isArray(arr1)) return arr2;
  if (!Array.isArray(arr2)) return arr1;
  return [...new Set([...arr1, ...arr2])];
}

/**
 * 数组分块
 * @param {Array} arr - 数组
 * @param {number} size - 块大小
 * @returns {Array} 分块后的二维数组
 */
export function chunk(arr, size = 1) {
  if (!Array.isArray(arr) || size < 1) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * 数组随机打乱
 * @param {Array} arr - 数组
 * @returns {Array} 打乱后的数组
 */
export function shuffle(arr) {
  if (!Array.isArray(arr)) return [];
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

