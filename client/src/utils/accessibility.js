/**
 * GraphTutor V3.0 - 无障碍访问工具
 * 
 * 功能：提供键盘导航、屏幕阅读器支持等无障碍功能
 */

/**
 * 初始化无障碍功能
 */
export function initAccessibility() {
  // 添加键盘快捷键支持
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // 添加焦点可见性
  addFocusVisible();
  
  // 添加跳过链接
  addSkipLinks();
}

/**
 * 处理键盘快捷键
 */
let searchModalHandler = null;

export function setSearchModalHandler(handler) {
  searchModalHandler = handler;
}

function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + K: 打开搜索
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (searchModalHandler) {
      searchModalHandler();
    } else {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"]');
      if (searchInput) {
        searchInput.focus();
      }
    }
  }

  // Ctrl/Cmd + /: 显示快捷键帮助
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    showKeyboardShortcuts();
  }

  // Escape: 关闭模态框
  if (e.key === 'Escape') {
    const modals = document.querySelectorAll('[role="dialog"]');
    modals.forEach(modal => {
      if (modal.style.display !== 'none') {
        const closeButton = modal.querySelector('[aria-label*="关闭"], [aria-label*="Close"]');
        if (closeButton) {
          closeButton.click();
        }
      }
    });
  }
}

/**
 * 添加焦点可见性
 */
function addFocusVisible() {
  // 为所有可聚焦元素添加焦点样式
  const style = document.createElement('style');
  style.textContent = `
    *:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    .dark *:focus-visible {
      outline-color: #60a5fa;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 添加跳过链接
 */
function addSkipLinks() {
  // 检查是否已经添加过
  if (document.querySelector('.skip-links')) {
    return;
  }

  const skipLinks = document.createElement('div');
  skipLinks.className = 'skip-links';
  skipLinks.setAttribute('role', 'navigation');
  skipLinks.setAttribute('aria-label', '跳过链接');
  
  // 创建跳过链接
  const mainContentLink = document.createElement('a');
  mainContentLink.href = '#main-content';
  mainContentLink.className = 'skip-link';
  mainContentLink.textContent = '跳转到主内容';
  mainContentLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('main-content') || 
                   document.querySelector('main') ||
                   document.querySelector('[role="main"]') ||
                   document.body;
    target.focus();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const navigationLink = document.createElement('a');
  navigationLink.href = '#navigation';
  navigationLink.className = 'skip-link';
  navigationLink.textContent = '跳转到导航';
  navigationLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('navigation') ||
                   document.querySelector('nav') ||
                   document.querySelector('[role="navigation"]') ||
                   document.querySelector('header');
    if (target) {
      const firstFocusable = target.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        target.focus();
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  skipLinks.appendChild(mainContentLink);
  skipLinks.appendChild(navigationLink);
  
  // 添加样式
  const styleId = 'skip-links-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -100px;
        left: 0;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .skip-link {
        position: absolute;
        top: -100px;
        left: 0;
        padding: 12px 20px;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 500;
        transition: top 0.2s ease;
        opacity: 0;
        pointer-events: none;
      }
      .skip-link:focus {
        top: 0;
        opacity: 1;
        pointer-events: auto;
        outline: 2px solid #fff;
        outline-offset: 2px;
      }
      .skip-link:hover {
        background: #2563eb;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 确保body存在后再插入
  if (document.body) {
    document.body.insertBefore(skipLinks, document.body.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.insertBefore(skipLinks, document.body.firstChild);
    });
  }

  // 确保主内容区域有ID
  const mainContent = document.getElementById('main-content') ||
                      document.querySelector('main') ||
                      document.querySelector('[role="main"]');
  if (mainContent && !mainContent.id) {
    mainContent.id = 'main-content';
  }

  // 确保导航区域有ID
  const navigation = document.getElementById('navigation') ||
                     document.querySelector('nav') ||
                     document.querySelector('[role="navigation"]') ||
                     document.querySelector('header');
  if (navigation && !navigation.id) {
    navigation.id = 'navigation';
  }
}

/**
 * 显示键盘快捷键帮助
 */
function showKeyboardShortcuts() {
  const shortcuts = [
    { key: 'Ctrl/Cmd + K', action: '打开搜索' },
    { key: 'Ctrl/Cmd + /', action: '显示快捷键帮助' },
    { key: 'Escape', action: '关闭模态框' },
    { key: 'Tab', action: '导航到下一个元素' },
    { key: 'Shift + Tab', action: '导航到上一个元素' },
    { key: 'Enter', action: '激活按钮或链接' },
  ];

  const helpText = shortcuts.map(s => `${s.key}: ${s.action}`).join('\n');
  alert('键盘快捷键：\n\n' + helpText);
}

/**
 * 为元素添加ARIA标签
 * @param {HTMLElement} element - 元素
 * @param {Object} aria - ARIA属性
 */
export function addAriaLabels(element, aria) {
  Object.entries(aria).forEach(([key, value]) => {
    element.setAttribute(`aria-${key}`, value);
  });
}

/**
 * 创建无障碍按钮
 * @param {Object} props - 按钮属性
 * @returns {HTMLElement} 按钮元素
 */
export function createAccessibleButton(props) {
  const button = document.createElement('button');
  button.textContent = props.label;
  button.className = props.className || '';
  
  if (props.onClick) {
    button.addEventListener('click', props.onClick);
  }
  
  addAriaLabels(button, {
    label: props.ariaLabel || props.label,
    ...(props.disabled && { disabled: 'true' }),
  });
  
  return button;
}

/**
 * 添加加载状态提示（供屏幕阅读器使用）
 * @param {string} message - 提示消息
 */
export function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * 确保模态框可访问
 * @param {HTMLElement} modal - 模态框元素
 */
export function makeModalAccessible(modal) {
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  
  // 设置aria-labelledby
  const title = modal.querySelector('h1, h2, h3, [class*="title"]');
  if (title) {
    const titleId = title.id || `modal-title-${Date.now()}`;
    title.id = titleId;
    modal.setAttribute('aria-labelledby', titleId);
  }
  
  // 设置aria-describedby
  const description = modal.querySelector('[class*="description"], [class*="subtitle"]');
  if (description) {
    const descId = description.id || `modal-desc-${Date.now()}`;
    description.id = descId;
    modal.setAttribute('aria-describedby', descId);
  }
  
  // 捕获焦点
  const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) {
    firstFocusable.focus();
  }
}

/**
 * 添加屏幕阅读器专用样式
 */
export function addScreenReaderStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    .sr-only-focusable:focus {
      position: static;
      width: auto;
      height: auto;
      padding: inherit;
      margin: inherit;
      overflow: visible;
      clip: auto;
      white-space: normal;
    }
  `;
  document.head.appendChild(style);
}

