/**
 * GraphTutor V3.0 - 笔记模板工具
 * 
 * 功能：提供笔记模板
 */

export const NOTE_TEMPLATES = {
  question: {
    name: '题目笔记模板',
    type: 'question',
    title: '题目笔记',
    content: `## 题目信息
- 题目ID: {questionId}
- 知识点: {knowledgeNodeId}

## 我的思路
1. 
2. 
3. 

## 关键点
- 

## 易错点
- 

## 总结
`,
  },
  knowledge: {
    name: '知识点笔记模板',
    type: 'knowledge',
    title: '知识点笔记',
    content: `## 知识点概述
{knowledgeNodeId}

## 核心概念
1. 
2. 
3. 

## 重要公式/定理
- 

## 应用场景
- 

## 相关题目
- 

## 学习心得
`,
  },
  summary: {
    name: '学习总结模板',
    type: 'knowledge',
    title: '学习总结',
    content: `## 学习日期
{date}

## 学习内容
1. 
2. 
3. 

## 掌握情况
- 已掌握: 
- 需加强: 

## 下一步计划
1. 
2. 

## 心得体会
`,
  },
  review: {
    name: '复习笔记模板',
    type: 'knowledge',
    title: '复习笔记',
    content: `## 复习日期
{date}

## 复习内容
{knowledgeNodeId}

## 重点回顾
1. 
2. 
3. 

## 错题分析
- 

## 复习效果
- 

## 下次复习计划
`,
  },
};

/**
 * 应用模板
 */
export function applyTemplate(templateKey, variables = {}) {
  const template = NOTE_TEMPLATES[templateKey];
  if (!template) {
    return null;
  }

  let content = template.content;
  
  // 替换变量
  Object.keys(variables).forEach((key) => {
    const value = variables[key] || '';
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });

  // 替换日期
  if (content.includes('{date}')) {
    content = content.replace(/{date}/g, new Date().toLocaleDateString('zh-CN'));
  }

  return {
    type: template.type,
    title: template.title,
    content,
  };
}

/**
 * 获取所有模板
 */
export function getAllTemplates() {
  return Object.keys(NOTE_TEMPLATES).map((key) => ({
    key,
    ...NOTE_TEMPLATES[key],
  }));
}

/**
 * 保存自定义模板
 */
export function saveCustomTemplate(template) {
  try {
    const customTemplates = getCustomTemplates();
    const existingIndex = customTemplates.findIndex(t => t.key === template.key);
    
    if (existingIndex !== -1) {
      customTemplates[existingIndex] = template;
    } else {
      customTemplates.push(template);
    }
    
    localStorage.setItem('customNoteTemplates', JSON.stringify(customTemplates));
    return true;
  } catch (err) {
    console.error('保存自定义模板失败:', err);
    return false;
  }
}

/**
 * 获取自定义模板
 */
export function getCustomTemplates() {
  try {
    const templates = localStorage.getItem('customNoteTemplates');
    return templates ? JSON.parse(templates) : [];
  } catch (err) {
    console.error('获取自定义模板失败:', err);
    return [];
  }
}

/**
 * 删除自定义模板
 */
export function deleteCustomTemplate(templateKey) {
  try {
    const customTemplates = getCustomTemplates();
    const filtered = customTemplates.filter(t => t.key !== templateKey);
    localStorage.setItem('customNoteTemplates', JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('删除自定义模板失败:', err);
    return false;
  }
}

/**
 * 获取所有模板（包括自定义模板）
 */
export function getAllTemplatesWithCustom() {
  const builtInTemplates = getAllTemplates();
  const customTemplates = getCustomTemplates();
  return [...builtInTemplates, ...customTemplates];
}

/**
 * 根据类型获取模板
 */
export function getTemplatesByType(type) {
  const allTemplates = getAllTemplatesWithCustom();
  return allTemplates.filter(t => t.type === type);
}

/**
 * 搜索模板
 */
export function searchTemplates(keyword) {
  const allTemplates = getAllTemplatesWithCustom();
  const lowerKeyword = keyword.toLowerCase();
  return allTemplates.filter(t => 
    t.name.toLowerCase().includes(lowerKeyword) ||
    t.title.toLowerCase().includes(lowerKeyword) ||
    (t.description && t.description.toLowerCase().includes(lowerKeyword))
  );
}

/**
 * 获取模板使用统计
 */
export function getTemplateUsageStats() {
  try {
    const stats = localStorage.getItem('templateUsageStats');
    return stats ? JSON.parse(stats) : {};
  } catch (err) {
    console.error('获取模板使用统计失败:', err);
    return {};
  }
}

/**
 * 记录模板使用
 */
export function recordTemplateUsage(templateKey) {
  try {
    const stats = getTemplateUsageStats();
    stats[templateKey] = (stats[templateKey] || 0) + 1;
    stats[`${templateKey}_lastUsed`] = new Date().toISOString();
    localStorage.setItem('templateUsageStats', JSON.stringify(stats));
  } catch (err) {
    console.error('记录模板使用失败:', err);
  }
}

/**
 * 获取热门模板
 */
export function getPopularTemplates(limit = 5) {
  const stats = getTemplateUsageStats();
  const allTemplates = getAllTemplatesWithCustom();
  
  return allTemplates
    .map(t => ({
      ...t,
      usageCount: stats[t.key] || 0,
      lastUsed: stats[`${t.key}_lastUsed`] || null,
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

