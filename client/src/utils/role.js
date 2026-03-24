/**
 * 角色工具函数
 * 用于在前端方便地判断用户角色和权限
 */

/**
 * 检查用户是否为管理员
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user) return false;
  return user.role === 'admin' || user.isAdmin === true;
}

/**
 * 检查用户是否为出题负责人
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
export function isQuestionManager(user) {
  if (!user) return false;
  return user.role === 'question_manager';
}

/**
 * 检查用户是否为学习者
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
export function isStudent(user) {
  if (!user) return false;
  const role = user.role === 'user' ? 'student' : user.role; // 向后兼容
  return role === 'student';
}

/**
 * 检查用户是否可以管理资源（出题负责人或管理员）
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
export function canManageResources(user) {
  return isAdmin(user) || isQuestionManager(user);
}

/**
 * 检查用户是否有指定角色
 * @param {Object} user - 用户对象
 * @param {string|string[]} roles - 角色或角色数组
 * @returns {boolean}
 */
export function hasRole(user, roles) {
  if (!user || !roles) return false;
  
  // 向后兼容：将 'user' 映射为 'student'
  const userRole = user.role === 'user' ? 'student' : user.role;
  
  if (Array.isArray(roles)) {
    return roles.includes(userRole);
  }
  return userRole === roles;
}

/**
 * 获取角色的中文名称
 * @param {string} role - 角色代码
 * @returns {string}
 */
export function getRoleName(role) {
  const roleMap = {
    'admin': '管理员',
    'question_manager': '出题负责人',
    'student': '学习者',
    'user': '学习者', // 向后兼容
  };
  return roleMap[role] || '未知角色';
}

/**
 * 获取角色的颜色样式类
 * @param {string} role - 角色代码
 * @returns {string}
 */
export function getRoleColorClass(role) {
  const colorMap = {
    'admin': 'bg-red-100 text-red-800 border-red-300',
    'question_manager': 'bg-blue-100 text-blue-800 border-blue-300',
    'student': 'bg-green-100 text-green-800 border-green-300',
    'user': 'bg-green-100 text-green-800 border-green-300', // 向后兼容
  };
  return colorMap[role] || 'bg-slate-100 text-slate-800 border-slate-300';
}

/**
 * 获取所有可用角色列表
 * @returns {Array<{value: string, label: string}>}
 */
export function getAllRoles() {
  return [
    { value: 'student', label: '学习者' },
    { value: 'question_manager', label: '出题负责人' },
    { value: 'admin', label: '管理员' },
  ];
}

