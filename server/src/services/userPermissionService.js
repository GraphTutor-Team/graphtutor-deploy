/**
 * GraphTutor V3.0 - 用户权限详情服务
 * 
 * 作用：获取用户的详细权限信息，包括角色权限、资源统计、权限分类等，用于在界面上清晰展示用户权限
 * 关联页面：
 *   - routes/users.js (用户路由，使用此服务)
 *   - client/src/pages/admin/components/UserPermissions.jsx (权限详情组件)
 *   - client/src/pages/admin/components/UserDetailModal.jsx (用户详情模态框)
 * 技术栈：
 *   - MongoDB查询
 *   - 权限计算逻辑
 *   - 资源统计
 *   - 权限分类和汇总
 */

import User from '../models/User.js';
import QuestionBank from '../models/QuestionBank.js';
import Question from '../models/Question.js';
import Note from '../models/Note.js';
import Discussion from '../models/Discussion.js';
import Group from '../models/Group.js';

/**
 * 获取用户权限详情
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 权限详情对象
 */
export async function getUserPermissions(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('用户不存在');
  }

  const role = user.role || 'student';
  
  // 基础权限配置
  const permissions = {
    // 角色信息
    role: role,
    roleName: getRoleName(role),
    
    // 用户管理权限
    userManagement: {
      canViewAllUsers: role === 'admin',
      canModifyUserRole: role === 'admin',
      canDeleteUsers: role === 'admin',
      canBatchImportUsers: role === 'admin',
      canViewUserDetails: role === 'admin',
    },
    
    // 题库管理权限
    bankManagement: {
      canCreateBank: role === 'admin' || role === 'question_manager',
      canEditAllBanks: role === 'admin',
      canDeleteAllBanks: role === 'admin',
      canImportBanks: role === 'admin' || role === 'question_manager',
      canExportBanks: true, // 所有用户都可以导出
      canViewPublicBanks: true,
      canViewPrivateBanks: role === 'admin',
    },
    
    // 题目管理权限
    questionManagement: {
      canCreateQuestion: role === 'admin' || role === 'question_manager',
      canEditAllQuestions: role === 'admin',
      canDeleteAllQuestions: role === 'admin',
      canImportQuestions: role === 'admin' || role === 'question_manager',
      canExportQuestions: true,
      canUseAI: role === 'admin' || role === 'question_manager',
    },
    
    // 学科管理权限
    subjectManagement: {
      canManageSubjects: role === 'admin' || role === 'question_manager',
      canCreateSubject: role === 'admin' || role === 'question_manager',
      canEditSubject: role === 'admin' || role === 'question_manager',
      canDeleteSubject: role === 'admin',
    },
    
    // 笔记权限
    noteManagement: {
      canCreateNote: true,
      canEditOwnNotes: true,
      canDeleteOwnNotes: true,
      canViewPublicNotes: true,
      canViewAllNotes: role === 'admin',
      canDeleteAllNotes: role === 'admin',
    },
    
    // 讨论权限
    discussionManagement: {
      canCreateDiscussion: true,
      canEditOwnDiscussions: true,
      canDeleteOwnDiscussions: true,
      canViewAllDiscussions: true,
      canModerateDiscussions: role === 'admin',
      canDeleteAllDiscussions: role === 'admin',
    },
    
    // 系统管理权限
    systemManagement: {
      canAccessAdminPanel: role === 'admin',
      canViewSystemStats: role === 'admin',
      canExportAllData: role === 'admin',
      canImportAllData: role === 'admin',
      canManageSettings: role === 'admin',
      canWipeData: role === 'admin',
    },
    
    // 数据统计权限
    analytics: {
      canViewOwnAnalytics: true,
      canViewAllAnalytics: role === 'admin',
      canExportReports: true,
      canViewSystemReports: role === 'admin',
    },
    
    // 群组权限
    groupManagement: {
      canCreateGroup: true,
      canJoinGroup: true,
      canManageOwnGroups: true,
      canManageAllGroups: role === 'admin',
    },
  };

  // 统计用户拥有的资源数量
  const stats = await getUserResourceStats(userId, role);
  
  return {
    permissions,
    stats,
    summary: generatePermissionSummary(permissions),
  };
}

/**
 * 获取角色名称
 */
function getRoleName(role) {
  const roleNames = {
    student: '学生',
    question_manager: '出题负责人',
    admin: '管理员',
  };
  return roleNames[role] || role;
}

/**
 * 获取用户资源统计
 */
async function getUserResourceStats(userId, role) {
  const stats = {
    banks: 0,
    questions: 0,
    notes: 0,
    discussions: 0,
    groups: 0,
  };

  try {
    // 用户创建的题库
    stats.banks = await QuestionBank.countDocuments({ ownerId: userId });
    
    // 用户创建的题目
    stats.questions = await Question.countDocuments({ 
      $or: [
        { creatorId: userId },
        { managerId: userId },
      ],
    });
    
    // 用户的笔记
    stats.notes = await Note.countDocuments({ userId });
    
    // 用户创建的讨论
    stats.discussions = await Discussion.countDocuments({ userId });
    
    // 用户创建的群组
    stats.groups = await Group.countDocuments({ ownerId: userId });
  } catch (err) {
    console.error('获取用户资源统计失败:', err);
  }

  return stats;
}

/**
 * 生成权限摘要
 */
function generatePermissionSummary(permissions) {
  const summary = [];
  
  // 根据角色生成摘要
  if (permissions.userManagement.canViewAllUsers) {
    summary.push('可以管理所有用户');
  }
  
  if (permissions.bankManagement.canCreateBank) {
    summary.push('可以创建和管理题库');
  }
  
  if (permissions.questionManagement.canCreateQuestion) {
    summary.push('可以创建和管理题目');
  }
  
  if (permissions.systemManagement.canAccessAdminPanel) {
    summary.push('可以访问系统管理后台');
  }
  
  if (permissions.noteManagement.canCreateNote) {
    summary.push('可以创建和管理笔记');
  }
  
  if (permissions.discussionManagement.canCreateDiscussion) {
    summary.push('可以参与讨论');
  }
  
  if (summary.length === 0) {
    summary.push('基础学习功能');
  }
  
  return summary;
}

/**
 * 获取权限说明文本
 * @param {Object} permissions - 权限对象
 * @returns {Object} 权限说明
 */
export function getPermissionDescriptions(permissions) {
  const descriptions = {
    userManagement: {
      canViewAllUsers: '查看所有用户列表',
      canModifyUserRole: '修改用户角色',
      canDeleteUsers: '删除用户',
      canBatchImportUsers: '批量导入用户',
      canViewUserDetails: '查看用户详细信息',
    },
    bankManagement: {
      canCreateBank: '创建题库',
      canEditAllBanks: '编辑所有题库',
      canDeleteAllBanks: '删除所有题库',
      canImportBanks: '导入题库',
      canExportBanks: '导出题库',
      canViewPublicBanks: '查看公开题库',
      canViewPrivateBanks: '查看私有题库',
    },
    questionManagement: {
      canCreateQuestion: '创建题目',
      canEditAllQuestions: '编辑所有题目',
      canDeleteAllQuestions: '删除所有题目',
      canImportQuestions: '导入题目',
      canExportQuestions: '导出题目',
      canUseAI: '使用AI生成题目',
    },
    subjectManagement: {
      canManageSubjects: '管理学科分类',
      canCreateSubject: '创建学科',
      canEditSubject: '编辑学科',
      canDeleteSubject: '删除学科',
    },
    noteManagement: {
      canCreateNote: '创建笔记',
      canEditOwnNotes: '编辑自己的笔记',
      canDeleteOwnNotes: '删除自己的笔记',
      canViewPublicNotes: '查看公开笔记',
      canViewAllNotes: '查看所有笔记',
      canDeleteAllNotes: '删除所有笔记',
    },
    discussionManagement: {
      canCreateDiscussion: '创建讨论',
      canEditOwnDiscussions: '编辑自己的讨论',
      canDeleteOwnDiscussions: '删除自己的讨论',
      canViewAllDiscussions: '查看所有讨论',
      canModerateDiscussions: '管理讨论',
      canDeleteAllDiscussions: '删除所有讨论',
    },
    systemManagement: {
      canAccessAdminPanel: '访问管理后台',
      canViewSystemStats: '查看系统统计',
      canExportAllData: '导出所有数据',
      canImportAllData: '导入所有数据',
      canManageSettings: '管理系统设置',
      canWipeData: '清空系统数据',
    },
    analytics: {
      canViewOwnAnalytics: '查看自己的学习分析',
      canViewAllAnalytics: '查看所有用户的学习分析',
      canExportReports: '导出学习报告',
      canViewSystemReports: '查看系统报告',
    },
    groupManagement: {
      canCreateGroup: '创建学习群组',
      canJoinGroup: '加入群组',
      canManageOwnGroups: '管理自己创建的群组',
      canManageAllGroups: '管理所有群组',
    },
  };
  
  return descriptions;
}

