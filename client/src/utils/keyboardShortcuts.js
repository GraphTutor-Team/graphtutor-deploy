/**
 * GraphTutor V3.0 - 键盘快捷键系统
 * 
 * 功能：提供全局键盘快捷键支持
 */

/**
 * 快捷键配置
 */
export const SHORTCUTS = {
  // 导航快捷键
  SEARCH: { key: 'k', ctrl: true, meta: true, label: '打开搜索', action: 'search' },
  HELP: { key: '/', ctrl: true, meta: true, label: '显示帮助', action: 'help' },
  HOME: { key: 'h', ctrl: true, meta: true, label: '返回首页', action: 'home' },
  BACK: { key: 'b', ctrl: true, meta: true, label: '返回上一页', action: 'back' },
  
  // 学习相关
  QUIZ: { key: 'q', ctrl: true, meta: true, label: '开始练习', action: 'quiz' },
  REVIEW: { key: 'r', ctrl: true, meta: true, label: '错题复习', action: 'review' },
  NOTES: { key: 'n', ctrl: true, meta: true, label: '学习笔记', action: 'notes' },
  ANALYTICS: { key: 'a', ctrl: true, meta: true, label: '学习分析', action: 'analytics' },
  
  // 通用操作
  ESCAPE: { key: 'Escape', label: '关闭/取消', action: 'escape' },
  ENTER: { key: 'Enter', label: '确认/提交', action: 'enter' },
  
  // 编辑操作
  SAVE: { key: 's', ctrl: true, meta: true, label: '保存', action: 'save' },
  NEW: { key: 'n', ctrl: true, meta: true, shift: true, label: '新建', action: 'new' },
  
  // 设置
  SETTINGS: { key: ',', ctrl: true, meta: true, label: '打开设置', action: 'settings' },
};

/**
 * 快捷键处理器映射
 */
const handlers = new Map();

/**
 * 注册快捷键处理器
 * @param {string} action - 动作名称
 * @param {Function} handler - 处理函数
 */
export function registerShortcut(action, handler) {
  handlers.set(action, handler);
}

/**
 * 移除快捷键处理器
 * @param {string} action - 动作名称
 */
export function unregisterShortcut(action) {
  handlers.delete(action);
}

/**
 * 处理键盘事件
 */
function handleKeyDown(e) {
  // 忽略在输入框中的快捷键（除了全局快捷键）
  const isInput = e.target.tagName === 'INPUT' || 
                  e.target.tagName === 'TEXTAREA' || 
                  e.target.isContentEditable;
  
  // 检查所有快捷键配置
  for (const [action, config] of Object.entries(SHORTCUTS)) {
    if (matchesShortcut(e, config)) {
      // 某些快捷键即使在输入框中也要生效
      if (isInput && !['Escape', 'Enter'].includes(config.key)) {
        continue;
      }
      
      e.preventDefault();
      const handler = handlers.get(config.action);
      if (handler) {
        handler(e);
      }
      return;
    }
  }
}

/**
 * 检查按键是否匹配快捷键配置
 */
function matchesShortcut(e, config) {
  // 检查主键
  if (e.key !== config.key && e.code !== `Key${config.key.toUpperCase()}`) {
    return false;
  }
  
  // 检查修饰键
  if (config.ctrl && !e.ctrlKey && !e.metaKey) return false;
  if (config.meta && !e.metaKey && !e.ctrlKey) return false;
  if (config.shift && !e.shiftKey) return false;
  if (config.alt && !e.altKey) return false;
  
  // 确保不需要的修饰键没有被按下
  if (!config.ctrl && !config.meta && (e.ctrlKey || e.metaKey)) return false;
  if (!config.shift && e.shiftKey) return false;
  if (!config.alt && e.altKey) return false;
  
  return true;
}

/**
 * 初始化快捷键系统
 */
export function initKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyDown);
}

/**
 * 销毁快捷键系统
 */
export function destroyKeyboardShortcuts() {
  document.removeEventListener('keydown', handleKeyDown);
  handlers.clear();
}

/**
 * 获取快捷键显示文本
 * @param {Object} config - 快捷键配置
 * @returns {string} 显示文本
 */
export function getShortcutText(config) {
  const parts = [];
  
  if (config.ctrl || config.meta) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (config.shift) {
    parts.push('Shift');
  }
  if (config.alt) {
    parts.push('Alt');
  }
  
  let key = config.key;
  if (key.length === 1) {
    key = key.toUpperCase();
  } else {
    // 特殊键映射
    const keyMap = {
      'Escape': 'Esc',
      'Enter': 'Enter',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
    };
    key = keyMap[key] || key;
  }
  
  parts.push(key);
  return parts.join(' + ');
}

/**
 * 显示快捷键帮助
 */
export function showShortcutsHelp() {
  const shortcuts = Object.values(SHORTCUTS);
  const grouped = {};
  
  shortcuts.forEach(shortcut => {
    const category = getCategory(shortcut.action);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(shortcut);
  });
  
  const helpText = Object.entries(grouped)
    .map(([category, items]) => {
      const itemsText = items
        .map(item => `  ${getShortcutText(item)} - ${item.label}`)
        .join('\n');
      return `${category}:\n${itemsText}`;
    })
    .join('\n\n');
  
  alert(`键盘快捷键：\n\n${helpText}`);
}

/**
 * 获取快捷键分类
 */
function getCategory(action) {
  if (['search', 'help', 'home', 'back'].includes(action)) {
    return '导航';
  }
  if (['quiz', 'review', 'notes', 'analytics'].includes(action)) {
    return '学习';
  }
  if (['save', 'new'].includes(action)) {
    return '编辑';
  }
  if (['settings'].includes(action)) {
    return '设置';
  }
  return '通用';
}

/**
 * 创建快捷键提示组件文本
 * @param {string} action - 动作名称
 * @returns {string} 提示文本
 */
export function getShortcutHint(action) {
  const config = Object.values(SHORTCUTS).find(s => s.action === action);
  if (!config) return '';
  return getShortcutText(config);
}

