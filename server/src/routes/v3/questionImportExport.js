/**
 * GraphTutor V3.0 - 题目导入导出API
 * 
 * 路径：/api/v3/questions/import, /api/v3/questions/export
 * 功能：提供题目的批量导入导出功能，支持JSON、CSV格式
 */

import express from 'express';
import Question from '../../models/Question.js';
import QuestionBank from '../../models/QuestionBank.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { canModifyBank } from '../../middleware/permission.js';
import { sanitizeString, validateInt } from '../../middleware/validation.js';
import { updateBankQuestionCount, batchUpdateBankQuestionCounts } from '../../services/bankStats.js';
import { generateQuestionId } from '../../utils/questionIdService.js';

const router = express.Router();

/**
 * POST /api/v3/questions/import
 * 批量导入题目到指定题库
 * 
 * body: {
 *   bankId: string (必填), // 目标题库ID
 *   questions: [{
 *     content: string (必填),
 *     options?: string[],
 *     answer?: any,
 *     difficulty?: number,
 *     type?: string,
 *     tags?: string[],
 *     explain?: string,
 *     knowledgeNodeId?: string,
 *     subjectCode?: string,
 *     qid?: string,
 *     id?: string,
 *   }],
 *   options?: {
 *     skipDuplicates: boolean, // 跳过重复的qid
 *     updateExisting: boolean, // 更新已存在的题目（基于qid）
 *   }
 * }
 */
router.post('/import', requireAuth, async (req, res) => {
  try {
    const { bankId, questions, options = {} } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 验证必填字段
    if (!bankId) {
      return res.status(400).json({
        success: false,
        message: 'bankId 是必填项',
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questions 必须是非空数组',
      });
    }

    // 验证题库是否存在
    const bank = await QuestionBank.findById(bankId).lean();
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 权限检查：检查是否有权限向该题库添加题目
    if (userRole !== 'admin') {
      const canModify =
        bank.isPublic ||
        bank.ownerId?.toString() === userId ||
        bank.managers?.some(m => m.toString() === userId);

      if (!canModify && bank.isOfficial) {
        return res.status(403).json({
          success: false,
          message: '无权向官方题库添加题目',
        });
      }

      if (!canModify) {
        return res.status(403).json({
          success: false,
          message: '无权向该题库添加题目',
        });
      }
    }

    const { skipDuplicates = false, updateExisting = false } = options;
    const results = {
      success: [],
      failed: [],
      skipped: [],
    };

    // 批量处理题目
    for (const questionData of questions) {
      try {
        // 验证必填字段
        if (!questionData.content || !questionData.content.trim()) {
          results.failed.push({
            data: questionData,
            error: '题目内容不能为空',
          });
          continue;
        }

        const content = sanitizeString(questionData.content, { maxLength: 2000 });
        const type = questionData.type || 'single';
        const difficulty = validateInt(questionData.difficulty, { min: 1, max: 5, default: 1 });
        const options = Array.isArray(questionData.options) ? questionData.options : [];
        const answer = questionData.answer !== undefined ? questionData.answer : null;
        const explain = sanitizeString(questionData.explain || '', {
          maxLength: 1000,
          allowEmpty: true,
        });
        const tags = Array.isArray(questionData.tags) ? questionData.tags : [];
        const knowledgeNodeId = questionData.knowledgeNodeId || null;
        const subjectCode = questionData.subjectCode || bank.subjectCode || null;
        const qid = questionData.qid || null;
        const id = questionData.id || null;

        // 检查qid是否已存在
        if (qid) {
          const existingQuestion = await Question.findOne({ qid, bankId }).lean();
          if (existingQuestion) {
            if (skipDuplicates) {
              results.skipped.push({
                data: questionData,
                reason: 'qid已存在',
                existingQuestionId: existingQuestion._id,
              });
              continue;
            }
            if (updateExisting) {
              // 更新已存在的题目
              const updated = await Question.findByIdAndUpdate(
                existingQuestion._id,
                {
                  $set: {
                    content,
                    options,
                    answer,
                    difficulty,
                    type,
                    tags,
                    explain,
                    knowledgeNodeId,
                    subjectCode,
                    id,
                  },
                },
                { new: true }
              );
              results.success.push({
                action: 'updated',
                question: updated,
              });
              continue;
            }
          }
        }

        // 检查id是否已存在（如果提供了id）
        if (id) {
          const existingQuestion = await Question.findOne({ id, bankId }).lean();
          if (existingQuestion) {
            if (skipDuplicates) {
              results.skipped.push({
                data: questionData,
                reason: 'id已存在',
                existingQuestionId: existingQuestion._id,
              });
              continue;
            }
            if (updateExisting) {
              // 更新已存在的题目
              const updated = await Question.findByIdAndUpdate(
                existingQuestion._id,
                {
                  $set: {
                    content,
                    options,
                    answer,
                    difficulty,
                    type,
                    tags,
                    explain,
                    knowledgeNodeId,
                    subjectCode,
                    qid,
                  },
                },
                { new: true }
              );
              results.success.push({
                action: 'updated',
                question: updated,
              });
              continue;
            }
          }
        }

        // 生成qid（如果没有提供）
        const finalQid = qid || await generateQuestionId(bankId, type);

        // 创建新题目
        const question = await Question.create({
          content,
          options,
          answer,
          difficulty,
          type,
          tags,
          explain,
          knowledgeNodeId,
          subjectCode,
          bankId,
          qid: finalQid,
          id,
          managerId: userId,
        });

        results.success.push({
          action: 'created',
          question,
        });
      } catch (err) {
        console.error('导入题目失败:', err);
        results.failed.push({
          data: questionData,
          error: err.message || '导入失败',
        });
      }
    }

    // 更新题库的题目数量
    if (results.success.length > 0) {
      await updateBankQuestionCount(bankId);
    }

    res.json({
      success: true,
      data: {
        total: questions.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        skippedCount: results.skipped.length,
        results,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/questions/import error:', err);
    res.status(500).json({
      success: false,
      message: '批量导入失败',
    });
  }
});

/**
 * GET /api/v3/questions/export
 * 导出题目列表
 * 
 * 查询参数：
 * - format: 导出格式（json, csv），默认json
 * - bankId: 题库ID筛选
 * - subjectCode: 学科代码筛选
 * - difficulty: 难度筛选
 * - type: 题型筛选
 * - tags: 标签筛选（逗号分隔）
 * - search: 关键词搜索
 * - limit: 最大导出数量，默认1000
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const {
      format = 'json',
      bankId,
      subjectCode,
      difficulty,
      type,
      tags,
      search,
      limit = '1000',
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // 构建查询条件
    const cond = {};

    if (bankId) {
      cond.bankId = bankId;
    }

    if (subjectCode) {
      cond.subjectCode = subjectCode;
    }

    if (difficulty) {
      const diffNum = parseInt(difficulty, 10);
      if (!isNaN(diffNum)) {
        cond.difficulty = diffNum;
      }
    }

    if (type) {
      cond.type = type;
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagArray.length > 0) {
        cond.tags = { $in: tagArray };
      }
    }

    if (search) {
      cond.$or = [
        { content: { $regex: search, $options: 'i' } },
        { explain: { $regex: search, $options: 'i' } },
      ];
    }

    // 权限过滤：非管理员只能导出自己可见的题目
    if (userRole !== 'admin') {
      // 获取用户可见的题库
      const visibleBanks = await QuestionBank.find({
        $or: [
          { isPublic: true },
          { ownerId: userId },
          { managers: userId },
        ],
      }).select('_id').lean();

      const visibleBankIds = visibleBanks.map(b => b._id);
      
      // 只能导出可见题库的题目，或者自己创建的题目
      cond.$or = [
        { bankId: { $in: visibleBankIds } },
        { managerId: userId },
      ];
    }

    // 查询题目列表
    const maxLimit = parseInt(limit, 10) || 1000;
    const questions = await Question.find(cond)
      .populate('bankId', 'name key')
      .populate('knowledgeNodeId', 'key name')
      .sort({ createdAt: -1 })
      .limit(maxLimit)
      .lean();

    if (format === 'csv') {
      // CSV格式导出
      const csvRows = [];
      
      // CSV表头
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
        '题库ID',
        '题库名称',
      ].join(','));

      // CSV数据行
      for (const q of questions) {
        const row = [
          q._id || q.id || '',
          q.qid || '',
          `"${(q.content || '').replace(/"/g, '""')}"`,
          `"${(q.options || []).join('|').replace(/"/g, '""')}"`,
          Array.isArray(q.answer) ? q.answer.join(',') : (q.answer !== undefined ? String(q.answer) : ''),
          q.difficulty || 1,
          q.type || 'single',
          `"${(q.tags || []).join(',').replace(/"/g, '""')}"`,
          `"${(q.explain || '').replace(/"/g, '""')}"`,
          q.knowledgeNodeId?.key || q.knowledgeNodeId || '',
          q.subjectCode || '',
          q.bankId?._id || q.bankId || '',
          `"${(q.bankId?.name || '').replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const filename = `questions_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\ufeff' + csvContent); // 添加BOM以支持Excel正确显示中文
    } else {
      // JSON格式导出
      const exportData = {
        version: '3.0',
        exportDate: new Date().toISOString(),
        count: questions.length,
        questions: questions.map((q) => ({
          content: q.content,
          options: q.options,
          answer: q.answer,
          difficulty: q.difficulty,
          type: q.type,
          tags: q.tags,
          explain: q.explain,
          knowledgeNodeId: q.knowledgeNodeId?.key || q.knowledgeNodeId,
          subjectCode: q.subjectCode,
          qid: q.qid,
          id: q.id,
          bankId: q.bankId?._id || q.bankId,
          bankName: q.bankId?.name,
        })),
      };

      const filename = `questions_export_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    }
  } catch (err) {
    console.error('GET /api/v3/questions/export error:', err);
    res.status(500).json({
      success: false,
      message: '导出失败',
    });
  }
});

/**
 * GET /api/v3/questions/bank/:bankId/export
 * 导出指定题库的所有题目
 * 
 * 查询参数：
 * - format: 导出格式（json, csv），默认json
 */
router.get('/bank/:bankId/export', requireAuth, async (req, res) => {
  try {
    const { bankId } = req.params;
    const { format = 'json' } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // 验证题库是否存在
    const bank = await QuestionBank.findById(bankId)
      .populate('ownerId', 'name email')
      .populate('managers', 'name email')
      .populate('subjectCode', 'code name')
      .lean();

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 权限检查：非管理员只能导出自己可见的题库
    if (userRole !== 'admin') {
      const canView =
        bank.isPublic ||
        bank.ownerId?._id?.toString() === userId ||
        bank.managers?.some(m => m._id?.toString() === userId);

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: '无权导出该题库的题目',
        });
      }
    }

    // 获取题库下的所有题目
    const questions = await Question.find({ bankId })
      .populate('knowledgeNodeId', 'key name')
      .select('content options answer difficulty type tags explain knowledgeNodeId subjectCode qid id')
      .sort({ createdAt: -1 })
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
          Array.isArray(q.answer) ? q.answer.join(',') : (q.answer !== undefined ? String(q.answer) : ''),
          q.difficulty || 1,
          q.type || 'single',
          `"${(q.tags || []).join(',').replace(/"/g, '""')}"`,
          `"${(q.explain || '').replace(/"/g, '""')}"`,
          q.knowledgeNodeId?.key || q.knowledgeNodeId || '',
          q.subjectCode || '',
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const filename = `bank_${bank.name}_questions_${new Date().toISOString().split('T')[0]}.csv`;

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
          knowledgeNodeId: q.knowledgeNodeId?.key || q.knowledgeNodeId,
          subjectCode: q.subjectCode,
          qid: q.qid,
          id: q.id,
        })),
        count: questions.length,
      };

      const filename = `bank_${bank.name}_questions_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(exportData);
    }
  } catch (err) {
    console.error('GET /api/v3/questions/bank/:bankId/export error:', err);
    res.status(500).json({
      success: false,
      message: '导出失败',
    });
  }
});

export default router;

