/**
 * GraphTutor V3.0 - 权限检查中间件（基于PermissionService）
 * 
 * 功能：提供统一的权限检查中间件，使用PermissionService
 */

import PermissionService, { checkPermission } from '../services/permissionService.js';
import { asyncHandler } from '../utils/errorHandler.js';

/**
 * 检查用户是否可以查看题库
 */
export const checkViewBank = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const QuestionBank = (await import('../models/QuestionBank.js')).default;
  const bank = await QuestionBank.findById(id).lean();
  
  if (!bank) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = await PermissionService.canViewBank(user, bank);
  checkPermission(result);

  req.bank = bank; // 挂载到req供后续使用
  next();
});

/**
 * 检查用户是否可以修改题库
 */
export const checkModifyBank = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const QuestionBank = (await import('../models/QuestionBank.js')).default;
  const bank = await QuestionBank.findById(id).lean();
  
  if (!bank) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = await PermissionService.canModifyBank(user, bank);
  checkPermission(result);

  req.bank = bank;
  next();
});

/**
 * 检查用户是否可以删除题库
 */
export const checkDeleteBank = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const QuestionBank = (await import('../models/QuestionBank.js')).default;
  const bank = await QuestionBank.findById(id).lean();
  
  if (!bank) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = await PermissionService.canDeleteBank(user, bank);
  checkPermission(result);

  req.bank = bank;
  next();
});

/**
 * 检查用户是否可以修改题目
 */
export const checkModifyQuestion = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const Question = (await import('../models/Question.js')).default;
  const question = await Question.findById(id).lean();
  
  if (!question) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = await PermissionService.canModifyQuestion(user, question);
  checkPermission(result);

  req.question = question;
  next();
});

/**
 * 检查用户是否可以查看笔记
 */
export const checkViewNote = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const Note = (await import('../models/Note.js')).default;
  const note = await Note.findById(id).lean();
  
  if (!note) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = PermissionService.canViewNote(user, note);
  checkPermission(result);

  req.note = note;
  next();
});

/**
 * 检查用户是否可以修改笔记
 */
export const checkModifyNote = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const Note = (await import('../models/Note.js')).default;
  const note = await Note.findById(id).lean();
  
  if (!note) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = PermissionService.canModifyNote(user, note);
  checkPermission(result);

  req.note = note;
  next();
});

/**
 * 检查用户是否可以查看讨论
 */
export const checkViewDiscussion = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const Discussion = (await import('../models/Discussion.js')).default;
  const discussion = await Discussion.findById(id).lean();
  
  if (!discussion) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = PermissionService.canViewDiscussion(user, discussion);
  checkPermission(result);

  req.discussion = discussion;
  next();
});

/**
 * 检查用户是否可以修改讨论
 */
export const checkModifyDiscussion = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '未认证用户' });
  }

  const Discussion = (await import('../models/Discussion.js')).default;
  const discussion = await Discussion.findById(id).lean();
  
  if (!discussion) {
    return res.status(404).json({ message: '资源不存在' });
  }

  const result = PermissionService.canModifyDiscussion(user, discussion);
  checkPermission(result);

  req.discussion = discussion;
  next();
});

/**
 * 通用权限检查中间件工厂
 * @param {Function} permissionChecker - 权限检查函数 (user, resource) => PermissionResult
 * @param {Function} resourceLoader - 资源加载函数 (req) => Promise<resource>
 * @returns {Function} Express中间件
 */
export function createPermissionCheck(permissionChecker, resourceLoader) {
  return asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: '未认证用户' });
    }

    const resource = await resourceLoader(req);
    const result = await permissionChecker(user, resource);
    checkPermission(result);

    // 将资源挂载到req
    const resourceName = resource.constructor?.modelName?.toLowerCase() || 'resource';
    req[resourceName] = resource;

    next();
  });
}

