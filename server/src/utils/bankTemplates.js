/**
 * GraphTutor V3.0 - 题库导入模板工具
 * 
 * 功能：生成各种格式的题库导入模板
 */

import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * 生成JSON格式的题库模板
 */
export function generateJSONBankTemplate() {
  return {
    banks: [
      {
        name: '数据结构基础题库',
        key: 'ds-basic',
        subjectCode: 'CS-DS',
        description: '数据结构基础题目集合',
        isPublic: true,
        settings: {
          difficultyRange: [1, 2, 3, 4, 5],
          questionTypes: ['single', 'multiple', 'fill', 'short', 'judge'],
          aiEnabled: false,
        },
      },
      {
        name: '算法设计题库',
        key: 'alg-design',
        subjectCode: 'CS-ALG',
        description: '算法设计与分析题目集合',
        isPublic: true,
        settings: {
          difficultyRange: [2, 3, 4, 5],
          questionTypes: ['single', 'multiple', 'short'],
          aiEnabled: true,
        },
      },
      {
        name: '操作系统题库',
        key: 'os-basic',
        subjectCode: 'CS-OS',
        description: '操作系统原理题目集合',
        isPublic: false,
        settings: {
          difficultyRange: [1, 2, 3, 4, 5],
          questionTypes: ['single', 'multiple', 'judge'],
          aiEnabled: false,
        },
      },
    ],
    metadata: {
      version: '1.0',
      description: 'GraphTutor 题库导入模板',
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * 生成CSV格式的题库模板
 */
export function generateCSVBankTemplate() {
  const headers = [
    '题库名称',
    '题库标识',
    '学科代码',
    '描述',
    '是否公开',
    '难度范围',
    '支持题型',
    '启用AI',
  ];
  
  const examples = [
    [
      '数据结构基础题库',
      'ds-basic',
      'CS-DS',
      '数据结构基础题目集合',
      'true',
      '1,2,3,4,5',
      'single,multiple,fill,short,judge',
      'false',
    ],
    [
      '算法设计题库',
      'alg-design',
      'CS-ALG',
      '算法设计与分析题目集合',
      'true',
      '2,3,4,5',
      'single,multiple,short',
      'true',
    ],
  ];

  return {
    headers,
    examples,
    csv: [headers, ...examples].map(row => row.join(',')).join('\n'),
  };
}

/**
 * 生成Excel格式的题库模板
 */
export function generateExcelBankTemplate() {
  const workbook = XLSX.utils.book_new();
  
  const data = [
    // 表头
    ['题库名称', '题库标识', '学科代码', '描述', '是否公开', '难度范围', '支持题型', '启用AI'],
    // 示例数据
    ['数据结构基础题库', 'ds-basic', 'CS-DS', '数据结构基础题目集合', 'true', '1,2,3,4,5', 'single,multiple,fill,short,judge', 'false'],
    ['算法设计题库', 'alg-design', 'CS-ALG', '算法设计与分析题目集合', 'true', '2,3,4,5', 'single,multiple,short', 'true'],
    ['操作系统题库', 'os-basic', 'CS-OS', '操作系统原理题目集合', 'false', '1,2,3,4,5', 'single,multiple,judge', 'false'],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // 设置列宽
  worksheet['!cols'] = [
    { wch: 20 }, // 题库名称
    { wch: 15 }, // 题库标识
    { wch: 12 }, // 学科代码
    { wch: 30 }, // 描述
    { wch: 10 }, // 是否公开
    { wch: 15 }, // 难度范围
    { wch: 30 }, // 支持题型
    { wch: 10 }, // 启用AI
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '题库模板');
  
  // 添加说明工作表
  const instructions = [
    ['字段说明'],
    ['题库名称', '必填，题库的显示名称'],
    ['题库标识', '可选，唯一标识符，如不填写会自动生成'],
    ['学科代码', '可选，关联的学科代码，如CS-DS'],
    ['描述', '可选，题库的描述信息'],
    ['是否公开', 'true=公开，false=私有，默认true'],
    ['难度范围', '逗号分隔，如"1,2,3,4,5"表示支持1-5级难度'],
    ['支持题型', '逗号分隔，如"single,multiple"表示支持单选和多选'],
    ['启用AI', 'true=启用AI生成，false=不启用，默认false'],
    ['', ''],
    ['支持的题型'],
    ['single', '单选题'],
    ['multiple', '多选题'],
    ['fill', '填空题'],
    ['short', '简答题'],
    ['judge', '判断题'],
  ];
  
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionSheet['!cols'] = [{ wch: 15 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '使用说明');
  
  return workbook;
}

/**
 * 生成Word格式的题库模板
 */
export async function generateWordBankTemplate() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'GraphTutor 题库导入模板',
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          text: '',
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '题库数据格式（JSON）：',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: JSON.stringify({
                banks: [
                  {
                    name: '数据结构基础题库',
                    key: 'ds-basic',
                    subjectCode: 'CS-DS',
                    description: '数据结构基础题目集合',
                    isPublic: true,
                    settings: {
                      difficultyRange: [1, 2, 3, 4, 5],
                      questionTypes: ['single', 'multiple'],
                      aiEnabled: false,
                    },
                  },
                ],
              }, null, 2),
              font: 'Courier New',
            }),
          ],
        }),
        new Paragraph({
          text: '',
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '字段说明：',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• name（必填）：题库名称',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• key（可选）：题库唯一标识，如不填写会自动生成',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• subjectCode（可选）：关联的学科代码',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• description（可选）：题库描述',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• isPublic（可选）：是否公开，默认true',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• settings（可选）：题库设置，包括难度范围、支持题型等',
            }),
          ],
        }),
      ],
    }],
  });
  
  return doc;
}

/**
 * 验证题库数据格式
 */
export function validateBankData(bank, index = 0) {
  const errors = [];

  // 验证名称
  if (!bank.name || !bank.name.trim()) {
    errors.push(`第${index + 1}个题库：名称不能为空`);
  }

  // 验证key格式（如果提供）
  if (bank.key && !/^[a-z0-9-]+$/.test(bank.key)) {
    errors.push(`第${index + 1}个题库：key只能包含小写字母、数字和连字符`);
  }

  // 验证学科代码格式（如果提供）
  if (bank.subjectCode && !/^[A-Z0-9-]+$/.test(bank.subjectCode)) {
    errors.push(`第${index + 1}个题库：学科代码格式不正确`);
  }

  // 验证难度范围
  if (bank.settings?.difficultyRange) {
    if (!Array.isArray(bank.settings.difficultyRange)) {
      errors.push(`第${index + 1}个题库：难度范围必须是数组`);
    } else {
      const invalid = bank.settings.difficultyRange.some(d => d < 1 || d > 5);
      if (invalid) {
        errors.push(`第${index + 1}个题库：难度范围必须在1-5之间`);
      }
    }
  }

  // 验证题型
  if (bank.settings?.questionTypes) {
    const validTypes = ['single', 'multiple', 'fill', 'short', 'judge'];
    if (!Array.isArray(bank.settings.questionTypes)) {
      errors.push(`第${index + 1}个题库：支持题型必须是数组`);
    } else {
      const invalid = bank.settings.questionTypes.some(t => !validTypes.includes(t));
      if (invalid) {
        errors.push(`第${index + 1}个题库：题型必须是 ${validTypes.join('、')} 之一`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 转换CSV行到题库对象
 */
export function csvRowToBank(row, headers) {
  const bank = {
    name: row[headers.indexOf('题库名称')] || '',
    key: row[headers.indexOf('题库标识')] || undefined,
    subjectCode: row[headers.indexOf('学科代码')] || '',
    description: row[headers.indexOf('描述')] || '',
    isPublic: row[headers.indexOf('是否公开')] !== 'false',
  };

  // 解析难度范围
  const difficultyRangeStr = row[headers.indexOf('难度范围')] || '1,2,3,4,5';
  if (difficultyRangeStr) {
    bank.settings = {
      difficultyRange: difficultyRangeStr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 5),
    };
  }

  // 解析支持题型
  const questionTypesStr = row[headers.indexOf('支持题型')] || 'single';
  if (questionTypesStr) {
    bank.settings = bank.settings || {};
    bank.settings.questionTypes = questionTypesStr.split(',').map(t => t.trim()).filter(t => t);
  }

  // 解析启用AI
  const aiEnabledStr = row[headers.indexOf('启用AI')] || 'false';
  if (bank.settings) {
    bank.settings.aiEnabled = aiEnabledStr === 'true';
  }

  return bank;
}

