/**
 * GraphTutor V3.0 - 增强学习分析组件
 * 
 * 功能：展示学习效率分析、学习习惯分析和AI建议
 */

import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import {
  getStudyEfficiency,
  getStudyHabits,
  getAILearningSuggestions,
  getComprehensiveAnalysis,
} from '../api/v3/enhancedAnalytics';
import {
  exportEfficiencyAnalysisToExcel,
  exportHabitsAnalysisToExcel,
} from '../utils/excelExport';

export default function EnhancedAnalytics({ days = 30, onDaysChange }) {
  const [activeTab, setActiveTab] = useState('efficiency'); // efficiency, habits, suggestions, comprehensive
  const [loading, setLoading] = useState(false);
  const [efficiencyData, setEfficiencyData] = useState(null);
  const [habitsData, setHabitsData] = useState(null);
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [comprehensiveData, setComprehensiveData] = useState(null);

  useEffect(() => {
    loadData();
  }, [days, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'efficiency' || activeTab === 'comprehensive') {
        const efficiency = await getStudyEfficiency(days);
        setEfficiencyData(efficiency.data);
      }
      if (activeTab === 'habits' || activeTab === 'comprehensive') {
        const habits = await getStudyHabits(days);
        setHabitsData(habits.data);
      }
      if (activeTab === 'suggestions' || activeTab === 'comprehensive') {
        const suggestions = await getAILearningSuggestions(days);
        setSuggestionsData(suggestions.data);
      }
      if (activeTab === 'comprehensive') {
        const comprehensive = await getComprehensiveAnalysis(days);
        setComprehensiveData(comprehensive.data);
      }
    } catch (err) {
      console.error('加载增强分析数据失败:', err);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExportEfficiency = () => {
    if (!efficiencyData) {
      toast.warning('暂无效率分析数据');
      return;
    }
    try {
      exportEfficiencyAnalysisToExcel(efficiencyData, '学习效率分析');
      toast.success('效率分析已导出');
    } catch (err) {
      toast.error('导出失败: ' + err.message);
    }
  };

  const handleExportHabits = () => {
    if (!habitsData) {
      toast.warning('暂无习惯分析数据');
      return;
    }
    try {
      exportHabitsAnalysisToExcel(habitsData, '学习习惯分析');
      toast.success('习惯分析已导出');
    } catch (err) {
      toast.error('导出失败: ' + err.message);
    }
  };

  if (loading && !efficiencyData && !habitsData && !suggestionsData) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border dark:border-slate-700">
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
      {/* 标签页 */}
      <div className="border-b dark:border-slate-700">
        <div className="flex gap-4 px-6">
          <button
            onClick={() => setActiveTab('efficiency')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'efficiency'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            📊 学习效率
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'habits'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            🕐 学习习惯
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'suggestions'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            💡 AI建议
          </button>
          <button
            onClick={() => setActiveTab('comprehensive')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'comprehensive'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            📈 综合分析
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* 学习效率分析 */}
        {activeTab === 'efficiency' && efficiencyData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">学习效率分析</h3>
              <button
                onClick={handleExportEfficiency}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                📊 导出Excel
              </button>
            </div>

            {/* 效率评分 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                <div className="text-sm opacity-90 mb-2">效率评分</div>
                <div className="text-4xl font-bold">{efficiencyData.score}分</div>
                <div className="text-sm opacity-90 mt-2">{efficiencyData.level}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">正确率</div>
                <div className="text-3xl font-bold text-green-600">
                  {(efficiencyData.metrics.accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">答题速度</div>
                <div className="text-3xl font-bold text-blue-600">
                  {efficiencyData.metrics.questionsPerHour.toFixed(1)}题/小时
                </div>
              </div>
            </div>

            {/* 详细指标 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">学习天数</div>
                <div className="text-xl font-bold">{efficiencyData.metrics.studyDays}天</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">平均每日题数</div>
                <div className="text-xl font-bold">{efficiencyData.metrics.avgQuestionsPerDay.toFixed(1)}题</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">正确速度</div>
                <div className="text-xl font-bold">{efficiencyData.metrics.correctPerHour.toFixed(1)}题/小时</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">平均每题用时</div>
                <div className="text-xl font-bold">{efficiencyData.metrics.avgTimePerQuestion.toFixed(2)}分钟</div>
              </div>
            </div>

            {/* 改进建议 */}
            {efficiencyData.recommendations && efficiencyData.recommendations.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <h4 className="font-bold mb-4 text-blue-900 dark:text-blue-100">改进建议</h4>
                <ul className="space-y-2">
                  {efficiencyData.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 学习习惯分析 */}
        {activeTab === 'habits' && habitsData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">学习习惯分析</h3>
              <button
                onClick={handleExportHabits}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                📊 导出Excel
              </button>
            </div>

            {/* 习惯概览 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">学习频率</div>
                <div className="text-3xl font-bold text-blue-600">
                  {(habitsData.frequency.frequency * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {habitsData.frequency.studyDays}天 / {days}天
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">一致性评分</div>
                <div className="text-3xl font-bold text-green-600">{habitsData.consistency.score}分</div>
                <div className="text-sm text-slate-500 mt-1">等级: {habitsData.consistency.level}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">平均每日时长</div>
                <div className="text-3xl font-bold text-purple-600">
                  {habitsData.duration.avgDailyMinutes.toFixed(0)}分钟
                </div>
              </div>
            </div>

            {/* 时间分布 */}
            {habitsData.timeDistribution && habitsData.timeDistribution.distribution && (
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <h4 className="font-bold mb-4">学习时间分布</h4>
                <div className="space-y-2">
                  {habitsData.timeDistribution.distribution.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-slate-600 dark:text-slate-400">
                        {item.hour}:00
                      </div>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{
                            width: `${(item.count / Math.max(...habitsData.timeDistribution.distribution.map(d => d.count))) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="w-16 text-sm text-right">{item.count}次</div>
                    </div>
                  ))}
                </div>
                {habitsData.timePreference.bestTime && (
                  <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                    最佳学习时段：{habitsData.timePreference.bestTime}
                  </div>
                )}
              </div>
            )}

            {/* 学习模式 */}
            {habitsData.patterns && habitsData.patterns.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <h4 className="font-bold mb-4">学习模式</h4>
                <div className="space-y-3">
                  {habitsData.patterns.map((pattern, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-blue-600 mt-1">📌</span>
                      <div>
                        <div className="font-medium">{pattern.type}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{pattern.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 习惯总结 */}
            {habitsData.summary && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <h4 className="font-bold mb-2 text-blue-900 dark:text-blue-100">习惯总结</h4>
                <p className="text-slate-700 dark:text-slate-300">{habitsData.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* AI学习建议 */}
        {activeTab === 'suggestions' && suggestionsData && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">AI学习建议</h3>

            {suggestionsData.suggestions && suggestionsData.suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestionsData.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-6 rounded-lg border-l-4 ${
                      suggestion.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            suggestion.priority === 'high'
                              ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
                              : suggestion.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                          }`}
                        >
                          {suggestion.priority === 'high' ? '高优先级' : suggestion.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{suggestion.category}</span>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg mb-2">{suggestion.title}</h4>
                    <p className="text-slate-700 dark:text-slate-300 mb-3">{suggestion.content}</p>
                    {suggestion.suggestions && suggestion.suggestions.length > 0 && (
                      <ul className="space-y-1 mb-3">
                        {suggestion.suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span>•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {suggestion.action && (
                      <div className="mt-4">
                        <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                          {suggestion.action} →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                暂无学习建议
              </div>
            )}

            {/* 建议统计 */}
            {suggestionsData.summary && (
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">总计：</span>
                    <span className="font-bold">{suggestionsData.summary.total}条</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">高优先级：</span>
                    <span className="font-bold text-red-600">{suggestionsData.summary.high}条</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">中优先级：</span>
                    <span className="font-bold text-yellow-600">{suggestionsData.summary.medium}条</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">低优先级：</span>
                    <span className="font-bold text-blue-600">{suggestionsData.summary.low}条</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 综合分析 */}
        {activeTab === 'comprehensive' && comprehensiveData && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">综合分析</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 效率概览 */}
              {comprehensiveData.efficiency && (
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                  <div className="text-sm opacity-90 mb-2">学习效率</div>
                  <div className="text-4xl font-bold mb-2">{comprehensiveData.efficiency.score}分</div>
                  <div className="text-sm opacity-90">{comprehensiveData.efficiency.level}</div>
                </div>
              )}

              {/* 习惯概览 */}
              {comprehensiveData.habits && (
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
                  <div className="text-sm opacity-90 mb-2">学习一致性</div>
                  <div className="text-4xl font-bold mb-2">{comprehensiveData.habits.consistency.score}分</div>
                  <div className="text-sm opacity-90">等级: {comprehensiveData.habits.consistency.level}</div>
                </div>
              )}
            </div>

            {/* 快速建议 */}
            {comprehensiveData.suggestions && comprehensiveData.suggestions.suggestions && (
              <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
                <h4 className="font-bold mb-4">快速建议</h4>
                <div className="space-y-2">
                  {comprehensiveData.suggestions.suggestions.slice(0, 5).map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-slate-700 dark:text-slate-300">{suggestion.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

