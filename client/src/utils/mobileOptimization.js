/**
 * GraphTutor V3.0 - 移动端优化工具
 * 
 * 功能：检测移动端、优化触摸体验
 */

/**
 * 检测是否为移动设备
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 检测是否为触摸设备
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 添加移动端样式类
 */
export function addMobileClasses() {
  if (isMobileDevice()) {
    document.documentElement.classList.add('mobile-device');
  }
  if (isTouchDevice()) {
    document.documentElement.classList.add('touch-device');
  }
}

/**
 * 防止双击缩放（移动端）
 */
export function preventDoubleTapZoom() {
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    false
  );
}

/**
 * 初始化移动端优化
 */
export function initMobileOptimization() {
  addMobileClasses();
  if (isMobileDevice()) {
    preventDoubleTapZoom();
  }
}

