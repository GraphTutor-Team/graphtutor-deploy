/**
 * GraphTutor V3.0 - 成就卡片组件
 * 
 * 功能：显示单个成就卡片，支持解锁动画
 */

import { useState, useEffect } from 'react';

const ACHIEVEMENT_CATEGORIES = {
  streak: { label: '连续学习', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  questions: { label: '答题量', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  accuracy: { label: '正确率', color: 'bg-green-100 text-green-700 border-green-300' },
  knowledge: { label: '知识点', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  goal: { label: '目标达成', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  exam: { label: '考试', color: 'bg-red-100 text-red-700 border-red-300' },
  default: { label: '其他', color: 'bg-slate-100 text-slate-700 border-slate-300' },
};

function getCategory(type) {
  if (type?.startsWith('streak')) return 'streak';
  if (type?.startsWith('questions')) return 'questions';
  if (type?.startsWith('accuracy')) return 'accuracy';
  if (type?.startsWith('knowledge')) return 'knowledge';
  if (type?.startsWith('goal')) return 'goal';
  if (type?.startsWith('perfect') || type?.startsWith('exam')) return 'exam';
  return 'default';
}

export default function AchievementCard({ achievement, onShare, showAnimation = false }) {
  const [isAnimating, setIsAnimating] = useState(showAnimation);
  const [isHovered, setIsHovered] = useState(false);
  const category = getCategory(achievement.type);
  const categoryInfo = ACHIEVEMENT_CATEGORIES[category] || ACHIEVEMENT_CATEGORIES.default;

  useEffect(() => {
    if (showAnimation) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showAnimation]);

  const handleShare = () => {
    if (onShare) {
      onShare(achievement);
    } else {
      // 默认分享功能
      const shareText = `我刚刚获得了成就：${achievement.icon} ${achievement.title} - ${achievement.description}`;
      if (navigator.share) {
        navigator.share({
          title: '学习成就',
          text: shareText,
        }).catch(() => {
          // 如果分享失败，复制到剪贴板
          navigator.clipboard.writeText(shareText);
          alert('成就信息已复制到剪贴板！');
        });
      } else {
        navigator.clipboard.writeText(shareText);
        alert('成就信息已复制到剪贴板！');
      }
    }
  };

  return (
    <div
      className={`relative bg-white dark:bg-slate-800 rounded-lg border-2 dark:border-slate-700 p-6 transition-all duration-300 ${
        isAnimating
          ? 'animate-pulse scale-105 shadow-2xl border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50'
          : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'
      } ${isHovered ? 'scale-105' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 解锁动画效果 */}
      {isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-6xl animate-bounce">🎉</div>
        </div>
      )}

      {/* 成就图标 */}
      <div className="flex items-start gap-4 mb-3">
        <div
          className={`text-5xl transition-transform duration-300 ${
            isAnimating ? 'animate-spin' : isHovered ? 'scale-110' : ''
          }`}
        >
          {achievement.icon || '🏆'}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{achievement.title}</h3>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded border ${categoryInfo.color}`}
            >
              {categoryInfo.label}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-2">{achievement.description}</p>
          <div className="text-xs text-slate-500">
            获得时间：{new Date(achievement.unlockedAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
        <button
          onClick={handleShare}
          className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          📤 分享成就
        </button>
      </div>
    </div>
  );
}

