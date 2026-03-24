/**
 * GraphTutor V3.0 - 导出API客户端
 */

import api from '../api.js';

/**
 * 导出学习报告为Word
 */
export async function exportLearningReportToWord(data) {
  const response = await api.post('/v3/export/learning-report/word', { data }, {
    responseType: 'blob',
  });
  
  // 创建下载链接
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `学习报告_${new Date().toISOString().split('T')[0]}.docx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * 导出笔记为Word
 */
export async function exportNoteToWord(note) {
  const response = await api.post('/v3/export/note/word', { note }, {
    responseType: 'blob',
  });
  
  // 创建下载链接
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `笔记_${note.title || '未命名'}_${new Date().toISOString().split('T')[0]}.docx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

