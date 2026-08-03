/**
 * GraphTutor V3.0 - 学习习惯分析组件
 * 
 * 功能：显示用户的学习习惯分析
 */

import { useState, useEffect } from 'react';
import { analyzeStudyHabits } from '../utils/studyHabits';

export default function StudyHabits({ data }) {
  const [habits, setHabits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      try {
        const habitsData = analyzeStudyHabits(data);
        setHabits(habitsData);
      } catch (err) {
        console.error('分析学习习惯失败:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [data]);

  if (loading || !habits) {
    return (
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500">分析中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📊 学习习惯分析</h2>
        <p className="text-slate-600 dark:text-slate-400">
          基于你的学习数据，分析你的学习模式和习惯
        </p>
      </div>

      {/* 习惯总结 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📋 习惯总结</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
              ✅ 优势
            </div>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {habits.summary.strengths.length > 0 ? (
                habits.summary.strengths.map((strength, index) => (
                  <li key={index}>• {strength}</li>
                ))
              ) : (
                <li>暂无</li>
              )}
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
              💡 改进建议
            </div>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {habits.summary.improvements.length > 0 ? (
                habits.summary.improvements.map((improvement, index) => (
                  <li key={index}>• {improvement}</li>
                ))
              ) : (
                <li>继续保持</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 学习频率 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">📅 学习频率</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {habits.frequency.weekly}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">本周频率</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-purple-400">
              {habits.frequency.monthly}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">本月频率</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-sm font-semibold capitalize mb-1">
              {habits.frequency.level}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {habits.frequency.recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* 学习时长 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">⏱️ 学习时长</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {habits.duration.weekly}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">本周总时长</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {habits.duration.avgDaily}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">平均每日时长</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-sm font-semibold capitalize mb-1">
              {habits.duration.level}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {habits.duration.recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* 学习一致性 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">🔄 学习一致性</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {habits.consistency.weekly}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">本周一致性</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-xl font-bold text-blue-600 dark:text-purple-400">
              {habits.consistency.consecutiveDays}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">连续学习天数</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {habits.consistency.maxConsecutive}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">最长连续天数</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-sm font-semibold capitalize mb-1">
              {habits.consistency.level}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {habits.consistency.recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* 学习时段偏好 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">⏰ 学习时段偏好</h3>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {habits.timePreference.preferred}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">最偏好学习时段</div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {habits.timePreference.distribution.morning}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">早晨</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {habits.timePreference.distribution.afternoon}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">下午</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {habits.timePreference.distribution.evening}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">晚上</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-lg font-bold text-blue-600 dark:text-purple-400">
                {habits.timePreference.distribution.night}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">夜间</div>
            </div>
          </div>
        </div>
      </div>

      {/* 学习模式 */}
      {habits.patterns.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">🎯 学习模式</h3>
          <div className="space-y-3">
            {habits.patterns.map((pattern, index) => (
              <div
                key={index}
                className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {pattern.description}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {pattern.strength}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 打卡习惯 */}
      {habits.checkInHabits.total > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">✅ 打卡习惯</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {habits.checkInHabits.total}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">总打卡次数</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {habits.checkInHabits.streak}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">连续打卡天数</div>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-sm font-semibold capitalize mb-1">
                {habits.checkInHabits.level}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {habits.checkInHabits.recommendation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

