/**
 * GraphTutor V3.0 - PDF导出工具（向后兼容层）
 * 
 * 作用：提供向后兼容的PDF导出功能
 * 注意：此文件已重构，实际功能已拆分到 pdfExport/ 目录
 * 建议：新代码请直接从 pdfExport/index.js 导入
 * 
 * 关联页面：
 *   - pages/Analytics.jsx (学习分析页面)
 *   - pages/admin/Reports.jsx (统计报表页面)
 *   - pages/Notes.jsx (笔记页面)
 *   - pages/NoteShare.jsx (笔记分享页面)
 * 技术栈：
 *   - ES6模块重新导出
 *   - 向后兼容性处理
 */

// 从新模块重新导出，保持向后兼容
export {
  exportLearningReportToPDF,
  downloadLearningReportPDF,
  exportSystemReportToPDF,
  exportNoteToPDF,
} from './pdfExport/index.js';
