/**
 * GraphTutor V3.0 - 温馨可爱图标演示
 * 
 * 展示所有可用的温馨可爱图标
 */

import { IconBook, IconNote, IconBrain, IconTarget } from './CuteIcons';

export default function CuteIconsDemo() {
  const icons = [
    { name: 'IconBook', component: IconBook, color: '#6366f1', label: '书本' },
    { name: 'IconNote', component: IconNote, color: '#10b981', label: '笔记' },
    { name: 'IconBrain', component: IconBrain, color: '#f59e0b', label: '大脑' },
    { name: 'IconTarget', component: IconTarget, color: '#ec4899', label: '目标' },
  ];

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">
        🎨 温馨可爱图标包
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {icons.map(({ name, component: Icon, color, label }) => (
          <div
            key={name}
            className="flex flex-col items-center p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 transition-colors"
          >
            <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-full">
              <Icon size={48} color={color} />
            </div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {label}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
          📝 使用示例：
        </h3>
        <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded overflow-x-auto">
{`import { IconBook, IconNote } from './components/common/CuteIcons';

// 使用图标
<IconBook size={24} color="#6366f1" />
<IconNote size={32} color="#10b981" />`}
        </pre>
      </div>
    </div>
  );
}

