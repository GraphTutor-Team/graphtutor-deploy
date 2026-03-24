/**
 * GraphTutor V3.0 - AI控制台页面
 * 
 * 功能：AI题目生成、任务管理、使用统计
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  generateQuestions,
  getAITaskStatus,
  getAITasks,
  getAIStats,
} from '../../api/v3/ai';
import { getBanks } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';

export default function AIConsole() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('generate'); // generate, tasks, stats
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 生成配置
  const [config, setConfig] = useState({
    subjectCode: searchParams.get('subjectCode') || '',
    subjectName: '',
    difficulty: 3,
    count: 5,
    knowledgePoint: '',
    reference: '',
    async: false,
  });

  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);

  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadOptions();
    loadTasks();
    loadStats();
  }, []);

  const loadOptions = async () => {
    try {
      const [banksData, subjectsData] = await Promise.all([
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
        getSubjectTree().catch(() => []),
      ]);
      setBanks(banksData.data || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('加载选项数据失败:', err);
    }
  };

  const loadTasks = async () => {
    try {
      const result = await getAITasks({ limit: 20 });
      setTasks(result.data || []);
    } catch (err) {
      console.error('加载任务列表失败:', err);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getAIStats();
      setStats(data);
    } catch (err) {
      console.error('加载统计信息失败:', err);
    }
  };

  const handleGenerate = async () => {
    if (!config.subjectCode && !config.subjectName) {
      setError('请选择学科或输入学科名称');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await generateQuestions(config, config.async);

      if (config.async) {
        // 异步模式，返回任务ID
        alert(`任务已创建，任务ID: ${result.taskId}`);
        loadTasks();
      } else {
        // 同步模式，返回题目列表
        setGeneratedQuestions(result.questions || []);
        setActiveTab('generate');
      }
    } catch (err) {
      setError(err.message || '生成题目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 轮询任务状态
  useEffect(() => {
    if (activeTab === 'tasks') {
      const interval = setInterval(() => {
        loadTasks();
      }, 3000); // 每3秒刷新一次
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">AI控制台</h1>
        <p className="text-slate-600">使用AI生成题目、分析质量、推荐分类</p>
      </div>

      {/* 标签页 */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'generate'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            🤖 生成题目
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            任务列表 ({tasks.filter((t) => t.status === 'running' || t.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            使用统计
          </button>
        </div>
      </div>

      {/* 生成题目标签页 */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {/* 配置表单 */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-bold mb-4">生成配置</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  学科分类
                </label>
                <select
                  value={config.subjectCode}
                  onChange={(e) => {
                    const subject = subjects.find((s) => s.code === e.target.value);
                    handleConfigChange('subjectCode', e.target.value);
                    handleConfigChange('subjectName', subject?.name || '');
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择学科</option>
                  {subjects.map((subject) => (
                    <option key={subject.code} value={subject.code}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  学科名称（如果未选择学科）
                </label>
                <input
                  type="text"
                  value={config.subjectName}
                  onChange={(e) => handleConfigChange('subjectName', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：操作系统"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  难度
                </label>
                <select
                  value={config.difficulty}
                  onChange={(e) => handleConfigChange('difficulty', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1 - 非常基础</option>
                  <option value="2">2 - 基础理解</option>
                  <option value="3">3 - 一般/中等</option>
                  <option value="4">4 - 偏难</option>
                  <option value="5">5 - 很难/挑战题</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  生成数量
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.count}
                  onChange={(e) => handleConfigChange('count', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  知识点（可选）
                </label>
                <input
                  type="text"
                  value={config.knowledgePoint}
                  onChange={(e) => handleConfigChange('knowledgePoint', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：进程管理、线程同步"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  参考内容（可选）
                </label>
                <textarea
                  value={config.reference}
                  onChange={(e) => handleConfigChange('reference', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：教材第3章、历年真题"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.async}
                    onChange={(e) => handleConfigChange('async', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    异步执行（适合生成大量题目）
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '生成中...' : '🤖 生成题目'}
              </button>
            </div>
          </div>

          {/* 生成结果 */}
          {generatedQuestions.length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-bold mb-4">
                生成结果 ({generatedQuestions.length} 道题目)
              </h2>
              <div className="space-y-4">
                {generatedQuestions.map((q, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg">
                    <div className="font-medium mb-2">{q.content}</div>
                    <div className="space-y-1 text-sm">
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className={`${
                            optIndex === q.answerIndex
                              ? 'text-green-600 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {opt}
                          {optIndex === q.answerIndex && ' ✓'}
                        </div>
                      ))}
                    </div>
                    {q.explain && (
                      <div className="mt-2 text-sm text-slate-600">
                        解析：{q.explain}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 任务列表标签页 */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-500">暂无任务</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">任务ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">进度</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono">{task.id}</td>
                    <td className="px-4 py-3 text-sm">{task.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : task.status === 'running'
                            ? 'bg-blue-100 text-blue-700'
                            : task.status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.status === 'completed'
                          ? '已完成'
                          : task.status === 'running'
                          ? '运行中'
                          : task.status === 'error'
                          ? '失败'
                          : '等待中'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="w-32 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${task.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 ml-2">
                        {task.progress || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(task.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 使用统计标签页 */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-bold mb-4">总体统计（最近30天）</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-slate-600">总调用次数</div>
                <div className="text-2xl font-bold mt-1">
                  {stats.total?.totalCount || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">总成本</div>
                <div className="text-2xl font-bold mt-1">
                  ${(stats.total?.totalCost || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">平均响应时间</div>
                <div className="text-2xl font-bold mt-1">
                  {Math.round(stats.total?.avgDuration || 0)}ms
                </div>
              </div>
            </div>
          </div>

          {stats.byType && stats.byType.length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-bold mb-4">按类型统计</h2>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">调用次数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">成功次数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">总成本</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.byType.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium">{item._id}</td>
                      <td className="px-4 py-3 text-sm">{item.count}</td>
                      <td className="px-4 py-3 text-sm">{item.successCount}</td>
                      <td className="px-4 py-3 text-sm">
                        ${(item.totalCost || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

