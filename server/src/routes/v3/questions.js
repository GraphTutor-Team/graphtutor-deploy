/**
 * GraphTutor V3.0 - 题目管理API (V3版本)
 * 
 * 路径：/api/v3/questions
 * 功能：提供增强的题目管理功能，支持qid、学科关联、版本控制等
 */

import express from 'express';
// Swagger文档注释
import './questions.swagger.js';
import mongoose from 'mongoose';
import Question from '../../models/Question.js';
import QuestionBank from '../../models/QuestionBank.js';
import User from '../../models/User.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { canModifyQuestion } from '../../middleware/permission.js';
import { queryQuestions, getQuestionStats, findSimilarQuestions } from '../../services/questionQuery.js';
import {
  createVersion,
  getVersionHistory,
  restoreVersion,
  compareVersions,
} from '../../services/questionVersion.js';
import { generateQuestionId } from '../../utils/questionIdService.js';
import { sanitizeString, validateInt } from '../../middleware/validation.js';
import questionImportExportRoutes from './questionImportExport.js';

const router = express.Router();

// 导入导出路由
router.use('/', questionImportExportRoutes);

/**
 * GET /api/v3/questions
 * 获取题目列表（增强筛选）
 * 
 * 查询参数：
 * - subjectCode: 学科代码
 * - bankId: 题库ID
 * - difficulty: 难度（单个值或范围 [1,5]）
 * - knowledgeNodeId: 知识点ID
 * - managerId: 负责人ID
 * - tags: 标签（数组）
 * - source: 来源
 * - search: 关键词搜索
 * - page: 页码
 * - limit: 每页数量
 * - sort: 排序字段（默认 -createdAt）
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await queryQuestions(req.query, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort || '-createdAt',
      populate: true,
    });

    res.json({
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    console.error('GET /api/v3/questions error:', err);
    res.status(500).json({
      success: false,
      message: '获取题目列表失败',
    });
  }
});

/**
 * GET /api/v3/questions/stats
 * 获取题目统计信息
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await getQuestionStats(req.query);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('GET /api/v3/questions/stats error:', err);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
    });
  }
});

/**
 * GET /api/v3/questions/:id
 * 获取题目详情（支持_id、id、qid查询）
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    let question = null;

    // 尝试按_id查询
    try {
      question = await Question.findById(id)
        .populate('bankId', 'name subjectCode')
        .populate('managerId', 'name email')
        .populate('subjectCode', 'code name')
        .populate('groupId', 'name code')
        .lean();
    } catch {
      // 不是ObjectId格式，继续尝试其他方式
    }

    // 尝试按id字段查询
    if (!question) {
      question = await Question.findOne({ id })
        .populate('bankId', 'name subjectCode')
        .populate('managerId', 'name email')
        .populate('subjectCode', 'code name')
        .populate('groupId', 'name code')
        .lean();
    }

    // 尝试按qid字段查询
    if (!question) {
      question = await Question.findOne({ qid: id })
        .populate('bankId', 'name subjectCode')
        .populate('managerId', 'name email')
        .populate('subjectCode', 'code name')
        .lean();
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (err) {
    console.error('GET /api/v3/questions/:id error:', err);
    res.status(500).json({
      success: false,
      message: '获取题目详情失败',
    });
  }
});

/**
 * POST /api/v3/questions
 * 创建题目（支持qid自动生成、学科关联）
 * 
 * body: {
 *   content: string (必填),
 *   options: [string] (必填),
 *   answerIndex: number (必填),
 *   subjectCode: string (可选),
 *   bankId: ObjectId (可选),
 *   difficulty: number (可选，1-5),
 *   knowledgeNodeId: string (可选),
 *   tags: [string] (可选),
 *   explain: string (可选),
 *   autoGenerateQid: boolean (可选，默认true)
 * }
 */
router.post(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const {
        content,
        options,
        answerIndex,
        subjectCode,
        bankId,
        difficulty = 1,
        knowledgeNodeId,
        tags = [],
        explain = '',
        autoGenerateQid = true,
      } = req.body;

      const userId = req.user.id;
      
      // 调试信息
      console.log('创建题目 - 用户信息:', {
        userId: userId,
        userRole: req.user.role,
        isAdmin: req.user.isAdmin,
      });

      // 验证必填字段
      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: '题干不能为空',
        });
      }

      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: '至少需要 2 个选项',
        });
      }

      if (answerIndex === undefined || answerIndex < 0 || answerIndex >= options.length) {
        return res.status(400).json({
          success: false,
          message: '正确答案索引无效',
        });
      }

      // 验证难度
      const difficultyNum = validateInt(difficulty, {
        min: 1,
        max: 5,
        defaultValue: 1,
      });

      // 如果指定了题库，验证题库是否存在和权限
      let bank = null;
      if (bankId) {
        bank = await QuestionBank.findById(bankId);
        if (!bank) {
          return res.status(404).json({
            success: false,
            message: '题库不存在',
          });
        }

        const userRole = req.user.role;
        const isAdmin = userRole === 'admin';

        // 官方题库：只有管理员可以添加题目
        if (bank.isOfficial && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: '官方题库只能由管理员添加题目',
          });
        }

        // 小组题库：群组成员可以添加题目
        if (bank.groupId) {
          const Group = await import('../../models/Group.js');
          const group = await Group.default.findById(bank.groupId);
          if (!group) {
            return res.status(404).json({
              success: false,
              message: '关联的群组不存在',
            });
          }
          if (!group.isMember(userId) && group.ownerId.toString() !== userId) {
            return res.status(403).json({
              success: false,
              message: '只有群组成员可以向小组题库添加题目',
            });
          }
        } else {
          // 个人题库：只有创建者和管理者可以添加题目
          const isOwner = bank.ownerId?.toString() === userId;
          const isManager = bank.managers?.some((m) => m.toString() === userId);
          if (!isAdmin && !isOwner && !isManager) {
            return res.status(403).json({
              success: false,
              message: '无权向该题库添加题目',
            });
          }
        }
      }

      // 验证群组权限（如果提供了groupId）
      let groupId = req.body.groupId;
      if (groupId) {
        const Group = await import('../../models/Group.js');
        const group = await Group.default.findById(groupId);
        if (!group) {
          return res.status(404).json({
            success: false,
            message: '群组不存在',
          });
        }
        // 检查是否是群组成员
        if (!group.isMember(userId) && group.ownerId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            message: '无权在此群组创建题目',
          });
        }
      } else if (bank && bank.groupId) {
        // 如果题目关联了小组题库，自动设置groupId
        groupId = bank.groupId;
      }

      // 如果指定了学科代码，验证学科是否存在
      if (subjectCode) {
        const Subject = (await import('../../models/Subject.js')).default;
        const subject = await Subject.findOne({ code: subjectCode, enabled: true });
        if (!subject) {
          return res.status(400).json({
            success: false,
            message: `学科代码 "${subjectCode}" 不存在或已禁用`,
          });
        }
      }

      // 自动生成qid（如果启用）
      let qid = null;
      if (autoGenerateQid && subjectCode) {
        try {
          qid = await generateQuestionId(subjectCode);
          console.log('生成的qid:', qid);
        } catch (error) {
          console.warn('生成qid失败:', error.message);
          console.warn('qid生成错误详情:', error);
          // 不阻止创建，只是不设置qid
        }
      }

      // 创建题目
      // 注意：单个创建接口默认只支持单选题，但设置type和answer字段以保持数据一致性
      const questionData = {
        type: 'single', // 单个创建接口默认只支持单选题
        content: sanitizeString(content, { maxLength: 2000 }),
        options: options.map((opt) =>
          sanitizeString(opt, { maxLength: 500 })
        ),
        answerIndex: answerIndex,
        answer: answerIndex, // 设置answer字段以保持数据一致性
        subjectCode: subjectCode || null,
        bankId: bankId || null,
        difficulty: difficultyNum,
        knowledgeNodeId: knowledgeNodeId || null,
        tags: Array.isArray(tags) ? tags : [],
        explain: sanitizeString(explain, { maxLength: 2000, allowEmpty: true }),
        creatorId: userId, // 设置创建者ID
        managerId: userId, // 向后兼容，设置为创建者ID
        source: 'bank',
        groupId: groupId || undefined,
      };
      
      // 如果生成了qid，添加到数据中
      if (qid) {
        questionData.qid = qid;
      }
      
      console.log('Creating question with data:', {
        type: questionData.type,
        content: questionData.content.substring(0, 50) + '...',
        optionsCount: questionData.options.length,
        answer: questionData.answer,
        subjectCode: questionData.subjectCode,
        bankId: questionData.bankId,
        qid: questionData.qid || 'none',
        managerId: questionData.managerId,
      });
      
      let question;
      try {
        question = await Question.create(questionData);
        console.log('Question created successfully:', question._id);
      } catch (createError) {
        console.error('Question.create() failed:', createError);
        console.error('Create error details:', {
          name: createError.name,
          message: createError.message,
          code: createError.code,
          errors: createError.errors,
          keyPattern: createError.keyPattern,
          keyValue: createError.keyValue,
        });
        
        // 如果是id字段的null值冲突，尝试重新创建（确保不设置id字段）
        if (createError.code === 11000) {
          const field = Object.keys(createError.keyPattern || {})[0] || 'unknown';
          const keyValue = createError.keyValue || {};
          
          if (field === 'id' && (keyValue.id === null || keyValue.id === undefined)) {
            console.warn('检测到id字段null值冲突，尝试重新创建（确保不设置id字段）');
            // 确保questionData中没有id字段
            const retryData = { ...questionData };
            delete retryData.id;
            
            try {
              question = await Question.create(retryData);
              console.log('Question created successfully (retry without id):', question._id);
              
              // 创建初始版本
              try {
                await createVersion(question._id, userId, {}, '创建题目');
              } catch (error) {
                console.warn('创建版本失败:', error.message);
              }

              // 更新题库题目数量（使用事务包装器确保一致性）
              if (bankId) {
                const { updateBankQuestionCount } = await import('../../services/bankStats.js');
                await updateBankQuestionCount(bankId).catch(err => {
                  console.warn('更新题库计数失败:', err);
                });
              }

              return res.status(201).json({
                success: true,
                data: question,
              });
            } catch (retryError) {
              console.error('重试创建失败:', retryError);
              // 继续抛出原始错误，让外层catch处理
            }
          }
        }
        
        throw createError; // 重新抛出错误，让外层catch处理
      }

      // 创建初始版本
      try {
        await createVersion(question._id, userId, {}, '创建题目');
      } catch (error) {
        console.warn('创建版本失败:', error.message);
        // 不阻止创建，只是不创建版本记录
      }

      // 更新题库题目数量（使用事务包装器确保一致性）
      if (bankId) {
        const { updateBankQuestionCount } = await import('../../services/bankStats.js');
        await updateBankQuestionCount(bankId).catch(err => {
          console.warn('更新题库计数失败:', err);
        });
      }

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (err) {
      console.error('POST /api/v3/questions error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code,
        errors: err.errors,
        keyPattern: err.keyPattern,
        keyValue: err.keyValue,
      });
      
      // 处理MongoDB唯一索引冲突错误（如qid重复）
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'unknown';
        const keyValue = err.keyValue || {};
        
        // 如果是id字段且值为null，说明是sparse索引问题，尝试重新创建（不设置id字段）
        if (field === 'id' && (keyValue.id === null || keyValue.id === undefined)) {
          console.warn('检测到id字段null值冲突，尝试重新创建（不设置id字段）');
          // 不设置id字段，让它保持undefined，重新尝试创建
          delete questionData.id;
          try {
            question = await Question.create(questionData);
            console.log('Question created successfully (retry without id):', question._id);
            
            // 创建初始版本
            try {
              await createVersion(question._id, userId, {}, '创建题目');
            } catch (error) {
              console.warn('创建版本失败:', error.message);
            }

            // 更新题库题目数量
            if (bankId) {
              const QuestionBank = (await import('../../models/QuestionBank.js')).default;
              await QuestionBank.findByIdAndUpdate(bankId, {
                $inc: { questionCount: 1 },
              });
            }

            return res.status(201).json({
              success: true,
              data: question,
            });
          } catch (retryError) {
            console.error('重试创建失败:', retryError);
            // 继续执行下面的错误处理
          }
        }
        
        return res.status(400).json({
          success: false,
          message: `${field === 'qid' ? '题目ID' : field === 'id' ? 'ID' : field}已存在，请重试`,
          error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
      }
      
      // 处理MongoDB验证错误
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors || {}).map(e => e.message);
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors: errors,
          error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
      }
      
      res.status(500).json({
        success: false,
        message: '创建题目失败',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);

/**
 * PUT /api/v3/questions/:id
 * 更新题目（支持版本控制）
 */
router.put('/:id', requireAuth, canModifyQuestion, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // 查找题目
    let question = await Question.findById(id);
    if (!question) {
      question = await Question.findOne({ id });
    }
    if (!question) {
      question = await Question.findOne({ qid: id });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    // 权限检查：管理员或题目负责人
    const isAdmin = req.user.role === 'admin';
    const isManager = question.managerId?.toString() === userId;

    if (!isAdmin && !isManager) {
      return res.status(403).json({
        success: false,
        message: '无权修改该题目',
      });
    }

    // 如果更新了学科代码，验证学科是否存在
    if (updates.subjectCode !== undefined && updates.subjectCode) {
      const Subject = (await import('../../models/Subject.js')).default;
      const subject = await Subject.findOne({ code: updates.subjectCode, enabled: true });
      if (!subject) {
        return res.status(400).json({
          success: false,
          message: `学科代码 "${updates.subjectCode}" 不存在或已禁用`,
        });
      }
    }

    // 构建更新对象
    const allowedFields = [
      'content',
      'options',
      'answerIndex',
      'subjectCode',
      'bankId',
      'difficulty',
      'knowledgeNodeId',
      'tags',
      'explain',
    ];

    const updateData = {};
    const oldBankId = question.bankId ? question.bankId.toString() : null;
    let newBankId = null;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'content' || field === 'explain') {
          updateData[field] = sanitizeString(updates[field], {
            maxLength: 2000,
            allowEmpty: field === 'explain',
          });
        } else if (field === 'options') {
          updateData[field] = updates[field].map((opt) =>
            sanitizeString(opt, { maxLength: 500 })
          );
        } else if (field === 'difficulty') {
          updateData[field] = validateInt(updates[field], {
            min: 1,
            max: 5,
            defaultValue: question.difficulty,
          });
        } else if (field === 'bankId') {
          // 处理 bankId 更新
          newBankId = updates[field] ? updates[field].toString() : null;
          updateData[field] = updates[field] || null;
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    // 更新题目
    Object.assign(question, updateData);
    await question.save();

    // 如果 bankId 发生变更，更新两个题库的计数
    if (oldBankId !== newBankId) {
      const QuestionBank = (await import('../../models/QuestionBank.js')).default;
      
      // 旧题库计数 -1
      if (oldBankId) {
        await QuestionBank.findByIdAndUpdate(oldBankId, {
          $inc: { questionCount: -1 },
        }).catch(err => {
          console.warn('更新旧题库计数失败:', err);
        });
      }
      
      // 新题库计数 +1
      if (newBankId) {
        await QuestionBank.findByIdAndUpdate(newBankId, {
          $inc: { questionCount: 1 },
        }).catch(err => {
          console.warn('更新新题库计数失败:', err);
        });
      }
    }

    // 创建版本记录
    try {
      await createVersion(
        question._id,
        userId,
        updateData,
        updates.changeReason || '更新题目'
      );
    } catch (error) {
      console.warn('创建版本失败:', error.message);
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (err) {
    console.error('PUT /api/v3/questions/:id error:', err);
    res.status(500).json({
      success: false,
      message: '更新题目失败',
    });
  }
});

/**
 * DELETE /api/v3/questions/:id
 * 删除题目（需要权限）
 */
router.delete('/:id', requireAuth, canModifyQuestion, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找题目
    let question = await Question.findById(id);
    if (!question) {
      question = await Question.findOne({ id });
    }
    if (!question) {
      question = await Question.findOne({ qid: id });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    // 删除题目
    await Question.findByIdAndDelete(question._id);

    // 更新题库题目数量
    if (question.bankId) {
      await QuestionBank.findByIdAndUpdate(question.bankId, {
        $inc: { questionCount: -1 },
      });
    }

    res.json({
      success: true,
      message: '题目删除成功',
    });
  } catch (err) {
    console.error('DELETE /api/v3/questions/:id error:', err);
    res.status(500).json({
      success: false,
      message: '删除题目失败',
    });
  }
});

/**
 * POST /api/v3/questions/batch
 * 批量创建题目
 */
router.post(
  '/batch',
  requireAuth,
  async (req, res) => {
    try {
      const { questions, bankId } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: '题目列表不能为空',
        });
      }

      if (questions.length > 100) {
        return res.status(400).json({
          success: false,
          message: '单次最多创建100道题目',
        });
      }

      const userId = req.user.id;
      const created = [];
      const errors = [];

      for (let i = 0; i < questions.length; i++) {
        try {
          const q = questions[i];
          const type = q.type || 'single';
          
          // 构建题目对象
          const questionData = {
            type: type,
            content: sanitizeString(q.content, { maxLength: 2000 }),
            subjectCode: q.subjectCode || null,
            bankId: bankId || q.bankId || null,
            difficulty: validateInt(q.difficulty, {
              min: 1,
              max: 5,
              defaultValue: 1,
            }),
            knowledgeNodeId: q.knowledgeNodeId || null,
            tags: Array.isArray(q.tags) ? q.tags : [],
            explain: sanitizeString(q.explain || '', {
              maxLength: 2000,
              allowEmpty: true,
            }),
            creatorId: userId, // 设置创建者ID
            managerId: userId, // 向后兼容
            source: q.source === 'ai' ? 'ai' : 'bank',
          };
          
          // 如果提供了id字段，使用它；否则不设置id（避免null值唯一性冲突）
          if (q.id && q.id.trim()) {
            questionData.id = sanitizeString(q.id, { maxLength: 100 });
          }
          // 注意：不设置id字段，让它保持undefined，这样sparse索引就不会冲突

          // 根据题型设置不同的字段
          if (['single', 'multiple', 'judge'].includes(type)) {
            // 选择题和判断题
            questionData.options = Array.isArray(q.options) 
              ? q.options.map((opt) => sanitizeString(opt, { maxLength: 500 }))
              : [];
            
            // 验证选项数量
            if (questionData.options.length < 2) {
              throw new Error('至少需要 2 个选项');
            }
            
            // 处理答案字段
            if (type === 'multiple') {
              // 多选题：answer应该是数组
              if (q.answer !== undefined) {
                if (!Array.isArray(q.answer)) {
                  throw new Error('多选题的答案必须是数组');
                }
                if (q.answer.length === 0) {
                  throw new Error('多选题至少需要一个正确答案');
                }
                // 验证答案索引是否有效
                for (const idx of q.answer) {
                  if (typeof idx !== 'number' || idx < 0 || idx >= questionData.options.length) {
                    throw new Error(`答案索引 ${idx} 无效，必须在 0-${questionData.options.length - 1} 之间`);
                  }
                }
                questionData.answer = q.answer;
              } else if (q.answerIndex !== undefined) {
                // 向后兼容：如果提供了answerIndex，转换为数组
                questionData.answer = [q.answerIndex];
              } else {
                throw new Error('多选题必须提供答案（answer字段，数组格式）');
              }
            } else {
              // 单选题和判断题：answer应该是数字
              questionData.answer = q.answer !== undefined ? q.answer : q.answerIndex;
              if (typeof questionData.answer !== 'number' || questionData.answer < 0 || questionData.answer >= questionData.options.length) {
                throw new Error(`答案索引无效，必须在 0-${questionData.options.length - 1} 之间`);
              }
              // 向后兼容：设置 answerIndex
              questionData.answerIndex = questionData.answer;
            }
          } else if (type === 'fill') {
            // 填空题
            const blanksCount = parseInt(q.blanks) || 1;
            if (blanksCount < 1) {
              throw new Error('填空题至少需要1个空白');
            }
            questionData.blanks = blanksCount;
            
            // 验证blankAnswers
            if (!Array.isArray(q.blankAnswers)) {
              throw new Error('填空题的答案（blankAnswers）必须是数组');
            }
            if (q.blankAnswers.length === 0) {
              throw new Error('填空题至少需要一个答案');
            }
            if (q.blankAnswers.length !== blanksCount) {
              throw new Error(`填空题答案数量（${q.blankAnswers.length}）与空白数量（${blanksCount}）不匹配`);
            }
            
            questionData.blankAnswers = q.blankAnswers.map((ans) => {
              if (!ans || typeof ans !== 'string') {
                throw new Error('填空题的每个答案必须是非空字符串');
              }
              return sanitizeString(ans, { maxLength: 500 });
            });
            questionData.answer = questionData.blankAnswers;
          } else if (type === 'short') {
            // 简答题
            questionData.answer = sanitizeString(q.answer, { maxLength: 2000 });
          } else if (type === 'coding') {
            questionData.options = [];
            const referenceCode = q.codingMeta?.referenceCode || q.answer;
            if (!referenceCode || typeof referenceCode !== 'string' || !referenceCode.trim()) {
              throw new Error('编程题必须提供参考代码');
            }
            questionData.answer = referenceCode;
            questionData.codingMeta = {
              language: q.codingMeta?.language || 'java',
              referenceCode,
              starterCode: q.codingMeta?.starterCode || '',
              slug: q.codingMeta?.slug || '',
              externalSource: q.codingMeta?.externalSource || '',
              hint: q.codingMeta?.hint || '',
            };
          }

          // 自动生成qid（如果启用）
          if (q.autoGenerateQid && questionData.subjectCode) {
            try {
              questionData.qid = await generateQuestionId(questionData.subjectCode);
            } catch (error) {
              console.warn('生成qid失败:', error.message);
            }
          } else if (q.qid) {
            questionData.qid = q.qid;
          }

          const question = await Question.create(questionData);
          created.push(question._id);
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
          });
        }
      }

      // 更新题库题目数量（批量更新）
      if (bankId) {
        const { updateBankQuestionCount } = await import('../../services/bankStats.js');
        await updateBankQuestionCount(bankId).catch(err => {
          console.warn('更新题库计数失败:', err);
        });
      }

      res.status(201).json({
        success: true,
        data: {
          successCount: created.length,
          created: created.length,
          ids: created.map((id) => String(id)),
          errors: errors.length,
          details: errors,
        },
      });
    } catch (err) {
      console.error('POST /api/v3/questions/batch error:', err);
      res.status(500).json({
        success: false,
        message: '批量创建题目失败',
      });
    }
  }
);

/**
 * GET /api/v3/questions/:id/versions
 * 获取题目版本历史
 */
router.get('/:id/versions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const history = await getVersionHistory(id, {
      limit: parseInt(req.query.limit) || 50,
      includeContent: req.query.includeContent === 'true',
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    console.error('GET /api/v3/questions/:id/versions error:', err);
    res.status(500).json({
      success: false,
      message: '获取版本历史失败',
    });
  }
});

/**
 * POST /api/v3/questions/:id/restore
 * 恢复题目到指定版本
 */
router.post('/:id/restore', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;
    const userId = req.user.id;

    if (!version) {
      return res.status(400).json({
        success: false,
        message: '请指定要恢复的版本号',
      });
    }

    // 查找题目
    let question = await Question.findById(id);
    if (!question) {
      question = await Question.findOne({ id });
    }
    if (!question) {
      question = await Question.findOne({ qid: id });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    // 权限检查：使用canModifyQuestion的逻辑
    const userRole = req.user.role;

    // 管理员可以恢复所有题目
    if (userRole === 'admin') {
      // 继续执行
    } else {
      // 检查是否是创建者
      const creatorId = question.creatorId || question.managerId;
      if (!creatorId || creatorId.toString() !== userId) {
        // 检查题库权限
        if (question.bankId) {
          const QuestionBank = (await import('../../models/QuestionBank.js')).default;
          const bank = await QuestionBank.findById(question.bankId).lean();
          if (bank) {
            // 官方题库：只有管理员可以恢复
            if (bank.isOfficial) {
              return res.status(403).json({
                success: false,
                message: '官方题库的题目只能由管理员恢复',
              });
            }
            // 小组题库：群组老师可以恢复
            if (bank.groupId) {
              const Group = (await import('../../models/Group.js')).default;
              const group = await Group.findById(bank.groupId);
              if (!group || !group.isTeacher(userId)) {
                return res.status(403).json({
                  success: false,
                  message: '无权恢复该题目',
                });
              }
            } else {
              // 个人题库：只有创建者可以恢复
              return res.status(403).json({
                success: false,
                message: '无权恢复该题目',
              });
            }
          } else {
            return res.status(403).json({
              success: false,
              message: '无权恢复该题目',
            });
          }
        } else {
          // 无题库的题目：只有创建者可以恢复
          return res.status(403).json({
            success: false,
            message: '无权恢复该题目',
          });
        }
      }
    }

    const restored = await restoreVersion(question._id, version, userId);

    res.json({
      success: true,
      data: restored,
    });
  } catch (err) {
    console.error('POST /api/v3/questions/:id/restore error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '恢复版本失败',
    });
  }
});

/**
 * GET /api/v3/questions/:id/compare
 * 对比两个版本
 */
router.get('/:id/compare', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { v1, v2 } = req.query;

    if (!v1 || !v2) {
      return res.status(400).json({
        success: false,
        message: '请指定两个版本号（v1和v2）',
      });
    }

    // 查找题目
    let question = await Question.findById(id);
    if (!question) {
      question = await Question.findOne({ id });
    }
    if (!question) {
      question = await Question.findOne({ qid: id });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    const comparison = await compareVersions(
      question._id,
      parseInt(v1),
      parseInt(v2)
    );

    res.json({
      success: true,
      data: comparison,
    });
  } catch (err) {
    console.error('GET /api/v3/questions/:id/compare error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '对比版本失败',
    });
  }
});

/**
 * GET /api/v3/questions/:id/similar
 * 查找相似题目
 */
router.get('/:id/similar', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = validateInt(req.query.limit, {
      min: 1,
      max: 20,
      defaultValue: 5,
    });

    // 查找题目
    let question = await Question.findById(id);
    if (!question) {
      question = await Question.findOne({ id });
    }
    if (!question) {
      question = await Question.findOne({ qid: id });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    const similar = await findSimilarQuestions(question._id, { limit });

    res.json({
      success: true,
      data: similar,
    });
  } catch (err) {
    console.error('GET /api/v3/questions/:id/similar error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '查找相似题目失败',
    });
  }
});

/**
 * PUT /api/v3/questions/batch
 * 批量更新题目
 */
router.put('/batch', requireAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次最多更新100道题目',
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        message: '更新数据不能为空',
      });
    }

    const userId = req.user.id;
    const allowedFields = [
      'subjectCode',
      'bankId',
      'difficulty',
      'knowledgeNodeId',
      'tags',
      'source',
    ];

    // 构建更新对象（只允许更新指定字段）
    const updateData = {};
    allowedFields.forEach((field) => {
      if (updates.hasOwnProperty(field)) {
        if (field === 'tags' && Array.isArray(updates[field])) {
          updateData[field] = updates[field];
        } else if (field === 'difficulty') {
          const diff = validateInt(updates[field], {
            min: 1,
            max: 5,
            defaultValue: null,
          });
          if (diff !== null) {
            updateData[field] = diff;
          }
        } else if (updates[field] !== undefined && updates[field] !== null) {
          updateData[field] = updates[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的更新字段',
      });
    }

    // 检查权限：只能更新自己创建的题目（管理员除外）
    const isAdmin = req.user.role === 'admin';
    let query = { _id: { $in: ids } };
    
    if (!isAdmin) {
      // 检查是否是创建者（creatorId 或 managerId）
      query.$or = [
        { creatorId: userId },
        { managerId: userId }
      ];
    }

    // 执行批量更新
    const result = await Question.updateMany(query, { $set: updateData });

    // 如果更新了bankId，需要更新题库计数
    if (updateData.bankId !== undefined) {
      // 获取原题目信息
      const oldQuestions = await Question.find({ _id: { $in: ids } }).select('bankId').lean();
      const oldBankIds = new Set(oldQuestions.map(q => q.bankId?.toString()).filter(Boolean));
      const newBankId = updateData.bankId?.toString();

      // 更新旧题库计数
      for (const oldBankId of oldBankIds) {
        if (oldBankId !== newBankId) {
          await QuestionBank.findByIdAndUpdate(oldBankId, {
            $inc: { questionCount: -result.modifiedCount },
          });
        }
      }

      // 更新新题库计数
      if (newBankId) {
        await QuestionBank.findByIdAndUpdate(newBankId, {
          $inc: { questionCount: result.modifiedCount },
        });
      }
    }

    res.json({
      success: true,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (err) {
    console.error('PUT /api/v3/questions/batch error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量更新失败',
    });
  }
});

/**
 * DELETE /api/v3/questions/batch
 * 批量删除题目
 */
router.delete('/batch', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '题目ID列表不能为空',
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次最多删除100道题目',
      });
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // 检查权限并获取题目信息（用于更新题库计数）
    let query = { _id: { $in: ids } };
    if (!isAdmin) {
      // 检查是否是创建者（creatorId 或 managerId）
      query.$or = [
        { creatorId: userId },
        { managerId: userId }
      ];
    }

    const questions = await Question.find(query).select('bankId').lean();
    const bankIdCounts = {};

    // 统计每个题库需要减少的题目数
    questions.forEach((q) => {
      if (q.bankId) {
        const bankId = q.bankId.toString();
        bankIdCounts[bankId] = (bankIdCounts[bankId] || 0) + 1;
      }
    });

    // 删除题目
    const result = await Question.deleteMany(query);

    // 更新题库计数
    for (const [bankId, count] of Object.entries(bankIdCounts)) {
      await QuestionBank.findByIdAndUpdate(bankId, {
        $inc: { questionCount: -count },
      });
    }

    res.json({
      success: true,
      data: {
        deleted: result.deletedCount,
      },
    });
  } catch (err) {
    console.error('DELETE /api/v3/questions/batch error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '批量删除失败',
    });
  }
});

/**
 * POST /api/v3/questions/batch/move
 * 批量移动题目到另一个题库
 * 
 * body: {
 *   questionIds: [ObjectId], // 要移动的题目ID数组
 *   targetBankId: ObjectId,   // 目标题库ID
 * }
 */
router.post('/batch/move', requireAuth, async (req, res) => {
  try {
    const { questionIds, targetBankId } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questionIds 必须是非空数组',
      });
    }

    if (questionIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次最多移动100道题目',
      });
    }

    if (!targetBankId) {
      return res.status(400).json({
        success: false,
        message: 'targetBankId 不能为空',
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // 验证目标题库是否存在
    const targetBank = await QuestionBank.findById(targetBankId);
    if (!targetBank) {
      return res.status(404).json({
        success: false,
        message: '目标题库不存在',
      });
    }

    // 验证权限：是否有权限修改目标题库
    const canModifyTarget = 
      userRole === 'admin' ||
      targetBank.ownerId?.toString() === userId ||
      targetBank.managers?.some(m => m.toString() === userId);

    if (!canModifyTarget) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改目标题库',
      });
    }

    // 批量移动题目
    const { moveQuestionToBank } = await import('../../utils/businessOperations.js');
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const questionId of questionIds) {
      try {
        await moveQuestionToBank(questionId, targetBankId, userId);
        successCount++;
      } catch (err) {
        failCount++;
        errors.push({
          questionId,
          error: err.message || '移动失败',
        });
      }
    }

    // 更新相关题库的题目数量缓存
    const { batchUpdateBankQuestionCounts } = await import('../../services/bankStats.js');
    
    // 获取所有涉及的题库ID
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('bankId')
      .lean();
    
    const bankIds = new Set();
    questions.forEach(q => {
      if (q.bankId) bankIds.add(q.bankId.toString());
    });
    bankIds.add(targetBankId.toString());
    
    await batchUpdateBankQuestionCounts(Array.from(bankIds)).catch(err => {
      console.warn('批量更新题库计数失败:', err);
    });

    res.json({
      success: true,
      data: {
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (err) {
    console.error('POST /api/v3/questions/batch/move error:', err);
    res.status(500).json({
      success: false,
      message: '批量移动题目失败',
    });
  }
});

/**
 * POST /api/v3/questions/:id/favorite
 * 收藏题目
 */
router.post('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找题目
    let question = await Question.findById(id);
    if (!question) {
      question = await Question.findOne({ id });
    }
    if (!question) {
      question = await Question.findOne({ qid: id });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    // 检查是否已收藏
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    const questionId = question._id;
    if (user.favorites && user.favorites.includes(questionId)) {
      return res.json({
        success: true,
        message: '题目已在收藏列表中',
        isFavorited: true,
      });
    }

    // 添加到收藏列表
    await User.findByIdAndUpdate(userId, {
      $addToSet: { favorites: questionId },
    });

    res.json({
      success: true,
      message: '收藏成功',
      isFavorited: true,
    });
  } catch (err) {
    console.error('POST /api/v3/questions/:id/favorite error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '收藏失败',
    });
  }
});

/**
 * DELETE /api/v3/questions/:id/favorite
 * 取消收藏题目
 */
router.delete('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找题目
    let question = await Question.findById(id);
    if (!question) {
      question = await Question.findOne({ id });
    }
    if (!question) {
      question = await Question.findOne({ qid: id });
    }

    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    // 从收藏列表移除
    await User.findByIdAndUpdate(userId, {
      $pull: { favorites: question._id },
    });

    res.json({
      success: true,
      message: '取消收藏成功',
      isFavorited: false,
    });
  } catch (err) {
    console.error('DELETE /api/v3/questions/:id/favorite error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '取消收藏失败',
    });
  }
});

/**
 * GET /api/v3/questions/favorites
 * 获取收藏的题目列表
 */
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = '1', limit = '20' } = req.query;

    const user = await User.findById(userId).populate('favorites');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    const favorites = user.favorites || [];
    const pageNum = validateInt(page, { min: 1, defaultValue: 1 });
    const limitNum = validateInt(limit, { min: 1, max: 200, defaultValue: 50 });
    const skip = (pageNum - 1) * limitNum;

    // 获取收藏题目的详细信息
    const favoriteIds = favorites.map(f => f._id || f);
    const questions = await Question.find({ _id: { $in: favoriteIds } })
      .populate('bankId', 'name')
      .populate('subjectCode', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      data: questions,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: favorites.length,
        totalPages: Math.ceil(favorites.length / limitNum),
      },
    });
  } catch (err) {
    console.error('GET /api/v3/questions/favorites error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '获取收藏列表失败',
    });
  }
});

export default router;

