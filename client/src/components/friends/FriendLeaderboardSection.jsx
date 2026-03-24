/**
 * GraphTutor V3.0 - 好友排行榜组件
 * 
 * 作用：显示好友排行榜
 */

export default function FriendLeaderboardSection({ 
  leaderboard, 
  type, 
  period, 
  onTypeChange, 
  onPeriodChange 
}) {
  if (!leaderboard) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  const getTypeLabel = (t) => {
    const labels = {
      total: '综合排行',
      questions: '答题量',
      accuracy: '正确率',
    };
    return labels[t] || t;
  };

  const getScoreLabel = (t) => {
    const labels = {
      total: '综合得分',
      questions: '答题数',
      accuracy: '正确率',
    };
    return labels[t] || '得分';
  };

  const formatScore = (score, t) => {
    if (t === 'accuracy') {
      return `${score.toFixed(1)}%`;
    }
    return score.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            排行类型：
          </label>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="total">综合排行</option>
            <option value="questions">答题量</option>
            <option value="accuracy">正确率</option>
          </select>

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-4">
            时间范围：
          </label>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="all">全部</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
        </div>
      </div>

      {/* 排行榜列表 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {getTypeLabel(type)} - {period === 'all' ? '全部' : period === 'week' ? '本周' : '本月'}
          </h3>
        </div>
        {leaderboard.items && leaderboard.items.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {leaderboard.items.map((item, index) => (
              <div
                key={item.userId}
                className={`px-6 py-4 flex items-center space-x-4 ${
                  item.isMe
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {/* 排名 */}
                <div className="flex-shrink-0 w-12 text-center">
                  {index < 3 ? (
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                      {item.rank}
                    </span>
                  )}
                </div>

                {/* 头像 */}
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {item.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>

                {/* 用户信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </h4>
                    {item.isMe && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full">
                        我
                      </span>
                    )}
                  </div>
                  {type === 'total' && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      答题: {item.totalQuestions || 0} | 正确率: {(item.accuracy || 0).toFixed(1)}%
                    </p>
                  )}
                  {type === 'accuracy' && item.total && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      答题数: {item.total}
                    </p>
                  )}
                </div>

                {/* 得分 */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {formatScore(item.score, type)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {getScoreLabel(type)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">暂无排行榜数据</p>
          </div>
        )}
      </div>
    </div>
  );
}

