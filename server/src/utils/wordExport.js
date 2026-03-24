/**
 * GraphTutor V3.0 - Word导出工具（服务端）
 * 
 * 功能：将数据导出为Word格式
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';

/**
 * 导出学习报告为Word
 * @param {Object} data - 报告数据
 * @returns {Promise<Buffer>} Word文档Buffer
 */
export async function exportLearningReportToWord(data) {
  const {
    stats = {},
    progress7d = [],
    nodeStats = [],
    typeDistribution = [],
    subjectDistribution = [],
  } = data;

  const children = [];

  // 标题
  children.push(
    new Paragraph({
      text: '学习报告',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    })
  );

  // 生成时间
  children.push(
    new Paragraph({
      text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
      spacing: { after: 200 },
    })
  );

  // 总体统计
  children.push(
    new Paragraph({
      text: '总体统计',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  );

  const statsTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('指标')] }),
          new TableCell({ children: [new Paragraph('数值')] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('总题数')] }),
          new TableCell({ children: [new Paragraph(String(stats.totalQuestions || 0))] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('总正确数')] }),
          new TableCell({ children: [new Paragraph(String(stats.totalCorrect || 0))] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('总错误数')] }),
          new TableCell({ children: [new Paragraph(String(stats.totalWrong || 0))] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('平均正确率')] }),
          new TableCell({
            children: [
              new Paragraph(
                stats.averageAccuracy ? `${(stats.averageAccuracy * 100).toFixed(2)}%` : '0%'
              ),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('学习天数')] }),
          new TableCell({ children: [new Paragraph(String(stats.studyDays || 0))] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('总学习时长（分钟）')] }),
          new TableCell({ children: [new Paragraph(String(stats.totalDuration || 0))] }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  children.push(statsTable);

  // 近7天学习进度
  if (progress7d.length > 0) {
    children.push(
      new Paragraph({
        text: '近7天学习进度',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    const progressRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('日期')] }),
          new TableCell({ children: [new Paragraph('总题数')] }),
          new TableCell({ children: [new Paragraph('正确数')] }),
          new TableCell({ children: [new Paragraph('错误数')] }),
          new TableCell({ children: [new Paragraph('正确率')] }),
        ],
      }),
      ...progress7d.map(item =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(item.day || item.date || '')] }),
            new TableCell({ children: [new Paragraph(String(item.total || 0))] }),
            new TableCell({ children: [new Paragraph(String(item.correct || 0))] }),
            new TableCell({
              children: [new Paragraph(String((item.total || 0) - (item.correct || 0)))],
            }),
            new TableCell({
              children: [
                new Paragraph(
                  item.accuracy ? `${(item.accuracy * 100).toFixed(2)}%` : '0%'
                ),
              ],
            }),
          ],
        })
      ),
    ];

    const progressTable = new Table({
      rows: progressRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    children.push(progressTable);
  }

  // 知识点掌握度
  if (nodeStats.length > 0) {
    children.push(
      new Paragraph({
        text: '知识点掌握度',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    const nodeRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('知识点')] }),
          new TableCell({ children: [new Paragraph('总题数')] }),
          new TableCell({ children: [new Paragraph('正确数')] }),
          new TableCell({ children: [new Paragraph('正确率')] }),
          new TableCell({ children: [new Paragraph('掌握状态')] }),
        ],
      }),
      ...nodeStats.map(item =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(item.name || item.knowledgeNode || '')] }),
            new TableCell({ children: [new Paragraph(String(item.total || 0))] }),
            new TableCell({ children: [new Paragraph(String(item.correct || 0))] }),
            new TableCell({
              children: [
                new Paragraph(item.accuracy ? `${(item.accuracy * 100).toFixed(2)}%` : '0%'),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph((item.accuracy || 0) >= 0.8 ? '已掌握' : '未掌握'),
              ],
            }),
          ],
        })
      ),
    ];

    const nodeTable = new Table({
      rows: nodeRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    children.push(nodeTable);
  }

  // 创建文档
  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  // 生成Buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * 导出学习笔记为Word
 * @param {Object} note - 笔记数据
 * @returns {Promise<Buffer>} Word文档Buffer
 */
export async function exportNoteToWord(note) {
  const children = [];

  // 标题
  children.push(
    new Paragraph({
      text: note.title || '学习笔记',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    })
  );

  // 元信息
  if (note.createdAt) {
    children.push(
      new Paragraph({
        text: `创建时间：${new Date(note.createdAt).toLocaleString('zh-CN')}`,
        spacing: { after: 200 },
      })
    );
  }

  // 内容（简单处理，实际应该解析Markdown）
  if (note.content) {
    const contentLines = note.content.split('\n');
    contentLines.forEach(line => {
      if (line.trim()) {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 100 },
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

