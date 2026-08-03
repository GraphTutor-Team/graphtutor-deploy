/**
 * GraphTutor V3.0 - 学习分析页面
 * 
 * 作用：提供详细的学习数据分析，包括知识点掌握度、学习趋势、学科分布、难度分布、题型分布等，支持导出报告
 * 关联页面：
 *   - api/analytics.js (学习分析API)
 *   - api/v3/subjects.js (学科数据API)
 *   - utils/pdfExport.js (PDF导出)
 *   - utils/excelExport.js (Excel导出)
 *   - components/LearningReport.jsx (学习报告组件)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - Recharts (多种图表：LineChart, BarChart, PieChart)
 *   - 数据可视化
 *   - 报告导出功能
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLearningData } from '../context/LearningDataContext';
import { getKnowledgeMastery, getLearningTrend } from '../api/analytics';
import { getSubjectTree } from '../api/v3/subjects';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from '../utils/toast';
import {
  exportLearningReport,
  exportLearningReportToCSV,
  exportLearningTrendToCSV,
  generateLearningReportText,
} from '../utils/export';
import { exportLearningReportToPDF } from '../utils/pdfExport';
import { exportLearningReportToExcel } from '../utils/excelExport';
import { exportLearningReportToWord } from '../api/v3/export';
import { sampleData } from '../utils/chartOptimization';
import LearningReport from '../components/LearningReport';
import StudyHabits from '../components/StudyHabits';
import StudyComparison from '../components/StudyComparison';
import StudyEfficiency from '../components/StudyEfficiency';
import EnhancedAnalytics from '../components/EnhancedAnalytics';
import { getWrongReport } from '../api/v3/ai';
import { getStudyEfficiencyByTimeAndType, getExamPrediction, getPathRecommendations, getCompareReport, getAdvancementReport } from '../api/v3/enhancedAnalytics';
import { generatePersonalizedPath } from '../api/v3/adaptive';
import { Link, useNavigate } from 'react-router-dom';
import { useAIContext } from '../context/AIContext';

const COLORS = ['#1d4ed8', '#047857', '#0f766e', '#0369a1', '#0ea5e9', '#b45309'];

export default function Analytics() {
  const { user } = useAuth();
  const { learningDataVersion } = useLearningData();
  const { setAIContext } = useAIContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAIContext({ pageType: 'analytics', questionId: null, knowledgeNodeId: null });
    return () => setAIContext({ pageType: 'other', questionId: null, knowledgeNodeId: null });
  }, [setAIContext]);
  const [masteryData, setMasteryData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    days: 30,
    subjectCode: '',
    minQuestions: 3,
  });
  const [wrongReportPeriod, setWrongReportPeriod] = useState('week');
  const [wrongReport, setWrongReport] = useState(null);
  const [wrongReportLoading, setWrongReportLoading] = useState(false);
  const [efficiencyByTimeType, setEfficiencyByTimeType] = useState(null);
  const [examPrediction, setExamPrediction] = useState(null);
  const [examConfig, setExamConfig] = useState({ days: 30, totalQuestions: 20 });
  const [examLoading, setExamLoading] = useState(false);
  const [pathRecommendations, setPathRecommendations] = useState([]);
  const [compareReport, setCompareReport] = useState(null);
  const [compareReportLoading, setCompareReportLoading] = useState(false);
  const [compareGroupBy, setCompareGroupBy] = useState('grade');
  const [advancementReport, setAdvancementReport] = useState(null);
  const [advancementReportLoading, setAdvancementReportLoading] = useState(false);
  const [advancementTarget, setAdvancementTarget] = useState('考研');
  const [adaptiveGoalText, setAdaptiveGoalText] = useState('');
  const [adaptivePreset, setAdaptivePreset] = useState('');
  const [adaptiveDays, setAdaptiveDays] = useState(7);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);
  const [adaptiveResult, setAdaptiveResult] = useState(null);
  const [analyticsTab, setAnalyticsTab] = useState('overview');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDistCharts, setShowDistCharts] = useState(false);

  // 个人资料中的升学目标作为升学报告默认选项
  useEffect(() => {
    const target = user?.advancementTarget;
    if (target && ['考研', '考公', '留学'].includes(target)) {
      setAdvancementTarget(target);
    }
  }, [user?.advancementTarget]);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters, learningDataVersion]);

  // 页签重新可见时刷新（例如在别的页签做完练习后切回统计页）
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user) loadData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

  const loadSubjects = async () => {
    try {
      const tree = await getSubjectTree();
      setSubjects(tree);
    } catch (err) {
      console.error('加载学科列表失败:', err);
    }
  };

  const loadData = async () => {
    if (!user?._id && !user?.id) {
      return;
    }

    setLoading(true);
    try {
      const [mastery, trend, timeTypeRes] = await Promise.all([
        getKnowledgeMastery(filters),
        getLearningTrend({ days: filters.days }),
        getStudyEfficiencyByTimeAndType(filters.days).then((r) => r?.data).catch(() => null),
      ]);
      
      setMasteryData(mastery);
      setTrendData(trend);
      setEfficiencyByTimeType(timeTypeRes || null);
      setExamPrediction(null);
      const pathRes = await getPathRecommendations(90, 5).catch(() => ({}));
      const list = Array.isArray(pathRes?.data) ? pathRes.data : [];
      setPathRecommendations(list);
    } catch (err) {
      console.error('加载学习数据失败:', err);
      toast.error('加载学习数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLoadWrongReport = async () => {
    setWrongReportLoading(true);
    setWrongReport(null);
    try {
      const data = await getWrongReport(wrongReportPeriod);
      setWrongReport(data);
    } catch (err) {
      toast.error(err.message || '生成错题报告失败');
    } finally {
      setWrongReportLoading(false);
    }
  };

  const handleGenerateExamPrediction = async () => {
    setExamLoading(true);
    try {
      const res = await getExamPrediction(examConfig.days, examConfig.totalQuestions);
      setExamPrediction(res?.data || res || null);
    } catch (err) {
      console.error('生成考前预测失败:', err);
      toast.error(err.message || '生成考前预测失败');
      setExamPrediction(null);
    } finally {
      setExamLoading(false);
    }
  };

  const handleStartPredictionQuiz = () => {
    if (!examPrediction || !Array.isArray(examPrediction.nodes) || examPrediction.nodes.length === 0) {
      toast.warning('请先生成预测卷');
      return;
    }
    const plan = {
      nodes: examPrediction.nodes.map((n) => n.knowledgeNodeId),
      totalQuestions: examPrediction.targetQuestionCount || examConfig.totalQuestions,
    };
    navigate('/quiz', { state: { predictionPlan: plan } });
  };

  const loadCompareReport = async () => {
    setCompareReportLoading(true);
    try {
      const res = await getCompareReport(compareGroupBy, 90);
      setCompareReport(res?.data || null);
    } catch (err) {
      toast.error('加载对比报告失败');
      setCompareReport(null);
    } finally {
      setCompareReportLoading(false);
    }
  };

  const loadAdvancementReport = async () => {
    setAdvancementReportLoading(true);
    try {
      const res = await getAdvancementReport(advancementTarget, 90);
      setAdvancementReport(res?.data || null);
    } catch (err) {
      toast.error('加载升学报告失败');
      setAdvancementReport(null);
    } finally {
      setAdvancementReportLoading(false);
    }
  };

  const generateAdaptivePath = async () => {
    setAdaptiveLoading(true);
    setAdaptiveResult(null);
    try {
      const data = await generatePersonalizedPath({
        goalText: adaptiveGoalText.trim() || undefined,
        targetDays: adaptiveDays,
        preset: adaptivePreset || undefined,
      });
      setAdaptiveResult(data);
      toast.success('个性化学习计划已生成');
    } catch (err) {
      toast.error(err.message || '生成失败');
    } finally {
      setAdaptiveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="text-center py-12 text-slate-500 text-sm">加载中...</div>
      </div>
    );
  }

  if (!masteryData) {
    return (
      <div className="page-shell">
        <div className="surface text-center !py-12 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">暂无学习数据</h2>
          <p className="text-sm text-slate-500 mb-5">先去做几道题，这里会出现掌握度与趋势分析。</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link to="/quiz" className="btn btn-primary">开始练习</Link>
            <Link to="/home?guide=1" className="btn btn-outline">使用教程</Link>
          </div>
        </div>
      </div>
    );
  }

  const { overall, knowledgeNodes, bySubject, byDifficulty, byType } = masteryData;

  // 扁平化学科列表用于下拉选择
  const flattenSubjects = (subjects, result = []) => {
    subjects.forEach((subject) => {
      result.push(subject);
      if (subject.children && subject.children.length > 0) {
        flattenSubjects(subject.children, result);
      }
    });
    return result;
  };

  const analyticsTabClass = (tabId) =>
    `px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
      analyticsTab === tabId
        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  const analyticsTabs = [
    { id: 'overview', label: '概览' },
    { id: 'diagnose', label: '诊断与练习' },
    { id: 'compare', label: '对比与升学' },
    { id: 'deep', label: '深度分析' },
  ];

  return (
    <div className="page-shell space-y-4">
      {/* 头部 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">学习分析</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">查看学习数据统计和知识点掌握情况</p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowExportMenu((v) => !v)}
            className="btn btn-primary"
          >
            导出报告
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 z-20 min-w-[200px] py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
              <button
                type="button"
                onClick={() => {
                  try {
                    exportLearningReport(
                      { ...masteryData, trend: trendData, user: { name: user?.name, email: user?.email } },
                      `learning-report-${Date.now()}.json`
                    );
                    toast.success('学习报告已导出（JSON格式）');
                  } catch (err) {
                    toast.error('导出失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                导出 JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    exportLearningReportToCSV(
                      { ...masteryData, trend: trendData },
                      `learning-report-${Date.now()}.csv`
                    );
                    toast.success('学习报告已导出（CSV格式）');
                  } catch (err) {
                    toast.error('导出失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                导出报告(CSV)
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    if (trendData.length > 0) {
                      exportLearningTrendToCSV(trendData, `learning-trend-${Date.now()}.csv`);
                      toast.success('学习趋势已导出');
                    } else {
                      toast.warning('暂无趋势数据');
                    }
                  } catch (err) {
                    toast.error('导出失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                导出趋势
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const reportText = generateLearningReportText({ ...masteryData, trend: trendData });
                    navigator.clipboard.writeText(reportText).then(() => {
                      toast.success('报告文本已复制到剪贴板');
                    }).catch(() => {
                      const textarea = document.createElement('textarea');
                      textarea.value = reportText;
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                      toast.success('报告文本已复制到剪贴板');
                    });
                  } catch (err) {
                    toast.error('复制失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                复制报告
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = now.getMonth() + 1;
                    exportLearningReportToPDF(
                      {
                        ...masteryData,
                        trend: trendData,
                        user: { name: user?.name, email: user?.email },
                        reportTitle: `${year}年${month}月 学习白皮书`,
                      },
                      `学习白皮书-${year}年${month}月.pdf`
                    );
                    toast.success('月度白皮书已生成，请使用打印对话框保存为 PDF');
                  } catch (err) {
                    toast.error('PDF导出失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                title="导出本月学习白皮书（PDF）"
              >
                月度白皮书
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    exportLearningReportToPDF(
                      { ...masteryData, trend: trendData, user: { name: user?.name, email: user?.email } },
                      `learning-report-${Date.now()}.pdf`
                    );
                    toast.success('PDF报告已生成，请使用打印功能保存');
                  } catch (err) {
                    toast.error('PDF导出失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                导出PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    exportLearningReportToExcel(
                      {
                        stats: overall,
                        progress7d: trendData,
                        nodeStats: masteryData?.knowledgeNodes || [],
                        typeDistribution: masteryData?.byType || [],
                        subjectDistribution: masteryData?.bySubject || [],
                      },
                      '学习报告'
                    );
                    toast.success('Excel报告已导出');
                  } catch (err) {
                    toast.error('Excel导出失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                导出Excel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await exportLearningReportToWord({
                      overall,
                      knowledgeNodes: masteryData?.knowledgeNodes || [],
                      bySubject: masteryData?.bySubject || [],
                      byDifficulty: masteryData?.byDifficulty || [],
                      byType: masteryData?.byType || [],
                      trend: trendData,
                      progress7d: trendData,
                    });
                    toast.success('Word报告已导出');
                  } catch (err) {
                    toast.error('Word导出失败: ' + err.message);
                  }
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                导出Word
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="surface !p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">时间范围：</label>
            <select
              value={filters.days}
              onChange={(e) => handleFilterChange('days', parseInt(e.target.value, 10))}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value={7}>最近7天</option>
              <option value={30}>最近30天</option>
              <option value={90}>最近90天</option>
              <option value={180}>最近180天</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">学科：</label>
            <select
              value={filters.subjectCode}
              onChange={(e) => handleFilterChange('subjectCode', e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm min-w-[200px]"
            >
              <option value="">全部学科</option>
              {flattenSubjects(subjects).map((subject) => (
                <option key={subject.code} value={subject.code}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">最少题数：</label>
            <input
              type="number"
              min="1"
              value={filters.minQuestions}
              onChange={(e) => handleFilterChange('minQuestions', parseInt(e.target.value, 10) || 1)}
              className="px-3 py-1.5 border rounded-lg text-sm w-20"
            />
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {analyticsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAnalyticsTab(tab.id)}
              className={analyticsTabClass(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {analyticsTab === 'overview' && (
        <div className="space-y-4">
      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="surface">
          <div className="text-sm text-slate-600 mb-1">总答题数</div>
          <div className="text-3xl font-bold text-blue-600">{overall.total || 0}</div>
        </div>
        <div className="surface">
          <div className="text-sm text-slate-600 mb-1">正确数</div>
          <div className="text-3xl font-bold text-green-600">{overall.correct || 0}</div>
        </div>
        <div className="surface">
          <div className="text-sm text-slate-600 mb-1">错误数</div>
          <div className="text-3xl font-bold text-red-600">{overall.wrong || 0}</div>
        </div>
        <div className="surface">
          <div className="text-sm text-slate-600 mb-1">正确率</div>
          <div className="text-3xl font-bold text-blue-600">
            {overall.accuracy?.toFixed(1) || 0}%
          </div>
        </div>
      </div>

      {/* 学习趋势图：数据点过多时采样，保证渲染流畅 */}
      {trendData.length > 0 && (
        <div className="surface">
          <h2 className="text-lg font-bold mb-4">学习趋势</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sampleData(trendData, 150)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="total"
                stroke="#1d4ed8"
                name="答题数"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="correct"
                stroke="#047857"
                name="正确数"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                stroke="#0f766e"
                name="正确率(%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 知识点掌握度 */}
      {knowledgeNodes && knowledgeNodes.length > 0 && (
        <div className="surface">
          <h2 className="text-lg font-bold mb-4">知识点掌握度</h2>
          <div className="space-y-3">
            {knowledgeNodes.slice(0, 10).map((node, idx) => (
              <div key={node.knowledgeNodeId || idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{node.knowledgeNodeId || '未标注'}</span>
                  <span className="text-slate-600">
                    {node.correct}/{node.total} ({node.accuracy?.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      node.accuracy >= 80
                        ? 'bg-green-600'
                        : node.accuracy >= 60
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${node.accuracy || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(bySubject?.length > 0 || byDifficulty?.length > 0 || byType?.length > 0) && (
        <div>
          <button
            type="button"
            onClick={() => setShowDistCharts((v) => !v)}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {showDistCharts ? '收起分布图' : '展开分布图'}
          </button>
          {showDistCharts && (
            <div className="space-y-4 mt-4">
      {/* 学科分布 */}
      {bySubject && bySubject.length > 0 && (
        <div className="surface">
          <h2 className="text-lg font-bold mb-4">学科掌握度</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bySubject}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subjectCode" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#1d4ed8" name="总题数" />
              <Bar dataKey="correct" fill="#047857" name="正确数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 难度分布 */}
      {byDifficulty && byDifficulty.length > 0 && (
        <div className="surface">
          <h2 className="text-lg font-bold mb-4">难度掌握度</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byDifficulty}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="difficulty" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="accuracy" fill="#0369a1" name="正确率(%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 题型分布 */}
      {byType && byType.length > 0 && (
        <div className="surface">
          <h2 className="text-lg font-bold mb-4">题型掌握度</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#1d4ed8" name="总题数" />
                <Bar dataKey="correct" fill="#047857" name="正确数" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={byType}
                  dataKey="total"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {analyticsTab === 'diagnose' && (
        <div className="space-y-4">
      {/* 错题分析报告（Phase 1.5） */}
      <div className="surface !p-4">
        <h2 className="text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">错题分析报告</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">按周/月聚合错题，由 AI 生成薄弱点分析与复习建议。</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={wrongReportPeriod}
            onChange={(e) => setWrongReportPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
          <button
            onClick={handleLoadWrongReport}
            disabled={wrongReportLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {wrongReportLoading ? '生成中…' : '生成报告'}
          </button>
        </div>
        {wrongReport && (
          <div className="mt-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {wrongReportPeriod === 'week' ? '本周' : '本月'}错题数：{wrongReport.wrongCount}
            </div>
            {wrongReport.report}
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">生成报告后会在通知中心收到提醒，可前往查看。</p>
      </div>

      {/* 考试分数预测（基于近期正确率） */}
      {overall && typeof overall.accuracy === 'number' && (
        <div className="surface !p-4">
          <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">考试分数预测</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            基于近期整体正确率与做题量，预估在同等难度考试中的得分区间（仅供参考）。
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.max(0, Math.min(100, Math.round(overall.accuracy) - 8))}–{Math.min(100, Math.round(overall.accuracy) + 5)}
            </span>
            <span className="text-slate-600 dark:text-slate-400">分</span>
            <span className="text-xs text-slate-500 dark:text-slate-500">
              （近期正确率 {overall.accuracy?.toFixed(1)}%，共 {overall.total || 0} 题）
            </span>
          </div>
        </div>
      )}

      {/* 路径推荐（下一步学习） */}
      <div className="surface !p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">路径推荐</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              基于当前掌握度与知识节点顺序，推荐下一步学习的知识点。
            </p>
          </div>
          {pathRecommendations.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/quiz', { state: { predictionPlan: { nodes: pathRecommendations.map((r) => r.key), totalQuestions: 10 } } })}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 shrink-0"
            >
              按推荐练习（10 题）
            </button>
          )}
        </div>
        {pathRecommendations.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">暂无推荐。先掌握部分知识点后，将推荐相邻节点。</p>
        ) : (
          <ul className="space-y-2">
            {pathRecommendations.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-100">{r.name || r.key}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">正确率 {r.accuracy?.toFixed?.(1) ?? r.accuracy ?? 0}% · 已做 {r.total ?? 0} 题</span>
                {r.reason && <span className="text-xs text-emerald-700 dark:text-emerald-300">{r.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 个性化学习路径（自适应学习引擎 MVP） */}
      <div className="surface !p-4">
        <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">个性化学习路径</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          输入目标或选择预设，系统根据你的掌握度与错题生成每日学习计划，并写入「学习计划」便于打卡与执行。
        </p>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <select
            value={adaptivePreset}
            onChange={(e) => setAdaptivePreset(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">自定义目标</option>
            <option value="考研">考研</option>
            <option value="考公">考公</option>
            <option value="留学">留学</option>
            <option value="四六级">四六级</option>
          </select>
          <input
            type="text"
            value={adaptiveGoalText}
            onChange={(e) => setAdaptiveGoalText(e.target.value)}
            placeholder="如：一周后考四六级"
            className="flex-1 min-w-[160px] px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={!!adaptivePreset}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>天数</span>
            <input
              type="number"
              min={1}
              max={30}
              value={adaptiveDays}
              onChange={(e) => setAdaptiveDays(Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 7)))}
              className="w-16 px-2 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </label>
          <button
            onClick={generateAdaptivePath}
            disabled={adaptiveLoading}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {adaptiveLoading ? '生成中…' : '生成计划'}
          </button>
        </div>
        {adaptiveResult && (
          <div className="mt-4 space-y-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              计划「{adaptiveResult.plan?.name}」已生成，共 {adaptiveResult.summary?.length ?? 0} 天。
            </p>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400 max-h-40 overflow-y-auto">
              {(adaptiveResult.summary || []).slice(0, 7).map((day) => (
                <li key={day.day}>
                  第 {day.day} 天（{day.date}）：{day.targetCount} 题 · {day.nodeNames?.slice(0, 3).join('、')}{day.nodeNames?.length > 3 ? '…' : ''}
                </li>
              ))}
              {(adaptiveResult.summary?.length ?? 0) > 7 && (
                <li className="text-slate-500">… 共 {adaptiveResult.summary.length} 天</li>
              )}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => navigate('/study-plans', { state: { highlightPlanId: adaptiveResult.plan?._id } })}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700"
              >
                查看学习计划
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 考前预测（Phase 2.6） */}
      <div className="surface !p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">考前预测卷</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              基于近期错题与掌握度，选出高风险知识点并生成一套预测练习卷。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">统计范围</span>
              <select
                value={examConfig.days}
                onChange={(e) => setExamConfig((prev) => ({ ...prev, days: Number(e.target.value) || 30 }))}
                className="px-2 py-1 border rounded-lg bg-white dark:bg-slate-700 text-xs"
              >
                <option value={7}>最近 7 天</option>
                <option value={30}>最近 30 天</option>
                <option value={90}>最近 90 天</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">题量</span>
              <select
                value={examConfig.totalQuestions}
                onChange={(e) => setExamConfig((prev) => ({ ...prev, totalQuestions: Number(e.target.value) || 20 }))}
                className="px-2 py-1 border rounded-lg bg-white dark:bg-slate-700 text-xs"
              >
                <option value={10}>10 题</option>
                <option value={20}>20 题</option>
                <option value={30}>30 题</option>
              </select>
            </div>
            <button
              onClick={handleGenerateExamPrediction}
              disabled={examLoading}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-60"
            >
              {examLoading ? '生成中…' : '生成预测卷'}
            </button>
            <button
              onClick={handleStartPredictionQuiz}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={examLoading || !examPrediction || !examPrediction.nodes || examPrediction.nodes.length === 0}
            >
              开始预测卷
            </button>
          </div>
        </div>
        {examPrediction && Array.isArray(examPrediction.nodes) && examPrediction.nodes.length > 0 && (
          <div className="mt-2 space-y-2 text-sm">
            <div className="text-slate-600 dark:text-slate-300 mb-1">
              将为你生成约{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-300">
                {examPrediction.targetQuestionCount || examConfig.totalQuestions} 题
              </span>
              ，覆盖以下高风险知识点：
            </div>
            <div className="space-y-1">
              {examPrediction.nodes.map((n) => (
                <div
                  key={n.knowledgeNodeId}
                  className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {n.knowledgeNodeId}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    正确率 {n.accuracy?.toFixed?.(1) ?? n.accuracy ?? 0}% · 已做 {n.total || 0} 题 · 错 {n.wrong || 0} 题
                  </span>
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {n.reason}
                  </span>
                  <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                    预计 {n.plannedCount || 0} 题
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 效率分析（时段·题型）Phase 2.2 */}
      {efficiencyByTimeType && (
        <div className="surface !p-4">
          <h2 className="text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">效率分析（时段·题型）</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            按时间段、题型统计正确率与耗时，最近 {filters.days} 天
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">最佳学习时段</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {efficiencyByTimeType.bestTimeSlot || '—'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">最擅长题型</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                {efficiencyByTimeType.bestQuestionType || '—'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {efficiencyByTimeType.byTimeSlot?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">各时段正确率</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={efficiencyByTimeType.byTimeSlot} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                    <XAxis dataKey="slot" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, '正确率']} labelFormatter={(l) => `时段：${l}`} />
                    <Bar dataKey="accuracy" name="正确率" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {efficiencyByTimeType.byQuestionType?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">各题型正确率</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={efficiencyByTimeType.byQuestionType} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, '正确率']} labelFormatter={(l) => `题型：${l}`} />
                    <Bar dataKey="accuracy" name="正确率" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {efficiencyByTimeType.suggestions?.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">💡 建议</div>
              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                {efficiencyByTimeType.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {analyticsTab === 'compare' && (
        <div className="space-y-4">
      {/* 对比报告：与同校/同年级对比 */}
      <div className="surface !p-4">
        <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">对比报告</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          与同校或同年级用户对比近期答题量、正确率、学习天数（请在个人中心完善学校/年级）。
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={compareGroupBy}
            onChange={(e) => setCompareGroupBy(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="grade">同年级</option>
            <option value="school">同校</option>
          </select>
          <button
            onClick={loadCompareReport}
            disabled={compareReportLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {compareReportLoading ? '加载中…' : '查看对比'}
          </button>
        </div>
        {compareReport && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-slate-500 dark:text-slate-400">答题数（我 / {compareReport.groupLabel} 平均）</div>
              <div className="font-bold text-slate-900 dark:text-slate-100">{compareReport.mine?.totalQuestions ?? 0} / {compareReport.peer?.avgTotal ?? 0}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-slate-500 dark:text-slate-400">正确率（我 / 平均）</div>
              <div className="font-bold text-slate-900 dark:text-slate-100">{compareReport.mine?.accuracy ?? 0}% / {compareReport.peer?.avgAccuracy ?? 0}%</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-slate-500 dark:text-slate-400">学习天数（我 / 平均）</div>
              <div className="font-bold text-slate-900 dark:text-slate-100">{compareReport.mine?.studyDays ?? 0} / {compareReport.peer?.avgStudyDays ?? 0}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <div className="text-slate-500 dark:text-slate-400">对比人数</div>
              <div className="font-bold text-slate-900 dark:text-slate-100">{compareReport.peerCount ?? 0} 人</div>
            </div>
          </div>
        )}
      </div>

      {/* 升学报告：考研/考公/留学竞争力与差距诊断 */}
      <div className="surface !p-4">
        <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">升学报告</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          基于近期学习数据评估竞争力，并给出差距诊断与备考建议（可在个人中心设置目标）。
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={advancementTarget}
            onChange={(e) => setAdvancementTarget(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="考研">考研</option>
            <option value="考公">考公</option>
            <option value="留学">留学</option>
          </select>
          <button
            onClick={loadAdvancementReport}
            disabled={advancementReportLoading}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {advancementReportLoading ? '加载中…' : '生成报告'}
          </button>
        </div>
        {advancementReport && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div>
                <span className="text-slate-600 dark:text-slate-400">竞争力指数 </span>
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{advancementReport.score}</span>
                <span className="ml-2 px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs">{advancementReport.level}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                近期 {advancementReport.summary?.totalQuestions ?? 0} 题 · 正确率 {advancementReport.summary?.accuracy ?? 0}% · 涉及 {advancementReport.summary?.knowledgeNodeCount ?? 0} 个知识点
              </div>
            </div>
            {advancementReport.gaps && advancementReport.gaps.length > 0 && (
              <div>
                <div className="font-medium text-slate-700 dark:text-slate-300 mb-2">差距诊断</div>
                <ul className="space-y-2">
                  {advancementReport.gaps.map((g, i) => (
                    <li key={i} className="flex flex-wrap gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                      <span className="font-medium">{g.label}</span>
                      <span className="text-slate-500 dark:text-slate-400">正确率 {g.accuracy}% · {g.total} 题</span>
                      <span className="text-emerald-700 dark:text-emerald-300 text-xs">{g.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {advancementReport.suggestions && advancementReport.suggestions.length > 0 && (
              <div>
                <div className="font-medium text-slate-700 dark:text-slate-300 mb-2">备考建议</div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  {advancementReport.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {trendData && trendData.length >= 14 && (
        <StudyComparison
          currentData={trendData.slice(-7)}
          previousData={trendData.slice(-14, -7)}
          periodType="week"
        />
      )}
        </div>
      )}

      {analyticsTab === 'deep' && (
        <div className="space-y-4">
      <StudyEfficiency
        data={{
          records: [],
          progress7d: trendData || [],
          nodeStats: masteryData?.knowledgeNodes || [],
          wrongQuestions: [],
        }}
      />

      <StudyHabits
        data={{
          records: [],
          progress7d: trendData || [],
          progress30d: [],
          checkIns: [],
        }}
      />

      <EnhancedAnalytics days={filters.days} />

      <LearningReport
        data={{
          stats: overall || {},
          progress7d: trendData || [],
          nodeStats: masteryData?.knowledgeNodes || [],
          wrongQuestions: [],
          goals: [],
          records: [],
        }}
      />
        </div>
      )}
    </div>
  );
}
