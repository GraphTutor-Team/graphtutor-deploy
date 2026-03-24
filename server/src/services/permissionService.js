/**
 * GraphTutor V3.0 - 权限检查服务
 * 
 * 功能：提供统一的权限检查逻辑，支持资源所有权、角色权限等验证
 */

import Question from '../models/Question.js';
import QuestionBank from '../models/QuestionBank.js';
import Note from '../models/Note.js';
import Discussion from '../models/Discussion.js';
import Group from '../models/Group.js';
import { ForbiddenError, NotFoundError } from '../utils/errorHandler.js';
import { log } from '../utils/logger.js';

/**
 * 权限检查结果
 */
export class PermissionResult {
  constructor(allowed, reason = null) {
    this.allowed = allowed;
    this.reason = reason;
  }

  static allow() {
    return new PermissionResult(true);
  }

  static deny(reason) {
    return new PermissionResult(false, reason);
  }
}

/**
 * 权限检查服务类
 */
export class PermissionService {
  /**
   * 检查用户是否是资源的所有者
   * @param {string} userId - 用户ID
   * @param {Object} resource - 资源对象
   * @param {string[]} ownerFields - 所有者字段名数组（如 ['ownerId', 'createdBy', 'userId']）
   * @returns {boolean}
   */
  static isOwner(userId, resource, ownerFields = ['ownerId', 'createdBy', 'userId', 'creatorId', 'managerId']) {
    if (!resource || !userId) return false;

    for (const field of ownerFields) {
      const ownerId = resource[field];
      if (ownerId && ownerId.toString() === userId.toString()) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查用户是否是管理员
   * @param {Object} user - 用户对象
   * @returns {boolean}
   */
  static isAdmin(user) {
    return !!(user && (user.isAdmin === true || user.role === 'admin'));
  }

  /**
   * 检查用户是否具有指定角色
   * @param {Object} user - 用户对象
   * @param {string|string[]} roles - 角色或角色数组
   * @returns {boolean}
   */
  static hasRole(user, roles) {
    if (!user || !user.role) return false;
    
    const userRole = user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return allowedRoles.includes(userRole);
  }

  /**
   * 检查用户是否可以查看题库
   * @param {Object} user - 用户对象
   * @param {Object} bank - 题库对象
   * @returns {PermissionResult}
   */
  static async canViewBank(user, bank) {
    if (!bank) {
      return PermissionResult.deny('题库不存在');
    }

    // 管理员可以查看所有题库
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 官方题库：所有用户都可以查看
    if (bank.isOfficial) {
      return PermissionResult.allow();
    }

    // 小组题库：群组成员可以查看
    if (bank.groupId) {
      const group = await Group.findById(bank.groupId).lean();
      if (group) {
        const isMember = group.members?.some(m => m.toString() === user.id) ||
                        group.ownerId?.toString() === user.id;
        if (isMember) {
          return PermissionResult.allow();
        }
        return PermissionResult.deny('只有群组成员可以查看该题库');
      }
    }

    // 个人题库：公开题库所有用户可查看，私有题库只有创建者和管理者可查看
    if (bank.isPublic) {
      return PermissionResult.allow();
    }

    // 检查是否是题库的创建者或管理者
    const isOwner = this.isOwner(user.id, bank, ['ownerId']);
    const isManager = bank.managers?.some(m => m.toString() === user.id);

    if (isOwner || isManager) {
      return PermissionResult.allow();
    }

    return PermissionResult.deny('无权查看该题库');
  }

  /**
   * 检查用户是否可以修改题库
   * @param {Object} user - 用户对象
   * @param {Object} bank - 题库对象
   * @returns {PermissionResult}
   */
  static async canModifyBank(user, bank) {
    if (!bank) {
      return PermissionResult.deny('题库不存在');
    }

    // 官方题库：只有管理员可以修改
    if (bank.isOfficial) {
      if (this.isAdmin(user)) {
        return PermissionResult.allow();
      }
      return PermissionResult.deny('官方题库只能由管理员修改');
    }

    // 管理员可以修改所有非官方题库
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 小组题库：群组老师可以修改
    if (bank.groupId) {
      const group = await Group.findById(bank.groupId).lean();
      if (group) {
        // 检查是否是群组老师（需要查看Group模型的isTeacher方法或类似逻辑）
        const isTeacher = group.teachers?.some(t => t.toString() === user.id) ||
                         group.ownerId?.toString() === user.id;
        if (isTeacher) {
          return PermissionResult.allow();
        }
      }
    }

    // 个人题库：创建者和管理者可以修改
    const isOwner = this.isOwner(user.id, bank, ['ownerId']);
    const isManager = bank.managers?.some(m => m.toString() === user.id);

    if (isOwner || isManager) {
      return PermissionResult.allow();
    }

    return PermissionResult.deny('无权修改此题库');
  }

  /**
   * 检查用户是否可以删除题库
   * @param {Object} user - 用户对象
   * @param {Object} bank - 题库对象
   * @returns {PermissionResult}
   */
  static async canDeleteBank(user, bank) {
    if (!bank) {
      return PermissionResult.deny('题库不存在');
    }

    // 官方题库：只有管理员可以删除
    if (bank.isOfficial) {
      if (this.isAdmin(user)) {
        return PermissionResult.allow();
      }
      return PermissionResult.deny('官方题库只能由管理员删除');
    }

    // 管理员可以删除所有非官方题库
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 小组题库：群组老师可以删除
    if (bank.groupId) {
      const group = await Group.findById(bank.groupId).lean();
      if (group) {
        const isTeacher = group.teachers?.some(t => t.toString() === user.id) ||
                         group.ownerId?.toString() === user.id;
        if (isTeacher) {
          return PermissionResult.allow();
        }
        return PermissionResult.deny('只有群组老师可以删除小组题库');
      }
    }

    // 个人题库：只有创建者可以删除
    const isOwner = this.isOwner(user.id, bank, ['ownerId']);
    if (!isOwner) {
      return PermissionResult.deny('只能删除自己创建的题库');
    }

    // 如果有其他管理者，不能删除
    const otherManagers = bank.managers?.filter(m => m.toString() !== user.id);
    if (otherManagers && otherManagers.length > 0) {
      return PermissionResult.deny('该题库有其他管理者，无法删除');
    }

    return PermissionResult.allow();
  }

  /**
   * 检查用户是否可以修改题目
   * @param {Object} user - 用户对象
   * @param {Object} question - 题目对象
   * @returns {PermissionResult}
   */
  static async canModifyQuestion(user, question) {
    if (!question) {
      return PermissionResult.deny('题目不存在');
    }

    // 管理员可以修改所有题目
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 检查是否是创建者
    const isCreator = this.isOwner(user.id, question, ['creatorId', 'managerId']);
    if (isCreator) {
      return PermissionResult.allow();
    }

    // 如果题目有关联的题库，检查题库权限
    if (question.bankId) {
      const bank = await QuestionBank.findById(question.bankId).lean();
      if (bank) {
        // 官方题库的题目：只有管理员可以修改
        if (bank.isOfficial) {
          return PermissionResult.deny('官方题库的题目只能由管理员修改');
        }

        // 小组题库的题目：群组老师可以修改
        if (bank.groupId) {
          const group = await Group.findById(bank.groupId).lean();
          if (group) {
            const isTeacher = group.teachers?.some(t => t.toString() === user.id) ||
                             group.ownerId?.toString() === user.id;
            if (isTeacher) {
              return PermissionResult.allow();
            }
          }
        }

        // 个人题库的题目：题库创建者和管理者可以修改
        const isBankOwner = this.isOwner(user.id, bank, ['ownerId']);
        const isBankManager = bank.managers?.some(m => m.toString() === user.id);
        if (isBankOwner || isBankManager) {
          return PermissionResult.allow();
        }
      }
    }

    // 如果题目直接关联群组
    if (question.groupId) {
      const group = await Group.findById(question.groupId).lean();
      if (group) {
        const isTeacher = group.teachers?.some(t => t.toString() === user.id) ||
                         group.ownerId?.toString() === user.id;
        if (isTeacher) {
          return PermissionResult.allow();
        }
      }
    }

    return PermissionResult.deny('无权修改此题目');
  }

  /**
   * 检查用户是否可以查看笔记
   * @param {Object} user - 用户对象
   * @param {Object} note - 笔记对象
   * @returns {PermissionResult}
   */
  static canViewNote(user, note) {
    if (!note) {
      return PermissionResult.deny('笔记不存在');
    }

    // 管理员可以查看所有笔记
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 公开笔记：所有用户都可以查看
    if (note.isPublic) {
      return PermissionResult.allow();
    }

    // 私有笔记：只有创建者可以查看
    const isOwner = this.isOwner(user.id, note, ['userId', 'createdBy']);
    if (isOwner) {
      return PermissionResult.allow();
    }

    return PermissionResult.deny('无权查看该笔记');
  }

  /**
   * 检查用户是否可以修改笔记
   * @param {Object} user - 用户对象
   * @param {Object} note - 笔记对象
   * @returns {PermissionResult}
   */
  static canModifyNote(user, note) {
    if (!note) {
      return PermissionResult.deny('笔记不存在');
    }

    // 管理员可以修改所有笔记
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 只有创建者可以修改
    const isOwner = this.isOwner(user.id, note, ['userId', 'createdBy']);
    if (isOwner) {
      return PermissionResult.allow();
    }

    return PermissionResult.deny('无权修改该笔记');
  }

  /**
   * 检查用户是否可以查看讨论
   * @param {Object} user - 用户对象
   * @param {Object} discussion - 讨论对象
   * @returns {PermissionResult}
   */
  static canViewDiscussion(user, discussion) {
    if (!discussion) {
      return PermissionResult.deny('讨论不存在');
    }

    // 管理员可以查看所有讨论
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 公开讨论：所有用户都可以查看
    if (discussion.isPublic !== false) {
      return PermissionResult.allow();
    }

    // 私有讨论：只有创建者可以查看
    const isOwner = this.isOwner(user.id, discussion, ['userId', 'createdBy']);
    if (isOwner) {
      return PermissionResult.allow();
    }

    return PermissionResult.deny('无权查看该讨论');
  }

  /**
   * 检查用户是否可以修改讨论
   * @param {Object} user - 用户对象
   * @param {Object} discussion - 讨论对象
   * @returns {PermissionResult}
   */
  static canModifyDiscussion(user, discussion) {
    if (!discussion) {
      return PermissionResult.deny('讨论不存在');
    }

    // 管理员可以修改所有讨论
    if (this.isAdmin(user)) {
      return PermissionResult.allow();
    }

    // 只有创建者可以修改
    const isOwner = this.isOwner(user.id, discussion, ['userId', 'createdBy']);
    if (isOwner) {
      return PermissionResult.allow();
    }

    return PermissionResult.deny('无权修改该讨论');
  }
}

/**
 * 便捷函数：检查权限并抛出错误
 * @param {PermissionResult} result - 权限检查结果
 * @throws {ForbiddenError|NotFoundError}
 */
export function checkPermission(result) {
  if (!result.allowed) {
    if (result.reason === '资源不存在' || result.reason?.includes('不存在')) {
      throw new NotFoundError(result.reason || '资源不存在');
    }
    throw new ForbiddenError(result.reason || '权限不足');
  }
}

/**
 * 便捷函数：检查权限并返回布尔值
 * @param {PermissionResult} result - 权限检查结果
 * @returns {boolean}
 */
export function hasPermission(result) {
  return result.allowed;
}

export default PermissionService;

