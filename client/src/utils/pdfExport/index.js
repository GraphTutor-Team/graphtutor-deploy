/**
 * GraphTutor V3.0 - PDF导出工具统一入口
 * 
 * 作用：统一导出PDF相关功能，提供向后兼容
 * 关联页面：
 *   - pages/Analytics.jsx (学习分析页面)
 *   - pages/admin/Reports.jsx (统计报表页面)
 * 技术栈：
 *   - ES6模块导出
 *   - 向后兼容性处理
 */

// 导出学习报告相关功能
export {
  exportLearningReportToPDF,
  downloadLearningReportPDF,
} from './learningReport.js';

// 导出系统报表相关功能
export {
  exportSystemReportToPDF,
} from './systemReport.js';

// 导出笔记相关功能
export {
  exportNoteToPDF,
} from './noteExport.js';

