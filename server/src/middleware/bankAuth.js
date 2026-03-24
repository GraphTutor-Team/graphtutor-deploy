/**
 * GraphTutor V3.0 - 题库权限验证中间件
 * 
 * 功能：提供细粒度的题库权限控制
 */

import QuestionBank from '../models/QuestionBank.js';
import Group from '../models/Group.js';

/**
 * 检查用户是否可以查看题库
 * 权限规则：
 * - 官方题库：所有用户都可以查看（公开）
 * - 小组题库：群组成员可以查看
 * - 个人题库：公开题库所有用户可查看，私有题库只有创建者和管理者可查看
 */
export async function canViewBank(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 管理员可以查看所有题库
    if (userRole === 'admin') {
      return next();
    }

    const bank = await QuestionBank.findById(id).lean();
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 官方题库：所有用户都可以查看
    if (bank.isOfficial) {
      return next();
    }

    // 小组题库：群组成员可以查看
    if (bank.groupId) {
      const group = await Group.findById(bank.groupId);
      if (group && (group.isMember(userId) || group.ownerId.toString() === userId)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: '只有群组成员可以查看该题库',
      });
    }

    // 个人题库：公开题库所有用户可查看，私有题库只有创建者和管理者可查看
    if (bank.isPublic) {
      return next();
    }

    // 检查是否是题库的创建者或管理者
    const isOwner = bank.ownerId?.toString() === userId;
    const isManager = bank.managers?.some(
      (m) => m.toString() === userId
    );

    if (isOwner || isManager) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: '无权查看该题库',
    });
  } catch (err) {
    console.error('canViewBank error:', err);
    return res.status(500).json({
      success: false,
      message: '权限验证失败',
    });
  }
}

/**
 * 检查用户是否可以编辑题库
 * - 管理员：可以编辑所有题库
 * - 出题负责人：只能编辑自己管理的题库
 */
export async function canEditBank(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 管理员可以编辑所有题库
    if (userRole === 'admin') {
      return next();
    }

    const bank = await QuestionBank.findById(id).lean();
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 检查是否是题库的创建者或管理者
    const isOwner = bank.ownerId?.toString() === userId;
    const isManager = bank.managers?.some(
      (m) => m.toString() === userId
    );

    if (isOwner || isManager) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: '无权编辑该题库',
    });
  } catch (err) {
    console.error('canEditBank error:', err);
    return res.status(500).json({
      success: false,
      message: '权限验证失败',
    });
  }
}

/**
 * 检查用户是否可以删除题库
 * 权限规则：
 * - 官方题库（isOfficial=true）：只有管理员可以删除
 * - 小组题库（groupId不为空）：群组老师可以删除
 * - 个人题库（其他）：只有创建者可以删除（且没有其他管理者）
 */
export async function canDeleteBank(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const bank = await QuestionBank.findById(id).lean();
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    // 官方题库：只有管理员可以删除
    if (bank.isOfficial) {
      if (userRole === 'admin') {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: '官方题库只能由管理员删除',
      });
    }

    // 管理员可以删除所有非官方题库
    if (userRole === 'admin') {
      return next();
    }

    // 小组题库：群组老师可以删除
    if (bank.groupId) {
      const Group = (await import('../models/Group.js')).default;
      const group = await Group.findById(bank.groupId);
      if (group && group.isTeacher(userId)) {
        return next();
      }
      return res.status(403).json({
        success: false,
        message: '只有群组老师可以删除小组题库',
      });
    }

    // 个人题库：只有创建者可以删除
    const isOwner = bank.ownerId?.toString() === userId;
    
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己创建的题库',
      });
    }

    // 如果有其他管理者，不能删除
    const otherManagers = bank.managers?.filter(
      (m) => m.toString() !== userId
    );
    
    if (otherManagers && otherManagers.length > 0) {
      return res.status(403).json({
        success: false,
        message: '该题库有其他管理者，无法删除',
      });
    }

    return next();
  } catch (err) {
    console.error('canDeleteBank error:', err);
    return res.status(500).json({
      success: false,
      message: '权限验证失败',
    });
  }
}

/**
 * 挂载题库信息到 req.bank（用于后续中间件使用）
 */
export async function loadBank(req, res, next) {
  try {
    const { id } = req.params;
    
    const bank = await QuestionBank.findById(id)
      .populate('ownerId', 'name email')
      .populate('managers', 'name email role')
      .lean();

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: '题库不存在',
      });
    }

    req.bank = bank;
    return next();
  } catch (err) {
    console.error('loadBank error:', err);
    return res.status(500).json({
      success: false,
      message: '加载题库信息失败',
    });
  }
}

