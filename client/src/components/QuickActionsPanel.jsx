/**
 * GraphTutor V3.0 - 快速操作面板（精简版）
 */

import { Link } from 'react-router-dom';
import Icon from './common/Icon';

export default function QuickActionsPanel() {
  const quickActions = [
    {
      icon: 'fileText',
      title: '开始练习',
      description: '选择题库做题',
      link: '/quiz',
    },
    {
      icon: 'book',
      title: '错题复习',
      description: '巩固薄弱点',
      link: '/review',
    },
    {
      icon: 'notes',
      title: '学习笔记',
      description: '记录要点',
      link: '/notes',
    },
    {
      icon: 'chartBar',
      title: '学习数据',
      description: '查看分析',
      link: '/analytics',
    },
  ];

  return (
    <section className="surface animate-rise-in-delay">
      <h3 className="section-title mb-4">快速入口</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.link}
            to={action.link}
            className="group flex flex-col items-start gap-2 rounded-xl border border-transparent bg-slate-50/80 dark:bg-slate-900/40 px-3.5 py-3.5 hover:border-blue-200 hover:bg-blue-50/60 dark:hover:bg-slate-700/50 dark:hover:border-slate-600 transition-colors"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-600 text-blue-600 dark:text-blue-400">
              <Icon name={action.icon} className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{action.title}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{action.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
