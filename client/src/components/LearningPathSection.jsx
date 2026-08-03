/**
 * GraphTutor V3.0 - 学习路径 / 任务区块
 * 新手任务：完成首次练习 → 加入错题本 → 复习一次 → 获得成就
 * 每日任务：打卡、做5道题、看一篇笔记 → 提升日活
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from './common/Icon';

export default function LearningPathSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getLearningPathTasks } = await import('../api/v3/learningPath');
        const payload = await getLearningPathTasks();
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="surface">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">加载任务...</span>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="surface">
        <h2 className="section-title mb-1">今日任务</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          暂时加载不到任务，可以直接去练习。
        </p>
        <Link
          to="/quiz"
          className="inline-flex text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          开始练习 →
        </Link>
      </section>
    );
  }

  const { newbieTasks, dailyTasks, newbieComplete, dailyComplete } = data;

  return (
    <div className="space-y-4">
      <section className="surface border-blue-100/80 dark:border-blue-900/30 bg-blue-50/40 dark:bg-blue-950/20">
        <h2 className="section-title mb-1 flex items-center gap-2">
          <Icon name="compass" className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          新手任务
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {newbieComplete
            ? '你已完成新手路径，获得成就「新手入门」'
            : '按顺序完成以下步骤，解锁成就「新手入门」'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {newbieTasks.map((task) => (
            <Link
              key={task.id}
              to={task.link}
              className={`flex-1 min-w-[140px] flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                task.done
                  ? 'bg-white/90 dark:bg-slate-800/60 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white/90 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-600 hover:border-blue-200'
              }`}
            >
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 font-bold text-sm ${
                  task.done
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                }`}
              >
                {task.done ? '✓' : task.order}
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {task.title}
              </span>
              <Icon name="chevron-right" className="h-4 w-4 text-slate-400 shrink-0 ml-auto" />
            </Link>
          ))}
        </div>
      </section>

      <section className="surface">
        <h2 className="section-title mb-1">每日任务</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {dailyComplete
            ? '今日任务已全部完成，继续保持'
            : '完成以下任务，养成学习习惯'}
        </p>
        <div className="space-y-2">
          {dailyTasks.map((task) => (
            <Link
              key={task.id}
              to={task.link}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                task.done
                  ? 'bg-white/90 dark:bg-slate-800/60 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white/90 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-600 hover:border-blue-200'
              }`}
            >
              <span
                className={`flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-lg shrink-0 text-xs font-bold tabular-nums ${
                  task.done
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {task.done ? '✓' : `${task.current}/${task.target}`}
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 truncate">
                {task.title}
              </span>
              <Icon name="chevron-right" className="h-4 w-4 text-slate-400 shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
