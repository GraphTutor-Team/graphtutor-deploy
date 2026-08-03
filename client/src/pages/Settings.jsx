/**
 * GraphTutor V3.0 - 设置页面
 * 
 * 作用：提供用户设置功能，包括主题切换、学习提醒设置、通知权限、数据备份等
 * 关联页面：
 *   - components/ThemeToggle.jsx (主题切换组件)
 *   - utils/theme.js (主题管理)
 *   - utils/studyReminder.js (学习提醒)
 *   - utils/studyReminderEnhanced.js (智能提醒)
 *   - utils/dataBackup.js (数据备份)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - LocalStorage (设置持久化)
 *   - 浏览器通知API
 *   - 主题切换功能
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ThemeToggle from '../components/ThemeToggle';
import HelpTip from '../components/HelpTip';
import { useAuth } from '../context/AuthContext';
import { loadTheme, applyTheme } from '../utils/theme';
import { toast } from '../utils/toast';
import {
  requestNotificationPermission,
  getReminderSettings,
  saveReminderSettings,
  initStudyReminder,
} from '../utils/studyReminder';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [{ theme, contrast }, setState] = useState({ theme: 'auto', contrast: 'off' });
  
  const [settings, setSettings] = useState({
    autoSave: true,
    showHints: true,
    compactMode: false,
    language: 'zh-CN',
    notifications: true,
    soundEnabled: false,
  });

  const [reminderSettings, setReminderSettings] = useState({
    enabled: false,
    hour: 20,
    minute: 0,
    message: '该学习了！保持每天的学习习惯',
  });

  const [friendSettings, setFriendSettings] = useState({
    allowFriendRequests: true,
    showLearningData: true,
    showAchievements: true,
    showProfile: true,
  });

  useEffect(() => {
    setState(loadTheme());
    // 从localStorage加载用户设置
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('加载设置失败:', e);
      }
    }

    // 加载学习提醒设置
    const reminder = getReminderSettings();
    setReminderSettings(reminder);

    // 初始化学习提醒
    if (reminder.enabled) {
      requestNotificationPermission().then((hasPermission) => {
        if (hasPermission) {
          initStudyReminder();
        }
      });
    }

    // 加载好友设置
    if (user?.friendSettings) {
      setFriendSettings(user.friendSettings);
    }
  }, [user]);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    toast.success('设置已保存');
  };

  const handleFriendSettingsChange = async (newSettings) => {
    try {
      await updateProfile({ friendSettings: newSettings });
      toast.success('好友隐私设置已保存');
    } catch (err) {
      console.error('保存好友设置失败:', err);
      toast.error(err.response?.data?.message || '保存好友设置失败');
      // 恢复原设置
      if (user?.friendSettings) {
        setFriendSettings(user.friendSettings);
      }
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="系统设置"
        subtitle="配置主题、对比度等系统偏好设置"
      />

      {/* 外观设置 */}
      <div className="card">
        <div className="font-semibold mb-4">外观设置</div>
        <div className="space-y-4">
          <ThemeToggle />
          <div className="text-xs text-slate-500 mt-2">
            注：高对比度仅预留类名（contrast），实际视觉由你 CSS 决定。
          </div>
          
          <div className="flex items-center justify-between py-2 border-t border-slate-200">
            <div>
              <div className="font-medium text-sm">紧凑模式</div>
              <div className="text-xs text-slate-500">减少页面间距，显示更多内容</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(e) => handleSettingChange('compactMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 学习设置 */}
      <div className="card">
        <div className="font-semibold mb-4">学习设置</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-sm">自动保存进度</div>
              <div className="text-xs text-slate-500">练习过程中自动保存答题进度</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-200">
            <div>
              <div className="font-medium text-sm">显示提示</div>
              <div className="text-xs text-slate-500">在页面中显示帮助提示和说明</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showHints}
                onChange={(e) => handleSettingChange('showHints', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 通知设置 */}
      <div className="card">
        <div className="font-semibold mb-4">通知设置</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-sm">启用通知</div>
              <div className="text-xs text-slate-500">接收系统通知和提醒</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-slate-200">
            <div>
              <div className="font-medium text-sm">声音提示</div>
              <div className="text-xs text-slate-500">操作时播放提示音</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 学习提醒设置 */}
      <div className="card">
        <div className="font-semibold mb-4">学习提醒设置</div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-sm">启用每日学习提醒</div>
              <div className="text-xs text-slate-500">每天定时提醒你学习</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reminderSettings.enabled}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  if (enabled) {
                    const hasPermission = await requestNotificationPermission();
                    if (!hasPermission) {
                      toast.error('需要授予通知权限才能启用提醒');
                      return;
                    }
                  }
                  const newSettings = { ...reminderSettings, enabled };
                  setReminderSettings(newSettings);
                  saveReminderSettings(newSettings);
                  if (enabled) {
                    initStudyReminder();
                    toast.success('学习提醒已启用');
                  } else {
                    toast.success('学习提醒已关闭');
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {reminderSettings.enabled && (
            <>
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">提醒时间</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={reminderSettings.hour}
                      onChange={(e) => {
                        const newSettings = {
                          ...reminderSettings,
                          hour: parseInt(e.target.value) || 0,
                        };
                        setReminderSettings(newSettings);
                        saveReminderSettings(newSettings);
                      }}
                      className="w-20 px-3 py-2 border rounded-lg"
                    />
                    <span className="text-sm">时</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={reminderSettings.minute}
                      onChange={(e) => {
                        const newSettings = {
                          ...reminderSettings,
                          minute: parseInt(e.target.value) || 0,
                        };
                        setReminderSettings(newSettings);
                        saveReminderSettings(newSettings);
                      }}
                      className="w-20 px-3 py-2 border rounded-lg"
                    />
                    <span className="text-sm">分</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">提醒消息</label>
                  <input
                    type="text"
                    value={reminderSettings.message}
                    onChange={(e) => {
                      const newSettings = {
                        ...reminderSettings,
                        message: e.target.value,
                      };
                      setReminderSettings(newSettings);
                      saveReminderSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="输入提醒消息"
                    maxLength={100}
                  />
                </div>

                <div className="text-xs text-slate-500">
                  提醒将在每天指定时间通过浏览器通知发送。请确保已授予通知权限。
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 语言设置 */}
      <div className="card">
        <div className="font-semibold mb-4">语言设置</div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            界面语言
          </label>
          <select
            value={settings.language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁体中文</option>
            <option value="en-US">English</option>
          </select>
          <div className="text-xs text-slate-500 mt-1">
            当前仅支持简体中文，其他语言选项为预留功能
          </div>
        </div>
      </div>

      {/* 好友隐私设置 */}
      {user && (
        <div className="card">
          <div className="font-semibold mb-4">好友隐私设置</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">允许接收好友请求</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  其他用户可以向您发送好友请求
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={friendSettings.allowFriendRequests}
                  onChange={(e) => {
                    const newSettings = { ...friendSettings, allowFriendRequests: e.target.checked };
                    setFriendSettings(newSettings);
                    handleFriendSettingsChange(newSettings);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">向好友显示学习数据</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  好友可以查看您的学习统计、答题记录等数据
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={friendSettings.showLearningData}
                  onChange={(e) => {
                    const newSettings = { ...friendSettings, showLearningData: e.target.checked };
                    setFriendSettings(newSettings);
                    handleFriendSettingsChange(newSettings);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">向好友显示成就</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  好友可以查看您获得的成就和徽章
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={friendSettings.showAchievements}
                  onChange={(e) => {
                    const newSettings = { ...friendSettings, showAchievements: e.target.checked };
                    setFriendSettings(newSettings);
                    handleFriendSettingsChange(newSettings);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">允许好友查看个人资料</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  好友可以查看您的基本信息（姓名、学校、专业等）
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={friendSettings.showProfile}
                  onChange={(e) => {
                    const newSettings = { ...friendSettings, showProfile: e.target.checked };
                    setFriendSettings(newSettings);
                    handleFriendSettingsChange(newSettings);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 接口设置 */}
      <div className="card">
        <div className="font-semibold mb-2">接口设置</div>
        <div className="text-sm text-slate-500">
          当前默认使用相对路径 /api/* ，如需跨域请在 .env 或代理中配置。
        </div>
        {user?.role === 'admin' && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-blue-900 mb-1">管理员提示</div>
            <div className="text-xs text-blue-700">
              可以在服务器端配置 API 基础路径和环境变量
            </div>
          </div>
        )}
      </div>

      {/* 数据管理 */}
      {user && (
        <div className="card">
          <div className="font-semibold mb-4">数据管理</div>
          <div className="space-y-3">
            <button
              onClick={() => {
                const data = {
                  settings,
                  theme,
                  contrast,
                  exportDate: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `settings-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('设置已导出');
              }}
              className="btn btn-outline w-full"
            >
              导出设置
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target?.result || '{}');
                      if (data.settings) {
                        setSettings(data.settings);
                        localStorage.setItem('userSettings', JSON.stringify(data.settings));
                        toast.success('设置已导入');
                      }
                    } catch (err) {
                      toast.error('导入失败：文件格式错误');
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }}
              className="btn btn-outline w-full"
            >
              导入设置
            </button>
            <button
              onClick={() => {
                if (window.confirm('确定要重置所有设置吗？此操作不可恢复。')) {
                  localStorage.removeItem('userSettings');
                  setSettings({
                    autoSave: true,
                    showHints: true,
                    compactMode: false,
                    language: 'zh-CN',
                    notifications: true,
                    soundEnabled: false,
                  });
                  toast.success('设置已重置');
                }
              }}
              className="btn btn-ghost w-full text-red-600 hover:bg-red-50"
            >
              重置所有设置
            </button>
          </div>
        </div>
      )}

      {/* 数据导出说明（原备份页路由不存在，改为可到达入口） */}
      <div className="card">
        <div className="font-semibold mb-4">数据与报告</div>
        <div className="py-2 space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            学习报告可在「学习数据」页导出（含月度白皮书等）。完整题库备份由管理员在后台处理。
          </p>
          <Link
            to="/analytics"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            前往学习数据
          </Link>
        </div>
      </div>

      {/* 智能学习提醒 */}
      <div className="card">
        <div className="font-semibold mb-4">智能学习提醒</div>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              根据你在「学习数据」中的练习时段分布，设置更合理的复习提醒。
            </div>
            <button
              onClick={() => {
                navigate('/analytics');
                toast.success('请在学习数据页查看时段分布，并在通知设置中开启提醒');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              查看学习习惯
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
