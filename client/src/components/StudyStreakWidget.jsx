// client/src/components/StudyStreakWidget.jsx
// 学习打卡 / 连续学习天数小组件
// - 使用 localStorage 记录最后打卡日期和总打卡天数
// - 自动计算连续学习天数（streak）
// - 用一个小卡片展示 + 简单鼓励语句

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'graphtutor_study_streak';

function getTodayDateString() {
  const now = new Date();
  // 只保留“年月日”，避免时区干扰
  return now.toISOString().slice(0, 10); // yyyy-mm-dd
}

function calcNewState(prev) {
  const today = getTodayDateString();

  // 第一次使用
  if (!prev) {
    return {
      lastDate: today,
      totalDays: 1,
      streak: 1,
    };
  }

  const { lastDate, totalDays, streak } = prev;

  if (lastDate === today) {
    // 今天已经打过卡了，不再重复加
    return prev;
  }

  // 计算昨天日期，用来判断是否连续
  const last = new Date(lastDate);
  const yesterday = new Date(last);
  yesterday.setDate(last.getDate() + 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const isContinuous = yesterdayStr === today;

  return {
    lastDate: today,
    totalDays: totalDays + 1,
    streak: isContinuous ? streak + 1 : 1,
  };
}

// 一些简单的鼓励语
const MESSAGES = [
  '再坚持一下，你会发现自己很厉害 💪',
  '今天也在积累经验值，未来的你会感谢现在的自己 ✨',
  '一点点前进，也是前进。',
  '别小看每一次练习，它们会偷偷叠加。',
];

export default function StudyStreakWidget() {
  const [data, setData] = useState({
    lastDate: null,
    totalDays: 0,
    streak: 0,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 组件首次挂载时，从 localStorage 中读取状态
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let prev = null;
      if (raw) {
        prev = JSON.parse(raw);
      }

      const next = calcNewState(prev);
      setData(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      // 随机选一句鼓励话
      const idx = Math.floor(Math.random() * MESSAGES.length);
      setMessage(MESSAGES[idx]);
    } catch (e) {
      console.error('StudyStreakWidget load error:', e);
    }
  }, []);

  const { totalDays, streak } = data;

  return (
    <div className="card max-w-sm">
      <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
        学习打卡
      </div>

      <div className="flex items-baseline gap-4 mb-2">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            连续学习天数
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {streak}
            <span className="text-base ml-1">天</span>
          </div>
        </div>

        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />

        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            累计打卡
          </div>
          <div className="text-lg font-semibold">
            {totalDays}
            <span className="text-sm ml-1 text-slate-500">天</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {message}
      </div>
    </div>
  );
}
