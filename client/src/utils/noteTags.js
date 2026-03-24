/**
 * GraphTutor V3.0 - 学习笔记标签工具
 * 
 * 功能：管理笔记标签系统
 */

/**
 * 提取笔记中的标签
 * @param {string} content - 笔记内容
 * @returns {string[]} 标签数组
 */
export function extractTags(content) {
  if (!content) return [];
  
  // 支持 #标签 格式
  const tagRegex = /#([\w\u4e00-\u9fa5]+)/g;
  const matches = content.match(tagRegex);
  
  if (!matches) return [];
  
  // 提取标签文本（去掉#）
  const tags = matches.map(match => match.substring(1));
  
  // 去重
  return [...new Set(tags)];
}

/**
 * 格式化标签显示
 * @param {string} tag - 标签文本
 * @returns {string} 格式化后的标签
 */
export function formatTag(tag) {
  return tag.trim();
}

/**
 * 验证标签
 * @param {string} tag - 标签文本
 * @returns {boolean} 是否有效
 */
export function validateTag(tag) {
  if (!tag || tag.trim().length === 0) return false;
  if (tag.length > 20) return false;
  // 只允许字母、数字、中文、下划线
  return /^[\w\u4e00-\u9fa5]+$/.test(tag);
}

/**
 * 获取常用标签
 * @param {Array} notes - 笔记列表
 * @param {number} limit - 返回数量限制
 * @returns {Array} 常用标签数组
 */
export function getPopularTags(notes, limit = 10) {
  if (!notes || notes.length === 0) return [];
  
  const tagCounts = {};
  
  notes.forEach(note => {
    const tags = note.tags || extractTags(note.content || '');
    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  // 按使用次数排序
  const sorted = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
  
  return sorted;
}

/**
 * 根据标签过滤笔记
 * @param {Array} notes - 笔记列表
 * @param {string|Array} tags - 标签或标签数组
 * @returns {Array} 过滤后的笔记列表
 */
export function filterNotesByTags(notes, tags) {
  if (!notes || notes.length === 0) return [];
  if (!tags || (Array.isArray(tags) && tags.length === 0)) return notes;
  
  const tagArray = Array.isArray(tags) ? tags : [tags];
  
  return notes.filter(note => {
    const noteTags = note.tags || extractTags(note.content || '');
    return tagArray.some(tag => noteTags.includes(tag));
  });
}

/**
 * 合并标签到内容
 * @param {string} content - 原始内容
 * @param {Array} tags - 标签数组
 * @returns {string} 合并后的内容
 */
export function mergeTagsToContent(content, tags) {
  if (!tags || tags.length === 0) return content;
  
  // 提取现有标签
  const existingTags = extractTags(content);
  
  // 合并新标签
  const allTags = [...new Set([...existingTags, ...tags])];
  
  // 移除内容中的旧标签
  let newContent = content.replace(/#[\w\u4e00-\u9fa5]+/g, '').trim();
  
  // 在末尾添加标签
  if (allTags.length > 0) {
    const tagsString = allTags.map(tag => `#${tag}`).join(' ');
    newContent = newContent ? `${newContent}\n\n${tagsString}` : tagsString;
  }
  
  return newContent;
}

/**
 * 从内容中移除标签
 * @param {string} content - 原始内容
 * @param {Array} tags - 要移除的标签数组
 * @returns {string} 移除后的内容
 */
export function removeTagsFromContent(content, tags) {
  if (!tags || tags.length === 0) return content;
  
  const tagArray = Array.isArray(tags) ? tags : [tags];
  
  tagArray.forEach(tag => {
    const regex = new RegExp(`#${tag}\\s*`, 'g');
    content = content.replace(regex, '');
  });
  
  return content.trim();
}

