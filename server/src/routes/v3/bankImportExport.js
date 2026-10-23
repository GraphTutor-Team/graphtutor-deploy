/**
 * GraphTutor V3.0 - 题库导入导出API
 * 
 * 路径：/api/v3/banks/import, /api/v3/banks/export
 * 功能：提供题库的批量导入导出功能，支持JSON、CSV格式
 */

import express from 'express';
import QuestionBank from '../../models/QuestionBank.js';
import Question from '../../models/Question.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { sanitizeString, validateInt } from '../../middleware/validation.js';
import { updateBankQuestionCount } from '../../services/bankStats.js';
import { attachSubjectNames } from '../../services/subjectNames.js';

const router = express.Router();

/**
 * POST /api/v3/banks/import
 * 批量导入题库
 * 
 * body: {
 *   banks: [{
 *     name: string (必填),
 *     key?: string,
 *     subjectCode?: string,
 *     description?: string,
 *     isPublic?: boolean,
 *     settings?: object,
 *     managers?: [ObjectId]
 *   }],
 *   options?: {
 *     skipDuplicates: boolean, // 跳过重复的key
 *     updateExisting: boolean, // 更新已存在的题库（基于key）
 *   }
 * }
 */
router.post('/import', requireAuth, async (req, res) => {
  try {
    const { banks, options = {} } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!Array.isArray(banks) || banks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'banks 必须是非空数组',
      });
    }

    const { skipDuplicates = false, updateExisting = false } = options;
    const results = {
      success: [],
      failed: [],
      skipped: [],
    };

    for (const bankData of banks) {
      try {
        // 验证必填字段
        if (!bankData.name || !bankData.name.trim()) {
          results.failed.push({
            data: bankData,
            error: '题库名称不能为空',
          });
          continue;
        }

        const name = sanitizeString(bankData.name, { maxLength: 100 });
        const key = bankData.key ? sanitizeString(bankData.key, { maxLength: 50 }) : undefined;
        const subjectCode = bankData.subjectCode || null;
        const description = sanitizeString(bankData.description || '', {
          maxLength: 500,
          allowEmpty: true,
        });
        const isPublic = bankData.isPublic !== undefined ? bankData.isPublic : true;
        const isOfficial = bankData.isOfficial === true && userRole === 'admin';

        // 检查key是否已存在
        if (key) {
          const existingBank = await QuestionBank.findOne({ key }).lean();
          if (existingBank) {
            if (skipDuplicates) {
              results.skipped.push({
                data: bankData,
                reason: 'key已存在',
                existingBankId: existingBank._id,
              });
              continue;
            }
            if (updateExisting) {
              // 更新已存在的题库
              const updated = await QuestionBank.findByIdAndUpdate(
                existingBank._id,
                {
                  $set: {
                    name,
                    description,
                    subjectCode,
                    isPublic,
                    ...(userRole === 'admin' && { isOfficial }),
                    settings: bankData.settings || {
                      difficultyRange: [1, 2, 3, 4, 5],
                      questionTypes: ['single'],
                      aiEnabled: false,
                    },
                  },
                },
                { new: true }
              );
              results.success.push({
                action: 'updated',
                bank: updated,
              });
              continue;
            }
          }
        }

        // 创建新题库
        const bank = await QuestionBank.create({
          name,
          key,
          subjectCode,
          description,
          ownerId: userId,
          managers: [userId],
          isPublic,
          isOfficial: isOfficial && userRole === 'admin',
          settings: bankData.settings || {
            difficultyRange: [1, 2, 3, 4, 5],
            questionTypes: ['single'],
            aiEnabled: false,
          },
          questionCount: 0,
        });

        results.success.push({
          action: 'created',
          bank,
        });
      } catch (err) {
        console.error('导入题库失败:', err);
        results.failed.push({
          data: bankData,
          error: err.message || '导入失败',
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: banks.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        skippedCount: results.skipped.length,
        results,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/banks/import error:', err);
    res.status(500).json({
      success: false,
      message: '批量导入失败',
    });
  }
});

/**
 * GET /api/v3/banks/export
 * 导出题库列表
 * 
 * 查询参数：
 * - format: 导出格式（json, csv），默认json
 * - subjectCode: 学科代码筛选
 * - isPublic: 是否公开筛选
 * - includeQuestions: 是否包含题目（仅JSON格式），默认false
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const {
      format = 'json',
      subjectCode,
      isPublic,
      includeQuestions = 'false',
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // 构建查询条件
    const cond = {};

    if (subjectCode) {
      cond.subjectCode = subjectCode;
    }

    if (isPublic !== undefined) {
      cond.isPublic = isPublic === 'true';
    }

    // 权限过滤：非管理员只能导出自己可见的题库
    if (userRole !== 'admin') {
      cond.$or = [
        { isPublic: true },
        { ownerId: userId },
        { managers: userId },
      ];
    }

    // 查询题库列表
    const banks = await attachSubjectNames(await QuestionBank.find(cond)
      .populate('ownerId', 'name email')
      .populate('managers', 'name email')
      .sort({ createdAt: -1 })
      .lean());

    const shouldIncludeQuestions = includeQuestions === 'true' && format === 'json';

    // 如果需要包含题目，为每个题库加载题目
    let banksWithQuestions = banks;
    if (shouldIncludeQuestions) {
      banksWithQuestions = await Promise.all(
        banks.map(async (bank) => {
          const questions = await Question.find({ bankId: bank._id })
            .select('content options answer difficulty type tags explain knowledgeNodeId subjectCode')
            .lean();
          return {
            ...bank,
            questions,
          };
        })
      );
    }

    if (format === 'csv') {
      // CSV格式导出
      const csvRows = [];
      
      // CSV表头
      csvRows.push([
        '题库名称',
        '题库标识',
        '学科代码',
        '描述',
        '是否公开',
        '是否官方',
        '题目数量',
        '难度范围',
        '支持题型',
        '启用AI',
        '创建时间',
        '更新时间',
      ].join(','));

      // CSV数据行
      for (const bank of banks) {
        const row = [
          `"${(bank.name || '').replace(/"/g, '""')}"`,
          `"${(bank.key || '').replace(/"/g, '""')}"`,
          `"${(bank.subjectCode?.code || bank.subjectCode || '').replace(/"/g, '""')}"`,
          `"${(bank.description || '').replace(/"/g, '""')}"`,
          bank.isPublic ? 'true' : 'false',
          bank.isOfficial ? 'true' : 'false',
          bank.questionCount || 0,
          `"${(bank.settings?.difficultyRange || [1, 2, 3, 4, 5]).join(',')}"`,
          `"${(bank.settings?.questionTypes || ['single']).join(',')}"`,
          bank.settings?.aiEnabled ? 'true' : 'false',
          bank.createdAt ? new Date(bank.createdAt).toISOString() : '',
          bank.updatedAt ? new Date(bank.updatedAt).toISOString() : '',
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const filename = `banks_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\ufeff' + csvContent); // 添加BOM以支持Excel正确显示中文
    } else {
      // JSON格式导出
      const exportData = {
        version: '3.0',
        exportDate: new Date().toISOString(),
        count: banksWithQuestions.length,
        banks: banksWithQuestions.map((bank) => {
          const bankData = {
            name: bank.name,
            key: bank.key,
            subjectCode: bank.subjectCode?.code || bank.subjectCode,
            description: bank.description,
            isPublic: bank.isPublic,
            isOfficial: bank.isOfficial,
            settings: bank.settings,
            questionCount: bank.questionCount,
            createdAt: bank.createdAt,
            updatedAt: bank.updatedAt,
          };

          if (shouldIncludeQuestions && bank.questions) {
            bankData.questions = bank.questions.map((q) => ({
              content: q.content,
              options: q.options,
              answer: q.answer,
              difficulty: q.difficulty,
              type: q.type,
              tags: q.tags,
              explain: q.explain,
              knowledgeNodeId: q.knowledgeNodeId,
              subjectCode: q.subjectCode,
            }));
          }

          return bankData;
        }),
      };

      const filename = `banks_export_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    }
  } catch (err) {
    console.error('GET /api/v3/banks/export error:', err);
    res.status(500).json({
      success: false,
      message: '导出失败',
    });
  }
});

/**
 * GET /api/v3/banks/:id/export
 * 导出单个题库（包含题目）
 * 
 * 查询参数：
 * - format: 导出格式（json, csv），默认json
 */
router.get('/:id/export', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const bank = await attachSubjectNames(await QuestionBank.findById(id)
      .populate('ownerId', 'name email')
      .populate('managers', 'name email')
      .lean());

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 权限检查：非管理员只能导出自己可见的题库
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      const canView =
        bank.isPublic ||
        bank.ownerId?._id?.toString() === userId ||
        bank.managers?.some(m => m._id?.toString() === userId);

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: '无权导出该题库',
        });
      }
    }

    // 获取题库下的所有题目
    const questions = await Question.find({ bankId: id })
      .select('content options answer difficulty type tags explain knowledgeNodeId subjectCode qid id')
      .lean();

    if (format === 'csv') {
      // CSV格式导出
      const csvRows = [];
      
      // 题库信息
      csvRows.push(['题库信息']);
      csvRows.push(['题库名称', bank.name]);
      csvRows.push(['题库标识', bank.key || '']);
      csvRows.push(['学科代码', bank.subjectCode?.code || bank.subjectCode || '']);
      csvRows.push(['描述', bank.description || '']);
      csvRows.push(['是否公开', bank.isPublic ? 'true' : 'false']);
      csvRows.push(['题目数量', bank.questionCount || 0]);
      csvRows.push([]);
      
      // 题目表头
      csvRows.push([
        '题目ID',
        'QID',
        '题干',
        '选项',
        '答案',
        '难度',
        '题型',
        '标签',
        '解析',
        '知识点ID',
        '学科代码',
      ].join(','));

      // 题目数据
      for (const q of questions) {
        const row = [
          q._id || q.id || '',
          q.qid || '',
          `"${(q.content || '').replace(/"/g, '""')}"`,
          `"${(q.options || []).join('|').replace(/"/g, '""')}"`,
          Array.isArray(q.answer) ? q.answer.join(',') : q.answer,
          q.difficulty || 1,
          q.type || 'single',
          `"${(q.tags || []).join(',').replace(/"/g, '""')}"`,
          `"${(q.explain || '').replace(/"/g, '""')}"`,
          q.knowledgeNodeId || '',
          q.subjectCode || '',
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const filename = `bank_${bank.name}_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\ufeff' + csvContent);
    } else {
      // JSON格式导出
      const exportData = {
        version: '3.0',
        exportDate: new Date().toISOString(),
        bank: {
          name: bank.name,
          key: bank.key,
          subjectCode: bank.subjectCode?.code || bank.subjectCode,
          description: bank.description,
          isPublic: bank.isPublic,
          isOfficial: bank.isOfficial,
          settings: bank.settings,
          questionCount: bank.questionCount,
        },
        questions: questions.map((q) => ({
          content: q.content,
          options: q.options,
          answer: q.answer,
          difficulty: q.difficulty,
          type: q.type,
          tags: q.tags,
          explain: q.explain,
          knowledgeNodeId: q.knowledgeNodeId,
          subjectCode: q.subjectCode,
          qid: q.qid,
          id: q.id,
        })),
        count: questions.length,
      };

      const filename = `bank_${bank.name}_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    }
  } catch (err) {
    console.error('GET /api/v3/banks/:id/export error:', err);
    res.status(500).json({
      success: false,
      message: '导出失败',
    });
  }
});

export default router;

