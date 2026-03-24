/**
 * GraphTutor V3.0 - 快速操作面板组件
 * 
 * 功能：提供常用功能的快速访问入口
 */

import { Link } from 'react-router-dom';
import Icon from './common/Icon';

export default function QuickActionsPanel() {
  const quickActions = [
    {
      icon: 'fileText',
      title: '开始练习',
      description: '选择题库开始练习',
      link: '/quiz',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      icon: 'book',
      title: '错题复习',
      description: '复习做错的题目',
      link: '/review',
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      icon: 'chartBar',
      title: '学习分析',
      description: '查看详细学习数据',
      link: '/analytics',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      icon: 'target',
      title: '学习目标',
      description: '设置和管理目标',
      link: '/goals',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      icon: 'books',
      title: '题库管理',
      description: '浏览和管理题库',
      link: '/banks',
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      icon: 'notes',
      title: '学习笔记',
      description: '记录学习笔记',
      link: '/notes',
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
    {
      icon: 'check',
      title: '每日打卡',
      description: '记录学习打卡',
      link: '/check-in',
      color: 'bg-teal-500 hover:bg-teal-600',
    },
    {
      icon: 'trophy',
      title: '学习成就',
      description: '查看学习成就',
      link: '/achievements',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
      <h3 className="text-xl font-bold mb-4">快速操作</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action, index) => (
          <Link
            key={index}
            to={action.link}
            className={`${action.color} text-white p-4 rounded-lg transition-all transform hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center text-center min-h-[100px]`}
          >
            <div className="mb-2">
              <Icon name={action.icon} size={32} color="white" />
            </div>
            <div className="font-semibold text-sm mb-1">{action.title}</div>
            <div className="text-xs opacity-90">{action.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

