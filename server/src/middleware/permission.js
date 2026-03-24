/**
 * GraphTutor V3.0 - 权限检查中间件
 * 
 * 功能：检查用户是否有权限修改/删除题库和题目
 * 规则：只能修改自己创建的，或群组老师可以修改群组关联的内容
 */

import Question from '../models/Question.js';
import QuestionBank from '../models/QuestionBank.js';
import Group from '../models/Group.js';

/**
 * 检查用户是否可以修改题库
 * 权限规则：
 * - 官方题库（isOfficial=true）：只有管理员可以修改
 * - 小组题库（groupId不为空）：群组老师可以修改
 * - 个人题库（其他）：创建者和管理者可以修改
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件
 */
export async function canModifyBank(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const userRole = req.user.role;

    const bank = await QuestionBank.findById(id).lean();
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 官方题库：只有管理员可以修改
    if (bank.isOfficial) {
      if (userRole === 'admin') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: '官方题库只能由管理员修改',
      });
    }

    // 管理员可以修改所有非官方题库
    if (userRole === 'admin') {
      return next();
    }

    // 小组题库：群组老师可以修改
    if (bank.groupId) {
      const group = await Group.findById(bank.groupId);
      if (group && group.isTeacher(userId)) {
        return next();
      }
    }

    // 个人题库：创建者和管理者可以修改
    if (bank.ownerId && bank.ownerId.toString() === userId) {
      return next();
    }

    if (bank.managers && bank.managers.some(m => m.toString() === userId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: '无权修改此题库',
    });
  } catch (err) {
    console.error('canModifyBank error:', err);
    res.status(500).json({
      success: false,
      message: '权限检查失败',
    });
  }
}

/**
 * 检查用户是否可以修改题目
 * 权限规则：
 * - 官方题库的题目：只有管理员可以修改
 * - 小组题库的题目：群组老师可以修改
 * - 个人题库的题目：创建者可以修改
 * - 无题库的题目：创建者可以修改
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件
 */
export async function canModifyQuestion(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const userRole = req.user.role;

    const question = await Question.findById(id).lean();
    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在',
      });
    }

    // 管理员可以修改所有题目
    if (userRole === 'admin') {
      return next();
    }

    // 检查是否是创建者（creatorId 或 managerId）
    const creatorId = question.creatorId || question.managerId;
    if (creatorId && creatorId.toString() === userId) {
      return next();
    }

    // 如果题目有关联的题库，检查题库权限
    if (question.bankId) {
      const bank = await QuestionBank.findById(question.bankId).lean();
      if (bank) {
        // 官方题库的题目：只有管理员可以修改（已在上面检查）
        if (bank.isOfficial) {
          return res.status(403).json({
            success: false,
            message: '官方题库的题目只能由管理员修改',
          });
        }

        // 小组题库的题目：群组老师可以修改
        if (bank.groupId) {
          const group = await Group.findById(bank.groupId);
          if (group && group.isTeacher(userId)) {
            return next();
          }
        }

        // 个人题库的题目：题库创建者和管理者可以修改
        if (bank.ownerId && bank.ownerId.toString() === userId) {
          return next();
        }
        if (bank.managers && bank.managers.some(m => m.toString() === userId)) {
          return next();
        }
      }
    }

    // 如果题目直接关联群组
    if (question.groupId) {
      const group = await Group.findById(question.groupId);
      if (group && group.isTeacher(userId)) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: '无权修改此题目',
    });
  } catch (err) {
    console.error('canModifyQuestion error:', err);
    res.status(500).json({
      success: false,
      message: '权限检查失败',
    });
  }
}

/**
 * 检查用户是否可以创建题库/题目（学生也可以创建）
 * 这个中间件主要用于记录创建者信息
 */
export function canCreate(req, res, next) {
  // 所有已登录用户都可以创建
  // 创建时会自动设置ownerId/managerId
  next();
}

