/**
 * GraphTutor V3.0 - 数据备份和恢复工具
 * 
 * 功能：备份和恢复用户学习数据
 */

/**
 * 备份用户数据
 * @param {Object} data - 要备份的数据
 * @param {string} filename - 文件名
 */
export function backupUserData(data, filename = 'graphtutor-backup') {
  const backup = {
    version: '3.0',
    timestamp: new Date().toISOString(),
    data: {
      // 学习记录
      records: data.records || [],
      // 错题本
      wrongQuestions: data.wrongQuestions || [],
      // 学习笔记
      notes: data.notes || [],
      // 学习计划
      studyPlans: data.studyPlans || [],
      // 学习目标
      goals: data.goals || [],
      // 收藏
      favorites: data.favorites || [],
      // 成就
      achievements: data.achievements || [],
      // 设置
      settings: data.settings || {},
    },
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 从文件恢复数据
 * @param {File} file - 备份文件
 * @returns {Promise<Object>} 恢复的数据
 */
export async function restoreUserData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        
        // 验证备份格式
        if (!backup.version || !backup.data) {
          throw new Error('无效的备份文件格式');
        }

        // 验证版本兼容性
        if (parseFloat(backup.version) < 3.0) {
          throw new Error('备份文件版本过低，请使用V3.0及以上版本');
        }

        resolve(backup.data);
      } catch (err) {
        reject(new Error(`解析备份文件失败: ${err.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsText(file);
  });
}

/**
 * 验证备份文件
 * @param {File} file - 备份文件
 * @returns {Promise<Object>} 验证结果
 */
export async function validateBackupFile(file) {
  try {
    const data = await restoreUserData(file);
    
    const stats = {
      records: data.records?.length || 0,
      wrongQuestions: data.wrongQuestions?.length || 0,
      notes: data.notes?.length || 0,
      studyPlans: data.studyPlans?.length || 0,
      goals: data.goals?.length || 0,
      favorites: data.favorites?.length || 0,
      achievements: data.achievements?.length || 0,
    };

    return {
      valid: true,
      stats,
      totalItems: Object.values(stats).reduce((sum, count) => sum + count, 0),
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message,
    };
  }
}

/**
 * 导出部分数据（选择性备份）
 * @param {Object} data - 数据
 * @param {Array} types - 要导出的数据类型 ['records', 'wrongQuestions', 'notes', ...]
 * @param {string} filename - 文件名
 */
export function exportSelectedData(data, types = [], filename = 'graphtutor-export') {
  const exportData = {
    version: '3.0',
    timestamp: new Date().toISOString(),
    types,
    data: {},
  };

  types.forEach(type => {
    if (data[type]) {
      exportData.data[type] = data[type];
    }
  });

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

