/**
 * GraphTutor V3.0 - 多格式模板生成工具
 * 
 * 功能：生成题目和节点的导入模板（JSON、CSV、Excel、Word）
 */

import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * 生成Excel格式的题目导入模板
 */
export function generateExcelQuestionTemplate() {
  const workbook = XLSX.utils.book_new();
  
  // 创建题目数据
  const data = [
    // 表头
    ['题型', '题干', '选项A', '选项B', '选项C', '选项D', '选项E', '正确答案', '难度', '学科代码', '知识点ID', '标签', '解析', '空位数量', '空位答案'],
    // 单选题示例
    ['single', '这是一道单选题的题干内容', '选项A', '选项B', '选项C', '选项D', '', '0', '3', 'CS-DS', 'data-structure:array', '基础;数组', '这是题目的解析说明', '', ''],
    // 多选题示例
    ['multiple', '这是一道多选题的题干内容（可以选择多个答案）', '选项A', '选项B', '选项C', '选项D', '', '0,2', '4', 'CS-DS', 'data-structure:tree', '进阶;树', '多选题的解析说明', '', ''],
    // 填空题示例
    ['fill', '这是一道填空题，请在空白处填入正确答案。第一个空是___，第二个空是___。', '', '', '', '', '', '', '3', 'CS-DS', 'data-structure:list', '基础;列表', '填空题的解析说明', '2', '答案1;答案2'],
    // 简答题示例
    ['short', '请简述什么是数据结构？', '', '', '', '', '', '数据结构是计算机存储、组织数据的方式，包括线性结构（数组、链表）和非线性结构（树、图）等。', '2', 'CS-DS', 'data-structure:basic', '基础;概念', '简答题的参考答案和解析', '', ''],
    // 判断题示例
    ['judge', '数组是一种线性数据结构。', '正确', '错误', '', '', '', '0', '1', 'CS-DS', 'data-structure:array', '基础;数组', '判断题的解析说明', '', ''],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // 设置列宽
  worksheet['!cols'] = [
    { wch: 10 }, // 题型
    { wch: 40 }, // 题干
    { wch: 15 }, // 选项A
    { wch: 15 }, // 选项B
    { wch: 15 }, // 选项C
    { wch: 15 }, // 选项D
    { wch: 15 }, // 选项E
    { wch: 15 }, // 正确答案
    { wch: 8 },  // 难度
    { wch: 12 }, // 学科代码
    { wch: 20 }, // 知识点ID
    { wch: 15 }, // 标签
    { wch: 30 }, // 解析
    { wch: 10 }, // 空位数量
    { wch: 20 }, // 空位答案
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '题目模板');
  
  // 添加说明工作表
  const instructions = [
    ['字段说明'],
    ['题型', 'single=单选题, multiple=多选题, fill=填空题, short=简答题, judge=判断题'],
    ['题干', '题目的主要内容，必填'],
    ['选项A-E', '选择题的选项，选择题必填'],
    ['正确答案', '单选题/判断题：数字(0-4)或字母(A-E)\n多选题：逗号分隔，如"0,2"或"A,C"\n填空题：分号分隔，如"答案1;答案2"\n简答题：参考答案文本'],
    ['难度', '1-5，1=非常基础，5=很难'],
    ['学科代码', '如CS-DS（数据结构）'],
    ['知识点ID', '如data-structure:array'],
    ['标签', '分号分隔，如"基础;数组"'],
    ['解析', '题目的解析说明'],
    ['空位数量', '填空题必填，空位的数量'],
    ['空位答案', '填空题必填，分号分隔的答案'],
  ];
  
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionSheet['!cols'] = [{ wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '使用说明');
  
  return workbook;
}

/**
 * 生成Word格式的题目导入模板
 */
export async function generateWordQuestionTemplate() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'GraphTutor 题目导入模板',
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
              text: '支持的题型：',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• single（单选题）：从多个选项中选择一个正确答案',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• multiple（多选题）：从多个选项中选择多个正确答案',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• fill（填空题）：在空白处填入正确答案',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• short（简答题）：简要回答题目，需要提供参考答案',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '• judge（判断题）：判断题目描述是否正确',
            }),
          ],
        }),
        new Paragraph({
          text: '',
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '题目数据格式（JSON）：',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: JSON.stringify({
                questions: [
                  {
                    type: 'single',
                    content: '这是一道单选题的题干内容',
                    options: ['选项A', '选项B', '选项C', '选项D'],
                    answer: 0,
                    difficulty: 3,
                    subjectCode: 'CS-DS',
                    knowledgeNodeId: 'data-structure:array',
                    tags: ['基础', '数组'],
                    explain: '这是题目的解析说明',
                  },
                ],
              }, null, 2),
              font: 'Courier New',
            }),
          ],
        }),
      ],
    }],
  });
  
  return doc;
}

/**
 * 生成Excel格式的节点导入模板
 */
export function generateExcelNodeTemplate() {
  const workbook = XLSX.utils.book_new();
  
  const data = [
    ['key', 'name', 'order'],
    ['os-process', '进程', '0'],
    ['os-thread', '线程', '1'],
    ['os-scheduling', '进程调度', '2'],
    ['ds-array', '数组', '0'],
    ['ds-linked-list', '链表', '1'],
    ['ds-tree', '树', '2'],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 20 }, // key
    { wch: 20 }, // name
    { wch: 10 }, // order
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '节点模板');
  
  return workbook;
}

/**
 * 生成Word格式的节点导入模板
 */
export async function generateWordNodeTemplate() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'GraphTutor 节点导入模板',
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
              text: '节点数据格式（JSON）：',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: JSON.stringify({
                nodes: [
                  {
                    key: 'os-process',
                    name: '进程',
                    order: 0,
                  },
                  {
                    key: 'os-thread',
                    name: '线程',
                    order: 1,
                  },
                ],
              }, null, 2),
              font: 'Courier New',
            }),
          ],
        }),
      ],
    }],
  });
  
  return doc;
}

