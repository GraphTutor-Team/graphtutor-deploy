/**
 * GraphTutor V3.0 - 成就进度组件
 * 
 * 功能：显示成就的解锁进度
 */

const ACHIEVEMENT_DEFINITIONS = {
  // 连续学习成就
  streak_3: { target: 3, label: '连续3天学习' },
  streak_7: { target: 7, label: '连续7天学习' },
  streak_30: { target: 30, label: '连续30天学习' },
  
  // 答题量成就
  questions_100: { target: 100, label: '累计答题100道' },
  questions_500: { target: 500, label: '累计答题500道' },
  questions_1000: { target: 1000, label: '累计答题1000道' },
  
  // 正确率成就
  accuracy_80: { target: 80, label: '正确率达到80%' },
  accuracy_90: { target: 90, label: '正确率达到90%' },
  
  // 知识点成就
  knowledge_master_10: { target: 10, label: '掌握10个知识点' },
  knowledge_master_50: { target: 50, label: '掌握50个知识点' },
};

export default function AchievementProgress({ achievementType, currentValue, isUnlocked }) {
  const definition = ACHIEVEMENT_DEFINITIONS[achievementType];
  
  if (!definition) {
    return null; // 没有进度定义的成就不显示进度条
  }

  if (isUnlocked) {
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-green-600 font-semibold">✓ 已解锁</span>
          <span className="text-slate-500">{definition.label}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const progress = Math.min(100, (currentValue / definition.target) * 100);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600">
          进度：{currentValue} / {definition.target}
        </span>
        <span className="text-slate-500">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

