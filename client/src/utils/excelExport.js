/**
 * GraphTutor V3.0 - Excel导出工具
 * 
 * 作用：提供将数据导出为Excel格式的功能，支持学习报告、用户数据、统计报表等
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户数据导出)
 *   - pages/admin/Reports.jsx (统计报表导出)
 *   - pages/Analytics.jsx (学习报告导出)
 * 技术栈：
 *   - xlsx库 (Excel文件生成)
 *   - Blob API (文件下载)
 *   - 工作表配置 (列宽、样式等)
 */

import * as XLSX from 'xlsx';

/**
 * 导出学习报告为Excel
 * @param {Object} data - 报告数据
 * @param {string} filename - 文件名
 */
export function exportLearningReportToExcel(data, filename = '学习报告') {
  const {
    stats = {},
    progress7d = [],
    nodeStats = [],
    typeDistribution = [],
    subjectDistribution = [],
  } = data;

  // 创建工作簿
  const wb = XLSX.utils.book_new();

  // 1. 总体统计
  const statsData = [
    ['学习报告'],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    [],
    ['总体统计'],
    ['指标', '数值'],
    ['总题数', stats.totalQuestions || 0],
    ['总正确数', stats.totalCorrect || 0],
    ['总错误数', stats.totalWrong || 0],
    ['平均正确率', stats.averageAccuracy ? `${(stats.averageAccuracy * 100).toFixed(2)}%` : '0%'],
    ['学习天数', stats.studyDays || 0],
    ['总学习时长（分钟）', stats.totalDuration || 0],
  ];
  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, statsSheet, '总体统计');

  // 2. 近7天学习进度
  if (progress7d.length > 0) {
    const progressData = [
      ['日期', '总题数', '正确数', '错误数', '正确率'],
      ...progress7d.map(item => [
        item.day || item.date || '',
        item.total || 0,
        item.correct || 0,
        (item.total || 0) - (item.correct || 0),
        item.accuracy ? `${(item.accuracy * 100).toFixed(2)}%` : '0%',
      ]),
    ];
    const progressSheet = XLSX.utils.aoa_to_sheet(progressData);
    XLSX.utils.book_append_sheet(wb, progressSheet, '近7天进度');
  }

  // 3. 知识点掌握度
  if (nodeStats.length > 0) {
    const nodeData = [
      ['知识点', '总题数', '正确数', '正确率', '掌握状态'],
      ...nodeStats.map(item => [
        item.name || item.knowledgeNode || '',
        item.total || 0,
        item.correct || 0,
        item.accuracy ? `${(item.accuracy * 100).toFixed(2)}%` : '0%',
        (item.accuracy || 0) >= 0.8 ? '已掌握' : '未掌握',
      ]),
    ];
    const nodeSheet = XLSX.utils.aoa_to_sheet(nodeData);
    XLSX.utils.book_append_sheet(wb, nodeSheet, '知识点掌握度');
  }

  // 4. 题型分布
  if (typeDistribution.length > 0) {
    const typeData = [
      ['题型', '数量', '占比'],
      ...typeDistribution.map(item => [
        item.type || '',
        item.value || 0,
        typeDistribution.reduce((sum, t) => sum + (t.value || 0), 0) > 0
          ? `${((item.value || 0) / typeDistribution.reduce((sum, t) => sum + (t.value || 0), 0) * 100).toFixed(2)}%`
          : '0%',
      ]),
    ];
    const typeSheet = XLSX.utils.aoa_to_sheet(typeData);
    XLSX.utils.book_append_sheet(wb, typeSheet, '题型分布');
  }

  // 5. 学科分布
  if (subjectDistribution.length > 0) {
    const subjectData = [
      ['学科', '数量', '占比'],
      ...subjectDistribution.map(item => [
        item.name || '',
        item.value || 0,
        subjectDistribution.reduce((sum, s) => sum + (s.value || 0), 0) > 0
          ? `${((item.value || 0) / subjectDistribution.reduce((sum, s) => sum + (s.value || 0), 0) * 100).toFixed(2)}%`
          : '0%',
      ]),
    ];
    const subjectSheet = XLSX.utils.aoa_to_sheet(subjectData);
    XLSX.utils.book_append_sheet(wb, subjectSheet, '学科分布');
  }

  // 导出文件
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 导出错题本为Excel
 * @param {Array} wrongQuestions - 错题列表
 * @param {string} filename - 文件名
 */
export function exportWrongQuestionsToExcel(wrongQuestions, filename = '错题本') {
  const wb = XLSX.utils.book_new();

  const data = [
    ['题目', '正确答案', '我的答案', '知识点', '错误次数', '最后错误时间', '掌握状态'],
    ...wrongQuestions.map(item => [
      item.question?.content || item.content || '',
      item.correctAnswer || '',
      item.userAnswer || '',
      item.knowledgeNode?.name || item.knowledgeNodeId || '',
      item.errorCount || 0,
      item.lastErrorAt ? new Date(item.lastErrorAt).toLocaleString('zh-CN') : '',
      item.masteryStatus || '未掌握',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '错题本');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 导出统计数据为Excel
 * @param {Object} stats - 统计数据
 * @param {string} filename - 文件名
 */
export function exportStatsToExcel(stats, filename = '统计数据') {
  const wb = XLSX.utils.book_new();

  // 将统计数据转换为表格格式
  const data = [
    ['统计项', '数值'],
    ...Object.entries(stats).map(([key, value]) => [
      key,
      typeof value === 'number' ? value : String(value),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '统计数据');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 通用Excel导出函数
 * @param {Array<Array>} data - 二维数组数据
 * @param {string} filename - 文件名
 * @param {string} sheetName - 工作表名称
 * @param {Object} options - 选项 { columnWidths }
 */
export function exportToExcel(data, filename = '导出数据', sheetName = 'Sheet1', options = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('数据必须是非空二维数组');
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // 设置列宽
  if (options.columnWidths) {
    ws['!cols'] = options.columnWidths.map(w => ({ wch: w }));
  } else if (data.length > 0) {
    // 自动计算列宽
    const maxCols = Math.max(...data.map(row => row.length));
    ws['!cols'] = Array(maxCols).fill(null).map(() => ({ wch: 15 }));
  }
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 导出学习效率分析为Excel
 * @param {Object} efficiencyData - 学习效率数据
 * @param {string} filename - 文件名
 */
export function exportEfficiencyAnalysisToExcel(efficiencyData, filename = '学习效率分析') {
  const wb = XLSX.utils.book_new();
  
  // 效率概览
  const overviewData = [
    ['学习效率分析报告'],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    [],
    ['效率评分', `${efficiencyData.score}分`],
    ['效率等级', efficiencyData.level],
    [],
    ['指标', '数值'],
    ['正确率', `${(efficiencyData.metrics.accuracy * 100).toFixed(2)}%`],
    ['答题速度（题/小时）', efficiencyData.metrics.questionsPerHour.toFixed(1)],
    ['正确速度（题/小时）', efficiencyData.metrics.correctPerHour.toFixed(1)],
    ['平均每题用时（分钟）', efficiencyData.metrics.avgTimePerQuestion.toFixed(2)],
    ['学习天数', efficiencyData.metrics.studyDays],
    ['平均每日题数', efficiencyData.metrics.avgQuestionsPerDay.toFixed(1)],
  ];
  
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, overviewSheet, '效率概览');
  
  // 建议
  if (efficiencyData.recommendations && efficiencyData.recommendations.length > 0) {
    const recommendationsData = [
      ['改进建议'],
      ...efficiencyData.recommendations.map((rec, index) => [`${index + 1}. ${rec}`]),
    ];
    
    const recSheet = XLSX.utils.aoa_to_sheet(recommendationsData);
    recSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, recSheet, '改进建议');
  }
  
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * 导出学习习惯分析为Excel
 * @param {Object} habitsData - 学习习惯数据
 * @param {string} filename - 文件名
 */
export function exportHabitsAnalysisToExcel(habitsData, filename = '学习习惯分析') {
  const wb = XLSX.utils.book_new();
  
  // 习惯概览
  const overviewData = [
    ['学习习惯分析报告'],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    [],
    ['学习频率', `${(habitsData.frequency.frequency * 100).toFixed(1)}%`],
    ['学习天数', `${habitsData.frequency.studyDays}天`],
    ['平均每日题数', habitsData.frequency.avgQuestionsPerDay.toFixed(1)],
    [],
    ['学习时长统计'],
    ['总学习时长（分钟）', habitsData.duration.totalMinutes],
    ['平均每题时长（分钟）', habitsData.duration.avgMinutes.toFixed(2)],
    ['平均每日时长（分钟）', habitsData.duration.avgDailyMinutes.toFixed(2)],
    [],
    ['学习一致性'],
    ['一致性评分', `${habitsData.consistency.score}分`],
    ['一致性等级', habitsData.consistency.level],
  ];
  
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, overviewSheet, '习惯概览');
  
  // 时间分布
  if (habitsData.timeDistribution && habitsData.timeDistribution.distribution) {
    const timeData = [
      ['时段', '学习次数'],
      ...habitsData.timeDistribution.distribution.map(item => [
        `${item.hour}:00`,
        item.count,
      ]),
    ];
    
    const timeSheet = XLSX.utils.aoa_to_sheet(timeData);
    timeSheet['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, timeSheet, '时间分布');
  }
  
  // 学习模式
  if (habitsData.patterns && habitsData.patterns.length > 0) {
    const patternsData = [
      ['学习模式类型', '描述'],
      ...habitsData.patterns.map(p => [p.type, p.description]),
    ];
    
    const patternsSheet = XLSX.utils.aoa_to_sheet(patternsData);
    patternsSheet['!cols'] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, patternsSheet, '学习模式');
  }
  
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

