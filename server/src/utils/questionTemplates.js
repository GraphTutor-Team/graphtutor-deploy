/**
 * GraphTutor V3.0 - 题目导入模板工具
 * 
 * 功能：生成各种格式的题目导入模板
 */

/**
 * 生成JSON格式的题目模板
 */
export function generateJSONTemplate() {
  return {
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
      {
        type: 'multiple',
        content: '这是一道多选题的题干内容（可以选择多个答案）',
        options: ['选项A', '选项B', '选项C', '选项D'],
        answer: [0, 2],
        difficulty: 4,
        subjectCode: 'CS-DS',
        knowledgeNodeId: 'data-structure:tree',
        tags: ['进阶', '树'],
        explain: '多选题的解析说明',
      },
      {
        type: 'fill',
        content: '这是一道填空题，请在空白处填入正确答案。第一个空是___，第二个空是___。',
        blanks: 2,
        blankAnswers: ['答案1', '答案2'],
        difficulty: 3,
        subjectCode: 'CS-DS',
        knowledgeNodeId: 'data-structure:list',
        tags: ['基础', '列表'],
        explain: '填空题的解析说明',
      },
      {
        type: 'short',
        content: '请简述什么是数据结构？',
        answer: '数据结构是计算机存储、组织数据的方式，包括线性结构（数组、链表）和非线性结构（树、图）等。',
        difficulty: 2,
        subjectCode: 'CS-DS',
        knowledgeNodeId: 'data-structure:basic',
        tags: ['基础', '概念'],
        explain: '简答题的参考答案和解析',
      },
      {
        type: 'judge',
        content: '数组是一种线性数据结构。',
        options: ['正确', '错误'],
        answer: 0,
        difficulty: 1,
        subjectCode: 'CS-DS',
        knowledgeNodeId: 'data-structure:array',
        tags: ['基础', '数组'],
        explain: '判断题的解析说明',
      },
    ],
    metadata: {
      version: '1.0',
      description: 'GraphTutor 题目导入模板',
      supportedTypes: ['single', 'multiple', 'fill', 'short', 'judge', 'coding'],
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * 生成CSV格式的题目模板（表头）
 */
export function generateCSVTemplate() {
  const headers = [
    '题型',
    '题干',
    '选项A',
    '选项B',
    '选项C',
    '选项D',
    '选项E',
    '正确答案',
    '难度',
    '学科代码',
    '知识点ID',
    '标签',
    '解析',
    '空位数量',
    '空位答案',
  ];
  
  const examples = [
    [
      'single',
      '这是一道单选题的题干内容',
      '选项A',
      '选项B',
      '选项C',
      '选项D',
      '',
      '0',
      '3',
      'CS-DS',
      'data-structure:array',
      '基础;数组',
      '这是题目的解析说明',
      '',
      '',
    ],
    [
      'multiple',
      '这是一道多选题的题干内容',
      '选项A',
      '选项B',
      '选项C',
      '选项D',
      '',
      '0,2',
      '4',
      'CS-DS',
      'data-structure:tree',
      '进阶;树',
      '多选题的解析说明',
      '',
      '',
    ],
    [
      'fill',
      '这是一道填空题，请在空白处填入正确答案。第一个空是___，第二个空是___。',
      '',
      '',
      '',
      '',
      '',
      '',
      '3',
      'CS-DS',
      'data-structure:list',
      '基础;列表',
      '填空题的解析说明',
      '2',
      '答案1;答案2',
    ],
    [
      'short',
      '请简述什么是数据结构？',
      '',
      '',
      '',
      '',
      '',
      '数据结构是计算机存储、组织数据的方式...',
      '2',
      'CS-DS',
      'data-structure:basic',
      '基础;概念',
      '简答题的参考答案和解析',
      '',
      '',
    ],
    [
      'judge',
      '数组是一种线性数据结构。',
      '正确',
      '错误',
      '',
      '',
      '',
      '0',
      '1',
      'CS-DS',
      'data-structure:array',
      '基础;数组',
      '判断题的解析说明',
      '',
      '',
    ],
  ];

  return {
    headers,
    examples,
    csv: [headers, ...examples].map(row => row.join(',')).join('\n'),
  };
}

/**
 * 验证题目数据格式
 */
export function validateQuestionData(question, index = 0) {
  const errors = [];

  // 验证题型
  const validTypes = ['single', 'multiple', 'fill', 'short', 'judge', 'coding'];
  if (!question.type || !validTypes.includes(question.type)) {
    errors.push(`第${index + 1}题：题型必须是 ${validTypes.join('、')} 之一`);
  }

  // 验证题干
  if (!question.content || !question.content.trim()) {
    errors.push(`第${index + 1}题：题干不能为空`);
  }

  const type = question.type || 'single';

  // 选择题验证
  if (['single', 'multiple', 'judge'].includes(type)) {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`第${index + 1}题：选择题和判断题至少需要2个选项`);
    }
    if (question.answer === undefined || question.answer === null) {
      errors.push(`第${index + 1}题：必须指定正确答案`);
    }
    // 单选题和判断题：answer 应该是数字
    if (type === 'single' || type === 'judge') {
      if (typeof question.answer !== 'number' || question.answer < 0 || question.answer >= question.options.length) {
        errors.push(`第${index + 1}题：单选题/判断题的答案必须是有效的选项索引`);
      }
    }
    // 多选题：answer 应该是数组
    if (type === 'multiple') {
      if (!Array.isArray(question.answer) || question.answer.length === 0) {
        errors.push(`第${index + 1}题：多选题的答案必须是数组`);
      }
    }
  }

  // 填空题验证
  if (type === 'fill') {
    if (!question.blanks || question.blanks < 1) {
      errors.push(`第${index + 1}题：填空题必须指定空位数量`);
    }
    if (!Array.isArray(question.blankAnswers) || question.blankAnswers.length !== question.blanks) {
      errors.push(`第${index + 1}题：填空题的空位答案数量必须与空位数量一致`);
    }
  }

  // 简答题验证
  if (type === 'short') {
    if (!question.answer || typeof question.answer !== 'string' || !question.answer.trim()) {
      errors.push(`第${index + 1}题：简答题必须提供参考答案`);
    }
  }

  // 编程题验证
  if (type === 'coding') {
    const referenceCode = question.codingMeta?.referenceCode || question.answer;
    if (!referenceCode || typeof referenceCode !== 'string' || !referenceCode.trim()) {
      errors.push(`第${index + 1}题：编程题必须提供参考代码`);
    }
  }

  // 验证难度
  if (question.difficulty !== undefined) {
    const difficulty = parseInt(question.difficulty);
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      errors.push(`第${index + 1}题：难度必须是1-5之间的数字`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 转换CSV行到题目对象
 */
export function csvRowToQuestion(row, headers) {
  const question = {
    type: row[headers.indexOf('题型')] || 'single',
    content: row[headers.indexOf('题干')] || '',
    difficulty: parseInt(row[headers.indexOf('难度')]) || 3,
    subjectCode: row[headers.indexOf('学科代码')] || '',
    knowledgeNodeId: row[headers.indexOf('知识点ID')] || '',
    tags: row[headers.indexOf('标签')] ? row[headers.indexOf('标签')].split(';').filter(t => t.trim()) : [],
    explain: row[headers.indexOf('解析')] || '',
  };

  const type = question.type;

  // 处理选择题
  if (['single', 'multiple', 'judge'].includes(type)) {
    const options = [];
    for (let i = 0; i < 5; i++) {
      const opt = row[headers.indexOf(`选项${String.fromCharCode(65 + i)}`)] || '';
      if (opt.trim()) {
        options.push(opt.trim());
      }
    }
    question.options = options;

    // 处理答案
    const answerStr = row[headers.indexOf('正确答案')] || '';
    if (type === 'multiple') {
      question.answer = answerStr.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a));
    } else {
      question.answer = parseInt(answerStr) || 0;
    }
  }

  // 处理填空题
  if (type === 'fill') {
    question.blanks = parseInt(row[headers.indexOf('空位数量')]) || 1;
    const blankAnswersStr = row[headers.indexOf('空位答案')] || '';
    question.blankAnswers = blankAnswersStr.split(';').map(a => a.trim()).filter(a => a);
  }

  // 处理简答题
  if (type === 'short') {
    question.answer = row[headers.indexOf('正确答案')] || '';
  }

  return question;
}


