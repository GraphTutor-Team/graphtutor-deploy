/**
 * GraphTutor V3.0 - 导出工具函数
 * 
 * 作用：提供多种格式的数据导出功能，包括JSON、CSV、Excel、PDF等格式
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户数据导出)
 *   - pages/admin/UserImportModal.jsx (用户导入，使用CSV/Excel解析)
 *   - components/LearningReport.jsx (学习报告导出)
 * 技术栈：
 *   - Blob API (文件生成)
 *   - FileReader API (文件读取)
 *   - CSV解析 (PapaParse或手动解析)
 *   - Excel解析 (xlsx库)
 */

/**
 * 导出为JSON文件
 */
export function exportToJSON(data, filename = 'export.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * 导出为CSV文件
 */
export function exportToCSV(data, filename = 'export.csv', headers = null) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('数据必须是非空数组');
  }

  // 如果没有提供表头，从第一条数据中提取
  const csvHeaders = headers || Object.keys(data[0]);
  
  // 构建CSV内容
  const rows = [
    csvHeaders.join(','), // 表头
    ...data.map((row) =>
      csvHeaders.map((header) => {
        const value = row[header];
        // 处理包含逗号、引号或换行符的值
        if (value === null || value === undefined) {
          return '';
        }
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ),
  ];

  const csvContent = rows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * 导出题目为JSON格式
 */
export function exportQuestions(questions, filename = 'questions.json') {
  const exportData = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    count: questions.length,
    questions: questions.map((q) => ({
      type: q.type || 'single',
      content: q.content,
      options: q.options,
      answer: q.answer !== undefined ? q.answer : q.answerIndex,
      difficulty: q.difficulty,
      subjectCode: q.subjectCode?.code || q.subjectCode,
      knowledgeNodeId: q.knowledgeNodeId,
      tags: q.tags,
      explain: q.explain,
      qid: q.qid,
      blanks: q.blanks,
      blankAnswers: q.blankAnswers,
    })),
  };
  
  exportToJSON(exportData, filename);
}

/**
 * 导出题目为CSV格式
 */
export function exportQuestionsToCSV(questions, filename = 'questions.csv') {
  const csvData = questions.map((q) => {
    const type = q.type || 'single';
    const row = {
      '题型': type,
      '题干': q.content,
      '难度': q.difficulty,
      '学科代码': q.subjectCode?.code || q.subjectCode || '',
      '知识点ID': q.knowledgeNodeId || '',
      '标签': q.tags?.join(';') || '',
      '解析': q.explain || '',
    };

    // 选择题和判断题
    if (['single', 'multiple', 'judge'].includes(type)) {
      row['选项A'] = q.options?.[0] || '';
      row['选项B'] = q.options?.[1] || '';
      row['选项C'] = q.options?.[2] || '';
      row['选项D'] = q.options?.[3] || '';
      row['选项E'] = q.options?.[4] || '';
      
      if (type === 'multiple') {
        row['正确答案'] = Array.isArray(q.answer) ? q.answer.join(',') : '';
      } else {
        const answer = q.answer !== undefined ? q.answer : q.answerIndex;
        row['正确答案'] = typeof answer === 'number' ? String.fromCharCode(65 + answer) : answer;
      }
    }

    // 填空题
    if (type === 'fill') {
      row['空位数量'] = q.blanks || '';
      row['空位答案'] = q.blankAnswers?.join(';') || '';
    }

    // 简答题
    if (type === 'short') {
      row['正确答案'] = q.answer || '';
    }

    return row;
  });

  const headers = Object.keys(csvData[0] || {});
  exportToCSV(csvData, filename, headers);
}

/**
 * 导出题库为JSON格式
 */
export function exportBanks(banks, filename = 'banks.json') {
  const exportData = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    count: banks.length,
    banks: banks.map((bank) => ({
      name: bank.name,
      key: bank.key,
      description: bank.description,
      subjectCode: bank.subjectCode?.code || bank.subjectCode,
      isPublic: bank.isPublic,
      settings: bank.settings,
    })),
  };
  
  exportToJSON(exportData, filename);
}

/**
 * 下载Blob文件
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 从文件读取JSON数据
 */
export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('JSON格式错误: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 从文件读取CSV数据
 */
export function importFromCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
          reject(new Error('CSV文件至少需要表头和数据行'));
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim());
        const data = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        resolve(data);
      } catch (error) {
        reject(new Error('CSV解析错误: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 从文件读取Excel数据
 */
export async function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // 动态导入xlsx库
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Excel解析错误: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析CSV行（处理引号和逗号）
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // 跳过下一个引号
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * 导出学习报告为JSON格式
 * @param {Object} reportData - 学习报告数据
 * @param {string} filename - 文件名
 */
export function exportLearningReport(reportData, filename = 'learning-report.json') {
  const report = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    reportType: 'learning-report',
    user: reportData.user || {},
    period: reportData.period || '30天',
    overall: reportData.overall || {},
    knowledgeNodes: reportData.knowledgeNodes || [],
    bySubject: reportData.bySubject || [],
    byDifficulty: reportData.byDifficulty || [],
    byType: reportData.byType || [],
    trend: reportData.trend || [],
    summary: {
      totalQuestions: reportData.overall?.total || 0,
      correctRate: reportData.overall?.accuracy || 0,
      weakKnowledgeNodes: (reportData.knowledgeNodes || [])
        .filter(n => n.accuracy < 60)
        .slice(0, 5)
        .map(n => ({
          knowledgeNodeId: n.knowledgeNodeId,
          accuracy: n.accuracy,
          total: n.total,
        })),
      strongKnowledgeNodes: (reportData.knowledgeNodes || [])
        .filter(n => n.accuracy >= 80)
        .slice(0, 5)
        .map(n => ({
          knowledgeNodeId: n.knowledgeNodeId,
          accuracy: n.accuracy,
          total: n.total,
        })),
    },
  };
  
  exportToJSON(report, filename);
}

/**
 * 导出学习报告为CSV格式
 * @param {Object} reportData - 学习报告数据
 * @param {string} filename - 文件名
 */
export function exportLearningReportToCSV(reportData, filename = 'learning-report.csv') {
  const csvRows = [];
  
  // 总体统计
  csvRows.push(['总体统计', '']);
  csvRows.push(['总答题数', reportData.overall?.total || 0]);
  csvRows.push(['正确数', reportData.overall?.correct || 0]);
  csvRows.push(['错误数', reportData.overall?.wrong || 0]);
  csvRows.push(['正确率(%)', (reportData.overall?.accuracy || 0).toFixed(2)]);
  csvRows.push(['平均答题时间(ms)', (reportData.overall?.avgTimeSpent || 0).toFixed(0)]);
  csvRows.push(['', '']);
  
  // 知识点掌握度
  if (reportData.knowledgeNodes && reportData.knowledgeNodes.length > 0) {
    csvRows.push(['知识点掌握度', '']);
    csvRows.push(['知识点ID', '总题数', '正确数', '错误数', '正确率(%)', '平均答题时间(ms)', '最后练习时间']);
    reportData.knowledgeNodes.forEach((node) => {
      csvRows.push([
        node.knowledgeNodeId || '未标注',
        node.total || 0,
        node.correct || 0,
        node.wrong || 0,
        (node.accuracy || 0).toFixed(2),
        (node.avgTimeSpent || 0).toFixed(0),
        node.lastPractice ? new Date(node.lastPractice).toLocaleString('zh-CN') : '',
      ]);
    });
    csvRows.push(['', '']);
  }
  
  // 学科分布
  if (reportData.bySubject && reportData.bySubject.length > 0) {
    csvRows.push(['学科分布', '']);
    csvRows.push(['学科代码', '总题数', '正确数', '正确率(%)', '知识点数量']);
    reportData.bySubject.forEach((subject) => {
      csvRows.push([
        subject.subjectCode || '未分类',
        subject.total || 0,
        subject.correct || 0,
        (subject.accuracy || 0).toFixed(2),
        subject.knowledgeNodeCount || 0,
      ]);
    });
    csvRows.push(['', '']);
  }
  
  // 难度分布
  if (reportData.byDifficulty && reportData.byDifficulty.length > 0) {
    csvRows.push(['难度分布', '']);
    csvRows.push(['难度', '总题数', '正确数', '正确率(%)']);
    reportData.byDifficulty.forEach((diff) => {
      csvRows.push([
        `难度${diff.difficulty}`,
        diff.total || 0,
        diff.correct || 0,
        (diff.accuracy || 0).toFixed(2),
      ]);
    });
    csvRows.push(['', '']);
  }
  
  // 题型分布
  if (reportData.byType && reportData.byType.length > 0) {
    csvRows.push(['题型分布', '']);
    csvRows.push(['题型', '总题数', '正确数', '正确率(%)']);
    reportData.byType.forEach((type) => {
      const typeNames = {
        single: '单选题',
        multiple: '多选题',
        judge: '判断题',
        fill: '填空题',
        short: '简答题',
      };
      csvRows.push([
        typeNames[type.type] || type.type,
        type.total || 0,
        type.correct || 0,
        (type.accuracy || 0).toFixed(2),
      ]);
    });
  }
  
  // 转换为CSV格式
  const csvContent = csvRows.map(row => 
    row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * 导出学习趋势数据为CSV
 * @param {Array} trendData - 趋势数据
 * @param {string} filename - 文件名
 */
export function exportLearningTrendToCSV(trendData, filename = 'learning-trend.csv') {
  if (!Array.isArray(trendData) || trendData.length === 0) {
    throw new Error('趋势数据必须是非空数组');
  }
  
  const csvData = trendData.map((item) => ({
    '日期': item.date,
    '答题数': item.total || 0,
    '正确数': item.correct || 0,
    '错误数': item.wrong || 0,
    '正确率(%)': (item.accuracy || 0).toFixed(2),
    '平均答题时间(ms)': (item.avgTimeSpent || 0).toFixed(0),
  }));
  
  exportToCSV(csvData, filename);
}

/**
 * 生成学习报告文本内容（用于复制或打印）
 * @param {Object} reportData - 学习报告数据
 * @returns {string} 报告文本
 */
export function generateLearningReportText(reportData) {
  const lines = [];
  
  lines.push('='.repeat(60));
  lines.push('学习报告');
  lines.push('='.repeat(60));
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push(`统计周期: ${reportData.period || '30天'}`);
  lines.push('');
  
  // 总体统计
  lines.push('【总体统计】');
  lines.push(`总答题数: ${reportData.overall?.total || 0}`);
  lines.push(`正确数: ${reportData.overall?.correct || 0}`);
  lines.push(`错误数: ${reportData.overall?.wrong || 0}`);
  lines.push(`正确率: ${(reportData.overall?.accuracy || 0).toFixed(2)}%`);
  lines.push('');
  
  // 薄弱知识点
  if (reportData.knowledgeNodes && reportData.knowledgeNodes.length > 0) {
    const weakNodes = reportData.knowledgeNodes
      .filter(n => n.accuracy < 60)
      .slice(0, 5);
    
    if (weakNodes.length > 0) {
      lines.push('【薄弱知识点（需要加强）】');
      weakNodes.forEach((node, idx) => {
        lines.push(`${idx + 1}. ${node.knowledgeNodeId || '未标注'}`);
        lines.push(`   正确率: ${(node.accuracy || 0).toFixed(2)}% (${node.correct}/${node.total})`);
      });
      lines.push('');
    }
  }
  
  // 优势知识点
  if (reportData.knowledgeNodes && reportData.knowledgeNodes.length > 0) {
    const strongNodes = reportData.knowledgeNodes
      .filter(n => n.accuracy >= 80)
      .slice(0, 5);
    
    if (strongNodes.length > 0) {
      lines.push('【优势知识点（掌握良好）】');
      strongNodes.forEach((node, idx) => {
        lines.push(`${idx + 1}. ${node.knowledgeNodeId || '未标注'}`);
        lines.push(`   正确率: ${(node.accuracy || 0).toFixed(2)}% (${node.correct}/${node.total})`);
      });
      lines.push('');
    }
  }
  
  // 学科分布
  if (reportData.bySubject && reportData.bySubject.length > 0) {
    lines.push('【学科分布】');
    reportData.bySubject.forEach((subject) => {
      lines.push(`${subject.subjectCode || '未分类'}: ${(subject.accuracy || 0).toFixed(2)}% (${subject.correct}/${subject.total})`);
    });
    lines.push('');
  }
  
  // 难度分布
  if (reportData.byDifficulty && reportData.byDifficulty.length > 0) {
    lines.push('【难度分布】');
    reportData.byDifficulty.forEach((diff) => {
      lines.push(`难度${diff.difficulty}: ${(diff.accuracy || 0).toFixed(2)}% (${diff.correct}/${diff.total})`);
    });
    lines.push('');
  }
  
  // 题型分布
  if (reportData.byType && reportData.byType.length > 0) {
    lines.push('【题型分布】');
    const typeNames = {
      single: '单选题',
      multiple: '多选题',
      judge: '判断题',
      fill: '填空题',
      short: '简答题',
    };
    reportData.byType.forEach((type) => {
      lines.push(`${typeNames[type.type] || type.type}: ${(type.accuracy || 0).toFixed(2)}% (${type.correct}/${type.total})`);
    });
  }
  
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('报告结束');
  
  return lines.join('\n');
}