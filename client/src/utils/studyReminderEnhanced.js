/**
 * GraphTutor V3.0 - 增强学习提醒工具
 * 
 * 功能：提供更智能的学习提醒功能
 */

/**
 * 智能学习提醒管理器
 */
export class SmartStudyReminder {
  constructor() {
    this.reminders = [];
    this.notificationPermission = null;
    this.checkPermission();
  }

  /**
   * 检查通知权限
   */
  async checkPermission() {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === 'granted';
    }

    return false;
  }

  /**
   * 创建学习提醒
   * @param {Object} config - 提醒配置
   */
  createReminder(config) {
    const {
      id,
      title,
      message,
      time, // HH:mm 格式
      days, // [0,1,2,3,4,5,6] 星期数组
      enabled = true,
      type = 'daily', // daily, weekly, custom
    } = config;

    const reminder = {
      id: id || `reminder_${Date.now()}`,
      title,
      message,
      time,
      days: days || [1, 2, 3, 4, 5], // 默认工作日
      enabled,
      type,
      createdAt: new Date().toISOString(),
    };

    this.reminders.push(reminder);
    this.scheduleReminder(reminder);
    this.saveReminders();

    return reminder;
  }

  /**
   * 安排提醒
   */
  scheduleReminder(reminder) {
    if (!reminder.enabled) return;

    const [hours, minutes] = reminder.time.split(':').map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // 计算下次提醒时间
    const nextTimes = reminder.days.map(day => {
      const targetDate = new Date(today);
      const currentDay = now.getDay();
      let daysUntil = day - currentDay;

      if (daysUntil < 0 || (daysUntil === 0 && now >= targetDate)) {
        daysUntil += 7;
      }

      targetDate.setDate(targetDate.getDate() + daysUntil);
      return targetDate;
    });

    // 找到最近的提醒时间
    const nextTime = nextTimes
      .filter(time => time > now)
      .sort((a, b) => a - b)[0];

    if (nextTime) {
      const delay = nextTime - now;
      setTimeout(() => {
        this.showReminder(reminder);
        // 安排下一次提醒
        this.scheduleReminder(reminder);
      }, delay);
    }
  }

  /**
   * 显示提醒
   */
  async showReminder(reminder) {
    if (!await this.requestPermission()) {
      return;
    }

    const notification = new Notification(reminder.title, {
      body: reminder.message,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: reminder.id,
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // 播放提示音
    this.playNotificationSound();
  }

  /**
   * 播放提示音
   */
  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.log('无法播放提示音:', err);
    }
  }

  /**
   * 删除提醒
   */
  deleteReminder(id) {
    this.reminders = this.reminders.filter(r => r.id !== id);
    this.saveReminders();
  }

  /**
   * 更新提醒
   */
  updateReminder(id, updates) {
    const index = this.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reminders[index] = { ...this.reminders[index], ...updates };
      this.saveReminders();
      // 重新安排提醒
      this.scheduleReminder(this.reminders[index]);
    }
  }

  /**
   * 获取所有提醒
   */
  getReminders() {
    return [...this.reminders];
  }

  /**
   * 保存提醒到本地存储
   */
  saveReminders() {
    try {
      localStorage.setItem('studyReminders', JSON.stringify(this.reminders));
    } catch (err) {
      console.error('保存提醒失败:', err);
    }
  }

  /**
   * 从本地存储加载提醒
   */
  loadReminders() {
    try {
      const saved = localStorage.getItem('studyReminders');
      if (saved) {
        this.reminders = JSON.parse(saved);
        // 重新安排所有提醒
        this.reminders.forEach(reminder => {
          if (reminder.enabled) {
            this.scheduleReminder(reminder);
          }
        });
      }
    } catch (err) {
      console.error('加载提醒失败:', err);
    }
  }

  /**
   * 创建智能提醒（基于学习习惯）
   */
  createSmartReminder(studyHabits) {
    const { bestStudyTime, timePreference } = studyHabits;

    // 解析最佳学习时间
    let reminderTime = '09:00';
    if (bestStudyTime && bestStudyTime !== '暂无数据') {
      const match = bestStudyTime.match(/(\d+):00/);
      if (match) {
        const hour = parseInt(match[1]);
        // 提前30分钟提醒
        const reminderHour = hour > 0 ? hour - 1 : 23;
        reminderTime = `${String(reminderHour).padStart(2, '0')}:30`;
      }
    }

    // 根据时段偏好确定提醒天数
    let days = [1, 2, 3, 4, 5]; // 默认工作日
    if (timePreference && timePreference.distribution) {
      // 如果周末学习较多，也提醒周末
      const weekendRatio = parseFloat(timePreference.distribution.evening || 0) + 
                          parseFloat(timePreference.distribution.night || 0);
      if (weekendRatio > 30) {
        days = [0, 1, 2, 3, 4, 5, 6]; // 每天
      }
    }

    return this.createReminder({
      title: '学习提醒',
      message: '该学习了！保持每天学习的习惯。',
      time: reminderTime,
      days,
      type: 'smart',
    });
  }
}

// 全局实例
export const smartReminder = new SmartStudyReminder();

/**
 * 初始化智能提醒
 */
export function initSmartReminder(studyHabits) {
  smartReminder.loadReminders();
  
  if (studyHabits && studyHabits.bestStudyTime) {
    // 检查是否已有智能提醒
    const existing = smartReminder.getReminders().find(r => r.type === 'smart');
    if (!existing) {
      smartReminder.createSmartReminder(studyHabits);
    }
  }
}

/**
 * 创建基于目标的提醒
 */
export function createGoalBasedReminder(goal) {
  const reminderTime = goal.reminder?.time || '09:00';
  const reminderDays = goal.reminder?.days || [1, 2, 3, 4, 5];

  return smartReminder.createReminder({
    title: `目标提醒：${goal.title || goal.name}`,
    message: `今天的目标是完成${goal.target || goal.dailyTarget || 10}道题，加油！`,
    time: reminderTime,
    days: reminderDays,
    type: 'goal',
    goalId: goal._id || goal.id,
  });
}

