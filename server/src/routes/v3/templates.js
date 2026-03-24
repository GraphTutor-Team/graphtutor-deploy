/**
 * GraphTutor V3.0 - 统一模板下载API
 * 
 * 路径：/api/v3/templates
 * 功能：提供题目和节点的多格式模板下载（JSON、CSV、Excel、Word）
 */

import express from 'express';
import { generateJSONTemplate, generateCSVTemplate } from '../../utils/questionTemplates.js';
import { generateExcelQuestionTemplate, generateWordQuestionTemplate, generateExcelNodeTemplate, generateWordNodeTemplate } from '../../utils/templateGenerators.js';
import { generateJSONBankTemplate, generateCSVBankTemplate, generateExcelBankTemplate, generateWordBankTemplate } from '../../utils/bankTemplates.js';
import * as XLSX from 'xlsx';
import { Packer } from 'docx';

const router = express.Router();

/**
 * GET /api/v3/templates/questions/:format
 * 下载题目导入模板
 * format: json, csv, xlsx, docx
 */
router.get('/questions/:format', async (req, res) => {
  try {
    const { format } = req.params;
    
    switch (format.toLowerCase()) {
      case 'json': {
        const template = generateJSONTemplate();
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="question-template.json"');
        return res.json(template);
      }
      
      case 'csv': {
        const template = generateCSVTemplate();
        res.setHeader('Content-Type', 'text/csv;charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="question-template.csv"');
        const BOM = '\uFEFF';
        return res.send(BOM + template.csv);
      }
      
      case 'xlsx':
      case 'excel': {
        const workbook = generateExcelQuestionTemplate();
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="question-template.xlsx"');
        return res.send(buffer);
      }
      
      case 'docx':
      case 'word': {
        const doc = await generateWordQuestionTemplate();
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="question-template.docx"');
        return res.send(buffer);
      }
      
      default:
        return res.status(400).json({
          success: false,
          message: `不支持的文件格式: ${format}，支持格式: json, csv, xlsx, docx`,
        });
    }
  } catch (err) {
    console.error('GET /api/v3/templates/questions/:format error:', err);
    res.status(500).json({
      success: false,
      message: '生成模板失败',
    });
  }
});

/**
 * GET /api/v3/templates/nodes/:format
 * 下载节点导入模板
 * format: json, xlsx, docx
 */
router.get('/nodes/:format', async (req, res) => {
  try {
    const { format } = req.params;
    
    switch (format.toLowerCase()) {
      case 'json': {
        const template = {
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
        };
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="node-template.json"');
        return res.json(template);
      }
      
      case 'xlsx':
      case 'excel': {
        const workbook = generateExcelNodeTemplate();
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="node-template.xlsx"');
        return res.send(buffer);
      }
      
      case 'docx':
      case 'word': {
        const doc = await generateWordNodeTemplate();
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="node-template.docx"');
        return res.send(buffer);
      }
      
      default:
        return res.status(400).json({
          success: false,
          message: `不支持的文件格式: ${format}，支持格式: json, xlsx, docx`,
        });
    }
  } catch (err) {
    console.error('GET /api/v3/templates/nodes/:format error:', err);
    res.status(500).json({
      success: false,
      message: '生成模板失败',
    });
  }
});

/**
 * GET /api/v3/templates
 * 获取所有可用的模板格式
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      questionTemplates: {
        formats: [
          {
            type: 'json',
            name: 'JSON格式',
            description: '适合程序化导入，支持所有题型和字段',
            downloadUrl: '/api/v3/templates/questions/json',
            filename: 'question-template.json',
          },
          {
            type: 'csv',
            name: 'CSV格式',
            description: '适合Excel编辑，支持批量导入',
            downloadUrl: '/api/v3/templates/questions/csv',
            filename: 'question-template.csv',
          },
          {
            type: 'xlsx',
            name: 'Excel格式',
            description: 'Excel工作簿，包含示例和使用说明',
            downloadUrl: '/api/v3/templates/questions/xlsx',
            filename: 'question-template.xlsx',
          },
          {
            type: 'docx',
            name: 'Word格式',
            description: 'Word文档，包含格式说明和示例',
            downloadUrl: '/api/v3/templates/questions/docx',
            filename: 'question-template.docx',
          },
        ],
      },
      nodeTemplates: {
        formats: [
          {
            type: 'json',
            name: 'JSON格式',
            description: '节点数据导入模板',
            downloadUrl: '/api/v3/templates/nodes/json',
            filename: 'node-template.json',
          },
          {
            type: 'xlsx',
            name: 'Excel格式',
            description: 'Excel工作簿，包含示例节点',
            downloadUrl: '/api/v3/templates/nodes/xlsx',
            filename: 'node-template.xlsx',
          },
          {
            type: 'docx',
            name: 'Word格式',
            description: 'Word文档，包含格式说明',
            downloadUrl: '/api/v3/templates/nodes/docx',
            filename: 'node-template.docx',
          },
        ],
      },
    },
  });
});

export default router;

