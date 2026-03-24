/**
 * GraphTutor V3.0 - 学习时间管理组件
 * 
 * 功能：显示和管理学习时间
 */

import { useState, useEffect } from 'react';
import {
  calculateTimeStats,
  formatTime,
  getBestStudyTime,
  getTimeTrend,
  calculateTimeEfficiency,
  generateTimeManagementSuggestions,
} from '../utils/timeManagement';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function TimeManagement({ records = [], questions = [] }) {
  const [stats, setStats] = useState(null);
  const [efficiency, setEfficiency] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [timeTrend, setTimeTrend] = useState([]);

  useEffect(() => {
    if (records && records.length > 0) {
      const timeStats = calculateTimeStats(records);
      setStats(timeStats);
      
      const trend = getTimeTrend(timeStats.byDay, 7);
      setTimeTrend(trend);

      if (questions && questions.length > 0) {
        const eff = calculateTimeEfficiency(records, questions);
        setEfficiency(eff);
      }

      const sugg = generateTimeManagementSuggestions(timeStats, efficiency);
      setSuggestions(sugg);
    }
  }, [records, questions, efficiency]);

  if (!stats) {
    return (
      <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500 text-sm">加载中...</div>
      </div>
    );
  }

  const bestTimes = getBestStudyTime(stats.byHour);

  // 准备图表数据
  const trendData = timeTrend.map(t => ({
    date: t.dayName,
    duration: Math.round(t.duration),
  }));

  const hourData = Object.entries(stats.byHour)
    .map(([hour, duration]) => ({
      hour: `${hour}:00`,
      duration: Math.round(duration),
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  const subjectData = Object.entries(stats.bySubject)
    .map(([subject, duration]) => ({
      subject,
      duration: Math.round(duration),
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">⏰ 学习时间管理</h2>
        <p className="text-slate-600 dark:text-slate-400">
          全面了解你的学习时间分布
        </p>
      </div>

      {/* 时间统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatTime(stats.total)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">总学习时间</div>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatTime(stats.today)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">今日</div>
        </div>
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatTime(stats.thisWeek)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">本周</div>
        </div>
        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {formatTime(stats.thisMonth)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">本月</div>
        </div>
        {efficiency && (
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {efficiency.efficiency}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">学习效率</div>
          </div>
        )}
      </div>

      {/* 时间趋势图 */}
      {trendData.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">本周学习时间趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#3b82f6"
                name="学习时间（分钟）"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 时段分布 */}
      {hourData.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">学习时段分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="duration" fill="#3b82f6" name="学习时间（分钟）" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 最佳学习时间 */}
      {bestTimes && bestTimes.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">最佳学习时间</h3>
          <div className="space-y-2">
            {bestTimes.map((time, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
              >
                <div>
                  <div className="font-semibold">{time.label}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    累计学习 {formatTime(time.duration)}
                  </div>
                </div>
                {index === 0 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                    最佳
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 科目分布 */}
      {subjectData.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">科目学习时间分布</h3>
          <div className="space-y-2">
            {subjectData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">{item.subject}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatTime(item.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 学习效率 */}
      {efficiency && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">学习效率分析</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">效率评分</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {efficiency.efficiency}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">每小时题数</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {efficiency.questionsPerHour}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">平均每题时间</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatTime(efficiency.averageTimePerQuestion)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 时间管理建议 */}
      {suggestions.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">💡 时间管理建议</h3>
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  suggestion.priority === 'high'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : suggestion.priority === 'medium'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="font-semibold mb-1">{suggestion.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{suggestion.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

