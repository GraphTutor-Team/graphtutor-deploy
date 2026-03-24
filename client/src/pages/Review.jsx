/**
 * GraphTutor V3.0 - 错题复习页面
 * 
 * 功能：查看和复习错题，支持筛选、统计、导出
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { toast } from '../utils/toast';
import { exportToJSON, exportToCSV } from '../utils/export';
import { exportWrongQuestionsToExcel } from '../utils/excelExport';
import { getSubjectTree } from '../api/v3/subjects';
import Icon from '../components/common/Icon';
import {
  getWrongQuestions,
  getWrongQuestionStats,
  getCategories,
  getTags,
  updateCategory,
  updateTags,
  markAsMastered,
  unmarkAsMastered,
  deleteWrongQuestion,
  batchUpdateCategory,
  batchUpdateTags,
  batchMarkAsMastered,
  batchDeleteWrongQuestions,
  exportWrongQuestions,
} from '../api/v3/wrongQuestions';
import SimilarQuestions from '../components/SimilarQuestions';
import { generateReviewPlan, exportReviewPlanAsText } from '../utils/reviewPlanGenerator';
import { SpacedRepetition, getTodayReviewQuestions } from '../utils/smartReview';
import { exportLearningReportToPDF } from '../utils/pdfExport';
import SmartReviewPanel from '../components/SmartReviewPanel';
import { getForgettingCurve } from '../api/v3/enhancedAnalytics';
import { addGroupSharedQuestion } from '../api/v3/groups';

// 使用新的错题本API

export default function Review() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth() || {};
  const currentUserId = user?._id || user?.id || user?.userId || '';
  const fromGroup = location.state?.fromGroup;
  const groupName = location.state?.groupName;
  
  // 数据状态
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  
  // 筛选状态
  const [filter, setFilter] = useState('all'); // all, recent, mastered, unmastered, learning
  const [searchKeyword, setSearchKeyword] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [masteryStatus, setMasteryStatus] = useState('');
  
  // 选项数据
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  
  // 分页
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 批量操作
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  // 复习计划
  const [showReviewPlanModal, setShowReviewPlanModal] = useState(false);
  const [reviewPlan, setReviewPlan] = useState(null);

  // 遗忘曲线：今日建议复习的知识点
  const [forgettingCurveList, setForgettingCurveList] = useState([]);

  // 加载错题列表
  const load = useCallback(async () => {
    if (!currentUserId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        sortBy: 'lastErrorAt',
        sortOrder: 'desc',
      };

      if (category) params.category = category;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (masteryStatus) params.masteryStatus = masteryStatus;
      if (subjectCode) params.subjectCode = subjectCode;
      if (searchKeyword) params.searchKeyword = searchKeyword;

      const result = await getWrongQuestions(params);
      setRows(result.items || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error('加载错题失败:', err);
      setRows([]);
      toast.error('加载错题失败');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, page, category, selectedTags, masteryStatus, subjectCode, searchKeyword]);

  // 加载统计信息
  const loadStats = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const statsData = await getWrongQuestionStats();
      setStats(statsData);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  }, [currentUserId]);

  // 加载分类和标签
  const loadOptions = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [cats, tagList] = await Promise.all([
        getCategories(),
        getTags(),
      ]);
      setCategories(cats || []);
      setTags(tagList || []);
    } catch (err) {
      console.error('加载选项失败:', err);
    }
  }, [currentUserId]);

  // 加载学科列表
  useEffect(() => {
    async function loadSubjects() {
      try {
        const tree = await getSubjectTree();
        setSubjects(tree);
      } catch (e) {
        console.error("load subjects failed:", e);
      }
    }
    loadSubjects();
  }, []);

  // 加载数据
  useEffect(() => {
    if (currentUserId) {
      load();
      loadStats();
      loadOptions();
    }
  }, [currentUserId, load, loadStats, loadOptions]);

  // 遗忘曲线预警（复习页用）
  useEffect(() => {
    if (!currentUserId) return;
    getForgettingCurve(5).then((res) => {
      if (res?.data && Array.isArray(res.data)) setForgettingCurveList(res.data);
    }).catch(() => {});
  }, [currentUserId]);

  // 处理分类更新
  const handleCategoryChange = async (questionId, newCategory) => {
    try {
      await updateCategory(questionId, newCategory);
      toast.success('分类已更新');
      load();
      loadOptions();
    } catch (err) {
      toast.error('更新分类失败');
    }
  };

  // 处理标签更新
  const handleTagsChange = async (questionId, newTags) => {
    try {
      await updateTags(questionId, newTags);
      toast.success('标签已更新');
      load();
      loadOptions();
    } catch (err) {
      toast.error('更新标签失败');
    }
  };

  // 处理掌握状态切换
  const handleMasteryToggle = async (questionId, isMastered) => {
    try {
      if (isMastered) {
        await markAsMastered(questionId);
        toast.success('已标记为掌握');
      } else {
        await unmarkAsMastered(questionId);
        toast.success('已取消掌握标记');
      }
      load();
      loadStats();
    } catch (err) {
      toast.error('操作失败');
    }
  };

  // 批量操作
  const handleBatchCategory = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择题目');
      return;
    }
    const newCategory = prompt('请输入新分类名称:');
    if (!newCategory) return;
    try {
      await batchUpdateCategory(Array.from(selectedIds), newCategory);
      toast.success(`已更新 ${selectedIds.size} 道题目的分类`);
      setSelectedIds(new Set());
      setShowBatchActions(false);
      load();
      loadOptions();
    } catch (err) {
      toast.error('批量更新失败');
    }
  };

  const handleBatchTags = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择题目');
      return;
    }
    const tagsInput = prompt('请输入标签（用逗号分隔）:');
    if (!tagsInput) return;
    const newTags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    try {
      await batchUpdateTags(Array.from(selectedIds), newTags);
      toast.success(`已更新 ${selectedIds.size} 道题目的标签`);
      setSelectedIds(new Set());
      setShowBatchActions(false);
      load();
      loadOptions();
    } catch (err) {
      toast.error('批量更新失败');
    }
  };

  const handleBatchMastered = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择题目');
      return;
    }
    try {
      await batchMarkAsMastered(Array.from(selectedIds));
      toast.success(`已标记 ${selectedIds.size} 道题目为掌握`);
      setSelectedIds(new Set());
      setShowBatchActions(false);
      load();
      loadStats();
    } catch (err) {
      toast.error('批量标记失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择题目');
      return;
    }
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 道错题吗？此操作不可恢复。`)) {
      return;
    }
    try {
      const result = await batchDeleteWrongQuestions(Array.from(selectedIds));
      toast.success(`已删除 ${result.deletedCount || selectedIds.size} 道错题`);
      setSelectedIds(new Set());
      setShowBatchActions(false);
      load();
      loadStats();
    } catch (err) {
      toast.error('批量删除失败');
    }
  };

  // 导出练习册
  const handleExportWorkbook = async () => {
    try {
      const params = {};
      if (category) params.category = category;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (masteryStatus) params.masteryStatus = masteryStatus;
      if (subjectCode) params.subjectCode = subjectCode;

      const data = await exportWrongQuestions(params);
      const wrongQuestions = data.wrongQuestions || [];
      
      if (wrongQuestions.length === 0) {
        toast.error('没有可导出的错题');
        return;
      }

      // 生成练习册HTML
      const workbookHTML = generateWorkbookHTML(wrongQuestions);
      
      // 使用PDF导出工具
      exportLearningReportToPDF(
        {
          overall: {
            total: wrongQuestions.length,
            correct: 0,
            wrong: wrongQuestions.length,
            accuracy: 0,
          },
          wrongQuestions,
          user: { name: user?.name, email: user?.email },
        },
        `错题练习册-${Date.now()}.pdf`
      );
      
      toast.success('练习册已生成，请使用打印功能保存为PDF');
    } catch (err) {
      console.error('导出练习册失败:', err);
      toast.error('导出练习册失败');
    }
  };

  // 生成练习册HTML
  const generateWorkbookHTML = (wrongQuestions) => {
    return wrongQuestions.map((q, idx) => {
      const options = q.options || [];
      return `
        <div style="page-break-after: always; padding: 20px;">
          <h3>题目 ${idx + 1}</h3>
          <p>${q.content || ''}</p>
          ${options.map((opt, optIdx) => 
            `<p>${String.fromCharCode(65 + optIdx)}. ${opt}</p>`
          ).join('')}
          <p><strong>正确答案：</strong>${q.correctIndex !== undefined ? String.fromCharCode(65 + q.correctIndex) : ''}</p>
          ${q.explain ? `<p><strong>解析：</strong>${q.explain}</p>` : ''}
        </div>
      `;
    }).join('');
  };

  // 导出错题
  const handleExport = async (format = 'json') => {
    try {
      const params = {};
      if (category) params.category = category;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (masteryStatus) params.masteryStatus = masteryStatus;
      if (subjectCode) params.subjectCode = subjectCode;

      const data = await exportWrongQuestions(params);
      
      if (format === 'json') {
        exportToJSON(data, `wrong-questions-${Date.now()}.json`);
      } else if (format === 'csv') {
        const csvData = data.wrongQuestions.map(q => ({
          '题目ID': q.questionId,
          '题干': q.content,
          '选项A': q.options?.[0] || '',
          '选项B': q.options?.[1] || '',
          '选项C': q.options?.[2] || '',
          '选项D': q.options?.[3] || '',
          '正确答案': q.correctIndex !== undefined ? String.fromCharCode(65 + q.correctIndex) : '',
          '分类': q.category,
          '标签': q.tags?.join(';') || '',
          '掌握度': q.mastery,
          '掌握状态': q.masteryStatus === 'mastered' ? '已掌握' : q.masteryStatus === 'learning' ? '学习中' : '未掌握',
          '错误次数': q.errorCount,
          '复习次数': q.reviewCount,
          '首次错误时间': q.firstErrorAt ? new Date(q.firstErrorAt).toLocaleString('zh-CN') : '',
          '最后错误时间': q.lastErrorAt ? new Date(q.lastErrorAt).toLocaleString('zh-CN') : '',
          '解析': q.explain || '',
        }));
        exportToCSV(csvData, `wrong-questions-${Date.now()}.csv`);
      }
      
      toast.success('错题已导出');
    } catch (err) {
      toast.error('导出失败');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="错题复习"
        subtitle="查看和复习你做错的题目，巩固薄弱知识点"
      />

      {/* 智能复习面板 */}
      <SmartReviewPanel />

      {/* 遗忘曲线：今日建议复习的知识点（与首页同源） */}
      {forgettingCurveList.length > 0 && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-slate-800/50 p-4">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">📉 建议优先复习这些知识点（7 天后遗忘概率较高）</div>
          <div className="flex flex-wrap gap-2">
            {forgettingCurveList.map((item) => (
              <Link
                key={item.knowledgeNodeId}
                to={`/quiz?knowledgeNodeId=${encodeURIComponent(item.knowledgeNodeId)}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-rose-200 dark:border-rose-700 text-sm text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30"
              >
                <span className="truncate max-w-[120px]">{item.knowledgeNodeId}</span>
                <span className="text-rose-500 text-xs">约 {item.forgetProbability7d}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm text-slate-600 mb-1">错题总数</div>
          <div className="text-3xl font-bold text-slate-900">{stats?.total || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm text-slate-600 mb-1">已掌握</div>
          <div className="text-3xl font-bold text-green-600">{stats?.mastered || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm text-slate-600 mb-1">学习中</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.learning || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm text-slate-600 mb-1">未掌握</div>
          <div className="text-3xl font-bold text-orange-600">{stats?.unmastered || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="text-sm text-slate-600 mb-1">平均掌握度</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats?.avgMastery ? Math.round(stats.avgMastery) : 0}%
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {showBatchActions && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-blue-900">
            已选择 <strong>{selectedIds.size}</strong> 道题目
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBatchCategory}
              className="btn btn-sm btn-outline"
            >
              批量设置分类
            </button>
            <button
              onClick={handleBatchTags}
              className="btn btn-sm btn-outline"
            >
              批量设置标签
            </button>
            <button
              onClick={handleBatchMastered}
              className="btn btn-sm btn-primary"
            >
              批量标记为掌握
            </button>
            <button
              onClick={handleBatchDelete}
              className="btn btn-sm btn-error text-white"
            >
              批量删除
            </button>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setShowBatchActions(false);
              }}
              className="btn btn-sm btn-ghost"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 筛选和搜索 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="搜索题目内容或知识点ID..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchActions(!showBatchActions)}
              className="btn btn-sm btn-outline"
            >
              {showBatchActions ? '取消选择' : '批量操作'}
            </button>
            <button
              onClick={() => {
                // 使用智能复习算法生成计划
                const plan = SpacedRepetition.generateReviewPlan(rows, { days: 7, questionsPerDay: 10 });
                setReviewPlan(plan);
                setShowReviewPlanModal(true);
              }}
              className="btn btn-sm btn-success"
            >
              📅 生成智能复习计划
            </button>
            <button
              onClick={() => {
                const todayQuestions = getTodayReviewQuestions(rows);
                if (todayQuestions.length === 0) {
                  toast.success('今日没有需要复习的题目');
                  return;
                }
                navigate('/quiz', {
                  state: {
                    questionIds: todayQuestions.map(q => q.questionId || q._id),
                    mode: 'review',
                  },
                });
              }}
              className="btn btn-sm btn-primary"
            >
              🎯 今日复习
            </button>
            <div className="dropdown">
              <button className="btn btn-sm btn-outline">
                导出 <span className="ml-1">▼</span>
              </button>
              <div className="dropdown-menu">
                <button onClick={() => handleExport('json')} className="dropdown-item">
                  导出为JSON
                </button>
                <button onClick={() => handleExport('csv')} className="dropdown-item">
                  导出为CSV
                </button>
                <button
                  onClick={async () => {
                    try {
                      const params = {};
                      if (category) params.category = category;
                      if (selectedTags.length > 0) params.tags = selectedTags;
                      if (masteryStatus) params.masteryStatus = masteryStatus;
                      if (subjectCode) params.subjectCode = subjectCode;

                      const data = await exportWrongQuestions(params);
                      const wrongQuestions = data.wrongQuestions || [];
                      
                      if (wrongQuestions.length === 0) {
                        toast.error('没有可导出的错题');
                        return;
                      }

                      exportWrongQuestionsToExcel(wrongQuestions, '错题本');
                      toast.success('Excel已导出');
                    } catch (err) {
                      console.error('导出Excel失败:', err);
                      toast.error('导出Excel失败');
                    }
                  }}
                  className="dropdown-item"
                >
                  📊 导出为Excel
                </button>
                <button onClick={() => handleExportWorkbook()} className="dropdown-item">
                  <Icon name="book" size={18} className="mr-1" />
                  导出练习册（PDF）
                </button>
              </div>
            </div>
            <button
              onClick={load}
              className="btn btn-sm min-h-[44px] sm:min-h-0 touch-manipulation"
              disabled={loading}
            >
              {loading ? '加载中...' : '刷新'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">学科：</span>
            <select
              className="select text-sm"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
            >
              <option value="">全部学科</option>
              {(() => {
                const flattenSubjects = (subjects, result = []) => {
                  subjects.forEach((subject) => {
                    result.push(subject);
                    if (subject.children && subject.children.length > 0) {
                      flattenSubjects(subject.children, result);
                    }
                  });
                  return result;
                };
                return flattenSubjects(subjects).map((subject) => {
                  const indent = '  '.repeat((subject.level || 1) - 1);
                  return (
                    <option key={subject.code} value={subject.code}>
                      {indent}{subject.icon || '📚'} {subject.name}
                    </option>
                  );
                });
              })()}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">分类：</span>
            <select
              className="select text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">掌握状态：</span>
            <select
              className="select text-sm"
              value={masteryStatus}
              onChange={(e) => setMasteryStatus(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="unmastered">未掌握</option>
              <option value="learning">学习中</option>
              <option value="mastered">已掌握</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-slate-600">标签：</span>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 错题列表 */}
      <div className="space-y-4">
        {fromGroup && groupName && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200">
            正在为小组「{groupName}」添加题目，点击题目下方的「加入小组题库」即可加入。
          </div>
        )}
        {loading ? (
          <div className="bg-white p-12 rounded-lg border shadow-sm text-center">
            <div className="text-slate-500">正在加载错题...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-12 rounded-lg border dark:border-slate-700 shadow-sm text-center space-y-4">
            <div className="text-4xl mb-4">📚</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">暂无错题</div>
            <div className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              完成练习或考试后，错题会自动出现在这里。下一步：先去练题或参加考试。
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <Link to="/quiz" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                去练习
              </Link>
              <Link to="/exam" className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                去考试
              </Link>
            </div>
          </div>
        ) : (
          rows.map((r, i) => {
            const question = r.question || {};
            const wrongQuestion = r;
            const correctIndex = r.correctIndex ?? r.correctAnswerIndex ?? null;
            const userIndex = r.answerIndex ?? r.userAnswerIndex ?? null;
            const options = r.options || [];

            return (
              <div
                key={wrongQuestion._id || wrongQuestion.questionId || i}
                className={`bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
                  selectedIds.has(wrongQuestion.questionId) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {showBatchActions && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(wrongQuestion.questionId)}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) {
                              newSet.add(wrongQuestion.questionId);
                            } else {
                              newSet.delete(wrongQuestion.questionId);
                            }
                            setSelectedIds(newSet);
                          }}
                          className="checkbox"
                        />
                      )}
                      <span className="text-sm font-semibold text-slate-600">
                        错题 #{i + 1}
                      </span>
                      {question.difficulty && (
                        <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                          难度 {question.difficulty}
                        </span>
                      )}
                      {question.type && (
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                          {question.type === 'single' ? '单选' :
                           question.type === 'multiple' ? '多选' :
                           question.type === 'fill' ? '填空' :
                           question.type === 'short' ? '简答' :
                           question.type === 'judge' ? '判断' : question.type}
                        </span>
                      )}
                      {/* 分类标签 */}
                      {wrongQuestion.category && (
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                          📁 {wrongQuestion.category}
                        </span>
                      )}
                      {/* 掌握状态 */}
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        wrongQuestion.masteryStatus === 'mastered'
                          ? 'bg-green-100 text-green-700'
                          : wrongQuestion.masteryStatus === 'learning'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {wrongQuestion.masteryStatus === 'mastered' ? '✓ 已掌握' :
                         wrongQuestion.masteryStatus === 'learning' ? '📚 学习中' :
                         '❌ 未掌握'}
                      </span>
                      {/* 掌握度进度条 */}
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              wrongQuestion.mastery >= 80 ? 'bg-green-500' :
                              wrongQuestion.mastery >= 50 ? 'bg-blue-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${wrongQuestion.mastery || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">
                          {wrongQuestion.mastery || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="text-base font-bold text-slate-900 mb-3 leading-relaxed">
                      {question.content || '(题干略)'}
                    </div>
                  </div>
                  {wrongQuestion.lastErrorAt && (
                    <div className="text-xs text-slate-500 ml-4">
                      {new Date(wrongQuestion.lastErrorAt).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </div>

                {/* 选项显示 */}
                {question.options && question.options.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {question.options.map((opt, idx) => {
                      const isCorrect = idx === (question.answerIndex ?? question.correctIndex);
                      return (
                        <div
                          key={idx}
                          className={`text-sm p-3 rounded-lg border-2 transition-colors ${
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span>{opt}</span>
                            {isCorrect && (
                              <span className="ml-auto text-emerald-700 font-bold">✓ 正确答案</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 标签显示 */}
                {wrongQuestion.tags && wrongQuestion.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {wrongQuestion.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 解析 */}
                {question.explain && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold text-blue-900 mb-1">解析：</div>
                    <div className="text-sm text-blue-800">{question.explain}</div>
                  </div>
                )}

                {/* 相似题推荐 */}
                {wrongQuestion.questionId && (
                  <SimilarQuestions
                    questionId={wrongQuestion.questionId}
                    knowledgeNodeId={question.knowledgeNodeId}
                    subjectCode={question.subjectCode}
                  />
                )}

                {/* 统计信息 */}
                <div className="mb-4 flex items-center gap-4 text-xs text-slate-600">
                  <span>错误次数: <strong>{wrongQuestion.errorCount || 0}</strong></span>
                  <span>复习次数: <strong>{wrongQuestion.reviewCount || 0}</strong></span>
                  {wrongQuestion.nextReviewAt && (
                    <span>
                      下次复习: {new Date(wrongQuestion.nextReviewAt).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>

                {/* 知识点 */}
                {question.knowledgeNodeId && (
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <span className="text-slate-600">知识点：</span>
                    <span className="font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                      {question.knowledgeNodeId}
                    </span>
                    <Link
                      to={`/graph?node=${question.knowledgeNodeId}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      查看图谱 →
                    </Link>
                  </div>
                )}

                {/* 分类和标签编辑 */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">分类</label>
                      <div className="flex gap-2">
                        <select
                          value={wrongQuestion.category || ''}
                          onChange={(e) => handleCategoryChange(wrongQuestion.questionId, e.target.value)}
                          className="select text-sm flex-1"
                        >
                          <option value="未分类">未分类</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="新建分类"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              handleCategoryChange(wrongQuestion.questionId, e.target.value.trim());
                              e.target.value = '';
                            }
                          }}
                          className="input text-sm w-32"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">标签</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="添加标签（回车确认）"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              const newTags = [...(wrongQuestion.tags || []), e.target.value.trim()];
                              handleTagsChange(wrongQuestion.questionId, newTags);
                              e.target.value = '';
                            }
                          }}
                          className="input text-sm flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      navigate('/quiz', {
                        state: { 
                          knowledgeNodeId: question.knowledgeNodeId,
                          questionIds: [wrongQuestion.questionId],
                        },
                      });
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    再次练习
                  </button>
                  {fromGroup && wrongQuestion.questionId && (
                    <button
                      onClick={async () => {
                        try {
                          await addGroupSharedQuestion(fromGroup, { questionId: wrongQuestion.questionId, type: 'wrong' });
                          toast.success('已加入小组题库');
                        } catch (err) {
                          toast.error(err.message || '加入失败');
                        }
                      }}
                      className="btn btn-sm btn-ghost text-blue-600"
                    >
                      加入小组题库
                    </button>
                  )}
                  <button
                    onClick={() => handleMasteryToggle(wrongQuestion.questionId, !wrongQuestion.isMastered)}
                    className={`btn btn-sm ${
                      wrongQuestion.isMastered ? 'btn-outline' : 'btn-success'
                    }`}
                  >
                    {wrongQuestion.isMastered ? '取消掌握' : '标记为掌握'}
                  </button>
                  {wrongQuestion.questionId && (
                    <Link
                      to={`/questions/${wrongQuestion.questionId}/detail`}
                      className="btn btn-sm btn-ghost"
                    >
                      查看详情
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      if (confirm('确定要删除这道错题吗？')) {
                        try {
                          await deleteWrongQuestion(wrongQuestion.questionId);
                          toast.success('已删除');
                          load();
                          loadStats();
                        } catch (err) {
                          toast.error('删除失败');
                        }
                      }
                    }}
                    className="btn btn-sm btn-ghost text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-outline"
            >
              上一页
            </button>
            <span className="text-sm text-slate-600">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn btn-sm btn-outline"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 复习计划模态框 */}
      {showReviewPlanModal && reviewPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">📅 复习计划</h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-2">计划概览</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-slate-600">总天数</div>
                  <div className="font-bold text-lg">{reviewPlan.summary.totalDays} 天</div>
                </div>
                <div>
                  <div className="text-slate-600">总题数</div>
                  <div className="font-bold text-lg">{reviewPlan.summary.totalQuestions} 道</div>
                </div>
                <div>
                  <div className="text-slate-600">每日题数</div>
                  <div className="font-bold text-lg">{reviewPlan.summary.questionsPerDay} 道</div>
                </div>
                <div>
                  <div className="text-slate-600">开始日期</div>
                  <div className="font-bold text-lg">{reviewPlan.summary.startDate}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <h3 className="font-semibold">每日计划</h3>
              {reviewPlan.plan.map((day) => (
                <div key={day.day} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">第 {day.day} 天 ({day.date})</span>
                    <span className="text-sm text-slate-600">{day.count} 道题</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    知识点: {day.questions.map(q => q.knowledgeNodeId || '未标注').join(', ')}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  const text = exportReviewPlanAsText(reviewPlan);
                  navigator.clipboard.writeText(text).then(() => {
                    toast.success('复习计划已复制到剪贴板');
                  }).catch(() => {
                    toast.error('复制失败');
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                📋 复制计划
              </button>
              <button
                onClick={() => {
                  setShowReviewPlanModal(false);
                  setReviewPlan(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
