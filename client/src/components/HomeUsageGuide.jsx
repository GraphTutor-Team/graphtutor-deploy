/**
 * 首页使用教程：告诉新用户怎么走通主流程
 * 可收起，本地记住；随时可再次打开
 * 支持 /home?guide=1 强制展开
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export const HOME_GUIDE_STORAGE_KEY = 'graphtutor_home_guide_dismissed';

const STEPS = [
  {
    title: '开始练习',
    desc: '选择题库或学科，做几道题熟悉节奏。',
    to: '/quiz',
    action: '去练习',
  },
  {
    title: '复习错题',
    desc: '做错的题会自动进错题本，按建议复习更稳。',
    to: '/review',
    action: '去复习',
  },
  {
    title: '查看学习数据',
    desc: '掌握度、趋势和建议都在分析页，方便查漏补缺。',
    to: '/analytics',
    action: '看数据',
  },
  {
    title: '记笔记 / 社交',
    desc: '整理要点，也可以加好友、进群组、逛社区讨论。',
    to: '/notes',
    action: '去笔记',
  },
];

export default function HomeUsageGuide() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const forceOpen = searchParams.get('guide') === '1';
    if (forceOpen) {
      setOpen(true);
      try {
        localStorage.removeItem(HOME_GUIDE_STORAGE_KEY);
      } catch (_) {}
      const next = new URLSearchParams(searchParams);
      next.delete('guide');
      setSearchParams(next, { replace: true });
      return;
    }
    try {
      if (localStorage.getItem(HOME_GUIDE_STORAGE_KEY) === '1') {
        setOpen(false);
      }
    } catch (_) {}
  }, [searchParams, setSearchParams]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(HOME_GUIDE_STORAGE_KEY, '1');
    } catch (_) {}
  };

  const reopen = () => {
    setOpen(true);
    try {
      localStorage.removeItem(HOME_GUIDE_STORAGE_KEY);
    } catch (_) {}
  };

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={reopen}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          查看使用教程
        </button>
      </div>
    );
  }

  return (
    <section className="surface animate-rise-in-delay">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="section-title">使用教程</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            四步走通 GraphTutor：练习 → 复习 → 看数据 → 笔记与社交。
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          知道了
        </button>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {STEPS.map((step, index) => (
          <li
            key={step.to}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-3.5 flex flex-col gap-2 min-w-0"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold tabular-nums">
                {index + 1}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {step.title}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
              {step.desc}
            </p>
            <Link
              to={step.to}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {step.action} →
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        左侧菜单也可直达：学习（练习/复习/笔记）、社交（好友/群组/社区）、学习数据。
      </p>
    </section>
  );
}
