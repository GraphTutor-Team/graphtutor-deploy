/**
 * GraphTutor V3.0 - 学习进度追踪器组件
 * 
 * 功能：显示学习进度和统计
 */

import { useState, useEffect } from 'react';
import { calculateOverallProgress, generateProgressReport } from '../utils/progressTracker';

export default function ProgressTracker({ data }) {
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (data) {
      try {
        const progressReport = generateProgressReport(data);
        setReport(progressReport);
      } catch (err) {
        console.error('生成进度报告失败:', err);
      }
    }
  }, [data]);

  if (!report) {
    return (
      <div className="card p-4 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <div className="text-center text-slate-500 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">📊 学习进度追踪</h2>
        <p className="text-slate-600 dark:text-slate-400">
          全面了解你的学习进度
        </p>
      </div>

      {/* 总体进度 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">总体进度</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                综合进度
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {report.overall.overall}%
              </span>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${report.overall.overall}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">目标进度</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {report.overall.goalProgress}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">学习天数</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {report.overall.studyDaysProgress}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">知识点</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {report.overall.knowledgeProgress}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">错题复习</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {report.overall.reviewProgress}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 进度摘要 */}
      {report.summary && report.summary.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">进度摘要</h3>
          <ul className="space-y-2">
            {report.summary.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="text-slate-700 dark:text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 建议 */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">💡 学习建议</h3>
          <div className="space-y-3">
            {report.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  rec.type === 'high'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : rec.type === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
              >
                <div className="font-semibold mb-1">{rec.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{rec.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

