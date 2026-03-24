/**
 * GraphTutor V3.0 - 学习提醒工具
 * 
 * 功能：浏览器通知提醒用户学习
 */

/**
 * 请求通知权限
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('此浏览器不支持通知');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * 显示学习提醒通知
 * @param {Object} options - 通知选项
 * @param {string} options.title - 通知标题
 * @param {string} options.body - 通知内容
 * @param {string} options.icon - 图标URL
 * @param {Function} options.onClick - 点击回调
 */
export function showStudyReminder(options = {}) {
  const {
    title = '学习提醒',
    body = '该学习了！保持每天的学习习惯',
    icon = '/favicon.ico',
    onClick,
  } = options;

  if (Notification.permission !== 'granted') {
    console.warn('通知权限未授予');
    return null;
  }

  const notification = new Notification(title, {
    body,
    icon,
    badge: '/favicon.ico',
    tag: 'study-reminder',
    requireInteraction: false,
  });

  if (onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
    };
  } else {
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  // 自动关闭（5秒后）
  setTimeout(() => {
    notification.close();
  }, 5000);

  return notification;
}

/**
 * 设置定时学习提醒
 * @param {Object} options - 提醒选项
 * @param {number} options.hour - 提醒小时（0-23）
 * @param {number} options.minute - 提醒分钟（0-59）
 * @param {string} options.message - 提醒消息
 * @param {Function} options.onRemind - 提醒回调
 * @returns {Function} 取消提醒的函数
 */
export function setDailyReminder(options = {}) {
  const {
    hour = 20,
    minute = 0,
    message = '该学习了！保持每天的学习习惯',
    onRemind,
  } = options;

  let intervalId = null;

  const checkAndRemind = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour === hour && currentMinute === minute) {
      showStudyReminder({
        title: '每日学习提醒',
        body: message,
        onClick: onRemind,
      });
    }
  };

  // 每分钟检查一次
  intervalId = setInterval(checkAndRemind, 60000);

  // 立即检查一次（如果当前时间匹配）
  checkAndRemind();

  // 返回取消函数
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * 设置学习时长提醒（在指定时间后提醒）
 * @param {number} minutes - 多少分钟后提醒
 * @param {string} message - 提醒消息
 * @param {Function} onRemind - 提醒回调
 * @returns {Function} 取消提醒的函数
 */
export function setStudyDurationReminder(minutes, message, onRemind) {
  const timeoutId = setTimeout(() => {
    showStudyReminder({
      title: '学习时长提醒',
      body: message || `你已经学习了 ${minutes} 分钟，休息一下吧！`,
      onClick: onRemind,
    });
  }, minutes * 60 * 1000);

  return () => {
    clearTimeout(timeoutId);
  };
}

/**
 * 检查并设置学习提醒（从localStorage读取设置）
 */
export async function initStudyReminder() {
  try {
    const reminderSettings = localStorage.getItem('studyReminderSettings');
    if (!reminderSettings) {
      return null;
    }

    const settings = JSON.parse(reminderSettings);
    if (!settings.enabled) {
      return null;
    }

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('通知权限未授予，无法设置提醒');
      return null;
    }

    return setDailyReminder({
      hour: settings.hour || 20,
      minute: settings.minute || 0,
      message: settings.message || '该学习了！保持每天的学习习惯',
      onRemind: () => {
        window.location.href = '/quiz';
      },
    });
  } catch (err) {
    console.error('初始化学习提醒失败:', err);
    return null;
  }
}

/**
 * 保存学习提醒设置
 * @param {Object} settings - 提醒设置
 */
export function saveReminderSettings(settings) {
  try {
    localStorage.setItem('studyReminderSettings', JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('保存提醒设置失败:', err);
    return false;
  }
}

/**
 * 获取学习提醒设置
 */
export function getReminderSettings() {
  try {
    const settings = localStorage.getItem('studyReminderSettings');
    if (!settings) {
      return {
        enabled: false,
        hour: 20,
        minute: 0,
        message: '该学习了！保持每天的学习习惯',
      };
    }
    return JSON.parse(settings);
  } catch (err) {
    console.error('获取提醒设置失败:', err);
    return {
      enabled: false,
      hour: 20,
      minute: 0,
      message: '该学习了！保持每天的学习习惯',
    };
  }
}

