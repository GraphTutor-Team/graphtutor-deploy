/**
 * GraphTutor V3.0 - 题目模板下载API
 * 
 * 路径：/api/v3/question-templates
 * 功能：提供题目导入模板下载
 */

import express from 'express';
import { generateJSONTemplate, generateCSVTemplate } from '../../utils/questionTemplates.js';

const router = express.Router();

/**
 * GET /api/v3/question-templates/json
 * 下载JSON格式的题目导入模板
 */
router.get('/json', (req, res) => {
  try {
    const template = generateJSONTemplate();
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="question-template.json"');
    res.json(template);
  } catch (err) {
    console.error('GET /api/v3/question-templates/json error:', err);
    res.status(500).json({
      success: false,
      message: '生成模板失败',
    });
  }
});

/**
 * GET /api/v3/question-templates/csv
 * 下载CSV格式的题目导入模板
 */
router.get('/csv', (req, res) => {
  try {
    const template = generateCSVTemplate();
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="question-template.csv"');
    
    // 添加BOM以支持Excel正确显示中文
    const BOM = '\uFEFF';
    res.send(BOM + template.csv);
  } catch (err) {
    console.error('GET /api/v3/question-templates/csv error:', err);
    res.status(500).json({
      success: false,
      message: '生成模板失败',
    });
  }
});

/**
 * GET /api/v3/question-templates
 * 获取所有可用的模板格式
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      formats: [
        {
          type: 'json',
          name: 'JSON格式',
          description: '适合程序化导入，支持所有题型和字段',
          downloadUrl: '/api/v3/question-templates/json',
          filename: 'question-template.json',
        },
        {
          type: 'csv',
          name: 'CSV格式',
          description: '适合Excel编辑，支持批量导入',
          downloadUrl: '/api/v3/question-templates/csv',
          filename: 'question-template.csv',
        },
      ],
      supportedTypes: [
        {
          type: 'single',
          name: '单选题',
          description: '从多个选项中选择一个正确答案',
        },
        {
          type: 'multiple',
          name: '多选题',
          description: '从多个选项中选择多个正确答案',
        },
        {
          type: 'fill',
          name: '填空题',
          description: '在空白处填入正确答案',
        },
        {
          type: 'short',
          name: '简答题',
          description: '简要回答题目，需要提供参考答案',
        },
        {
          type: 'judge',
          name: '判断题',
          description: '判断题目描述是否正确',
        },
      ],
    },
  });
});

export default router;


