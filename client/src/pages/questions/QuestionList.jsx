/**
 * GraphTutor V3.0 - 题目列表页面
 * 
 * 功能：显示题目列表，支持多维度筛选、搜索、批量操作
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getQuestions, deleteQuestion, batchCreateQuestions, batchUpdateQuestions, batchDeleteQuestions } from '../../api/v3/questions';
import { getBanks } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';
import { exportQuestions, exportQuestionsToCSV } from '../../utils/export';
import { toast } from '../../utils/toast';

export default function QuestionList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 筛选条件
  const [filters, setFilters] = useState({
    subjectCode: searchParams.get('subjectCode') || '',
    bankId: searchParams.get('bankId') || '',
    difficulty: '',
    knowledgeNodeId: '',
    type: '', // 题型筛选
    tags: '', // 标签筛选
    source: '', // 来源筛选
    search: '',
    page: 1,
    limit: 20,
  });

  // 高级搜索展开状态
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 批量编辑对话框状态
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditData, setBatchEditData] = useState({
    bankId: '',
    subjectCode: '',
    difficulty: '',
    knowledgeNodeId: '',
    tags: '',
    source: '',
  });
  
  // 分页信息
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 选项数据
  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // 批量选择
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filters]);

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

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getQuestions(filters);
      setQuestions(result.data);
      setMeta(result.meta);
    } catch (err) {
      console.error('加载题目列表失败:', err);
      setError(err.message || '加载题目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, content) => {
    if (!window.confirm(`确定要删除题目"${content.substring(0, 50)}..."吗？`)) {
      return;
    }

    try {
      await deleteQuestion(id);
      loadQuestions();
    } catch (err) {
      alert(err.message || '删除失败');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(questions.map((q) => q._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id, checked) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const canManage = user?.role === 'admin' || user?.role === 'question_manager';

  // 导出功能
  const handleExportJSON = () => {
    try {
      const exportData = selectedIds.size > 0
        ? questions.filter((q) => selectedIds.has(q._id))
        : questions;
      
      if (exportData.length === 0) {
        toast.warning('没有可导出的题目');
        return;
      }
      
      exportQuestions(exportData, `questions-${Date.now()}.json`);
      toast.success(`已导出 ${exportData.length} 道题目（JSON格式）`);
    } catch (error) {
      toast.error('导出失败: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = selectedIds.size > 0
        ? questions.filter((q) => selectedIds.has(q._id))
        : questions;
      
      if (exportData.length === 0) {
        toast.warning('没有可导出的题目');
        return;
      }
      
      exportQuestionsToCSV(exportData, `questions-${Date.now()}.csv`);
      toast.success(`已导出 ${exportData.length} 道题目（CSV格式）`);
    } catch (error) {
      toast.error('导出失败: ' + error.message);
    }
  };

  // 导出所有题目（分页拉取，避免单次请求过大；列表接口每页最多 100 条）
  const EXPORT_PAGE_SIZE = 100;
  const EXPORT_MAX_COUNT = 5000;

  const handleExportAll = async (format = 'json') => {
    try {
      const collected = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await getQuestions({
          ...filters,
          page,
          limit: EXPORT_PAGE_SIZE,
        });
        const chunk = result.data || [];
        collected.push(...chunk);
        if (chunk.length < EXPORT_PAGE_SIZE || collected.length >= EXPORT_MAX_COUNT) {
          hasMore = false;
        } else {
          page += 1;
        }
      }

      if (collected.length === 0) {
        toast.warning('没有可导出的题目');
        return;
      }

      if (format === 'json') {
        exportQuestions(collected, `all-questions-${Date.now()}.json`);
        toast.success(`已导出 ${collected.length} 道题目（JSON格式）`);
      } else {
        exportQuestionsToCSV(collected, `all-questions-${Date.now()}.csv`);
        toast.success(`已导出 ${collected.length} 道题目（CSV格式）`);
      }
    } catch (error) {
      toast.error('导出失败: ' + error.message);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">题目管理</h1>
        <p className="text-slate-600">管理和查看所有题目</p>
      </div>

      {/* 操作栏 */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          {/* 搜索框 */}
          <input
            type="text"
            placeholder="搜索题目内容..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="flex-1 w-full sm:min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* 学科筛选 */}
          <select
            value={filters.subjectCode}
            onChange={(e) => handleFilterChange('subjectCode', e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有学科</option>
            {(() => {
              // 扁平化树形结构用于下拉选择
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

          {/* 题库筛选 */}
          <select
            value={filters.bankId}
            onChange={(e) => handleFilterChange('bankId', e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有题库</option>
            {banks.map((bank) => (
              <option key={bank._id} value={bank._id}>
                {bank.name}
              </option>
            ))}
          </select>

          {/* 难度筛选 */}
          <select
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有难度</option>
            <option value="1">难度1（容易）</option>
            <option value="2">难度2（较易）</option>
            <option value="3">难度3（中等）</option>
            <option value="4">难度4（较难）</option>
            <option value="5">难度5（困难）</option>
          </select>

          {/* 高级搜索按钮 */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 border rounded-lg text-sm whitespace-nowrap ${
              showAdvanced
                ? 'bg-blue-100 text-blue-700 border-blue-300'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {showAdvanced ? '收起' : '高级'} ▼
          </button>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2">
          {/* 导出按钮 */}
          <div className="relative group">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
            >
              导出 ▼
            </button>
            <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={handleExportJSON}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg"
              >
                导出选中（JSON）
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
              >
                导出选中（CSV）
              </button>
              <div className="border-t my-1" />
              <button
                onClick={() => handleExportAll('json')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
              >
                导出全部（JSON）
              </button>
              <button
                onClick={() => handleExportAll('csv')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 last:rounded-b-lg"
              >
                导出全部（CSV）
              </button>
            </div>
          </div>
          
          {/* 导入按钮 */}
          {canManage && (
            <button
              onClick={() => navigate('/questions/import')}
              className="btn btn-outline whitespace-nowrap"
            >
              导入题目
            </button>
          )}
          
          {/* 创建按钮 */}
          {canManage && (
            <button
              onClick={() => navigate('/questions/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              + 创建题目
            </button>
          )}
        </div>
      </div>

      {/* 高级搜索面板 */}
      {showAdvanced && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 题型筛选 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                题型
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">所有题型</option>
                <option value="single">单选题</option>
                <option value="multiple">多选题</option>
                <option value="judge">判断题</option>
                <option value="fill">填空题</option>
                <option value="short">简答题</option>
                <option value="coding">编程题</option>
              </select>
            </div>

            {/* 标签筛选 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                标签
              </label>
              <input
                type="text"
                placeholder="输入标签（多个用逗号分隔）"
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* 来源筛选 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                来源
              </label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">所有来源</option>
                <option value="manual">手动创建</option>
                <option value="import">导入</option>
                <option value="ai">AI生成</option>
              </select>
            </div>

            {/* 知识点筛选 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                知识点ID
              </label>
              <input
                type="text"
                placeholder="输入知识点ID"
                value={filters.knowledgeNodeId}
                onChange={(e) => handleFilterChange('knowledgeNodeId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          {/* 清除筛选按钮 */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilters({
                  subjectCode: '',
                  bankId: '',
                  difficulty: '',
                  knowledgeNodeId: '',
                  type: '',
                  tags: '',
                  source: '',
                  search: '',
                  page: 1,
                  limit: 20,
                });
              }}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              清除所有筛选
            </button>
          </div>
        </div>
      )}

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && canManage && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                已选择 <strong>{selectedIds.size}</strong> 个题目
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const selectedQuestions = questions.filter((q) => selectedIds.has(q._id));
                  exportQuestions(selectedQuestions, `selected-questions-${Date.now()}.json`);
                  toast.success(`已导出 ${selectedQuestions.length} 道题目`);
                }}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 whitespace-nowrap"
              >
                📥 导出选中
              </button>
              <button
                onClick={() => setShowBatchEdit(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 whitespace-nowrap"
              >
                ✏️ 批量编辑
              </button>
              <button
                onClick={async () => {
                  if (window.confirm(`确定要删除选中的 ${selectedIds.size} 个题目吗？此操作不可恢复。`)) {
                    setLoading(true);
                    try {
                      await batchDeleteQuestions(Array.from(selectedIds));
                      toast.success(`成功删除 ${selectedIds.size} 个题目`);
                      setSelectedIds(new Set());
                      loadQuestions();
                    } catch (err) {
                      toast.error(err.message || '批量删除失败');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 whitespace-nowrap"
              >
                🗑️ 批量删除
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 whitespace-nowrap"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量编辑对话框 */}
      {showBatchEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">批量编辑题目</h2>
            <p className="text-sm text-slate-600 mb-4">
              将更新选中的 <strong>{selectedIds.size}</strong> 个题目。留空的字段将不会被更新。
            </p>
            
            <div className="space-y-4">
              {/* 题库 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  移动到题库
                </label>
                <select
                  value={batchEditData.bankId}
                  onChange={(e) => setBatchEditData({ ...batchEditData, bankId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">不更改</option>
                  {banks.map((bank) => (
                    <option key={bank._id} value={bank._id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 学科 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  学科
                </label>
                <select
                  value={batchEditData.subjectCode}
                  onChange={(e) => setBatchEditData({ ...batchEditData, subjectCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">不更改</option>
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
                    return flattenSubjects(subjects).map((subject) => (
                      <option key={subject.code} value={subject.code}>
                        {subject.icon || '📚'} {subject.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* 难度 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  难度
                </label>
                <select
                  value={batchEditData.difficulty}
                  onChange={(e) => setBatchEditData({ ...batchEditData, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">不更改</option>
                  <option value="1">难度1（容易）</option>
                  <option value="2">难度2（较易）</option>
                  <option value="3">难度3（中等）</option>
                  <option value="4">难度4（较难）</option>
                  <option value="5">难度5（困难）</option>
                </select>
              </div>

              {/* 知识点 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  知识点ID
                </label>
                <input
                  type="text"
                  placeholder="留空则不更改"
                  value={batchEditData.knowledgeNodeId}
                  onChange={(e) => setBatchEditData({ ...batchEditData, knowledgeNodeId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  标签（多个用逗号分隔）
                </label>
                <input
                  type="text"
                  placeholder="留空则不更改，例如：基础,重要,易错"
                  value={batchEditData.tags}
                  onChange={(e) => setBatchEditData({ ...batchEditData, tags: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* 来源 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  来源
                </label>
                <select
                  value={batchEditData.source}
                  onChange={(e) => setBatchEditData({ ...batchEditData, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">不更改</option>
                  <option value="manual">手动创建</option>
                  <option value="import">导入</option>
                  <option value="ai">AI生成</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBatchEdit(false);
                  setBatchEditData({
                    bankId: '',
                    subjectCode: '',
                    difficulty: '',
                    knowledgeNodeId: '',
                    tags: '',
                    source: '',
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const updates = {};
                    if (batchEditData.bankId) updates.bankId = batchEditData.bankId;
                    if (batchEditData.subjectCode) updates.subjectCode = batchEditData.subjectCode;
                    if (batchEditData.difficulty) updates.difficulty = parseInt(batchEditData.difficulty, 10);
                    if (batchEditData.knowledgeNodeId) updates.knowledgeNodeId = batchEditData.knowledgeNodeId;
                    if (batchEditData.tags) {
                      updates.tags = batchEditData.tags.split(',').map(t => t.trim()).filter(t => t);
                    }
                    if (batchEditData.source) updates.source = batchEditData.source;

                    if (Object.keys(updates).length === 0) {
                      toast.warning('请至少选择一个要更新的字段');
                      return;
                    }

                    await batchUpdateQuestions({
                      ids: Array.from(selectedIds),
                      updates,
                    });

                    toast.success(`成功更新 ${selectedIds.size} 个题目`);
                    setShowBatchEdit(false);
                    setSelectedIds(new Set());
                    setBatchEditData({
                      bankId: '',
                      subjectCode: '',
                      difficulty: '',
                      knowledgeNodeId: '',
                      tags: '',
                      source: '',
                    });
                    loadQuestions();
                  } catch (err) {
                    toast.error(err.message || '批量更新失败');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确认更新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {/* 题目列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">加载中...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无题目数据</div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="bg-white rounded-lg border overflow-hidden min-w-0">
              <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  {canManage && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === questions.length && questions.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    题目
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    题型
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    学科
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    难度
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    题库
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {questions.map((question) => (
                  <tr key={question._id} className="hover:bg-slate-50">
                    {canManage && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(question._id)}
                          onChange={(e) => handleSelectOne(question._id, e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-medium max-w-md truncate">
                        {question.content}
                      </div>
                      {question.qid && (
                        <div className="text-xs text-slate-500 mt-1">{question.qid}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const typeMap = {
                          single: { label: '单选题', color: 'blue' },
                          multiple: { label: '多选题', color: 'purple' },
                          judge: { label: '判断题', color: 'green' },
                          fill: { label: '填空题', color: 'orange' },
                          short: { label: '简答题', color: 'red' },
                          coding: { label: '编程题', color: 'slate' },
                        };
                        const typeInfo = typeMap[question.type || 'single'] || typeMap.single;
                        return (
                          <span className={`px-2 py-1 bg-${typeInfo.color}-100 text-${typeInfo.color}-700 rounded text-xs font-medium`}>
                            {typeInfo.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {question.subjectCode?.name || question.subjectCode || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 rounded text-sm">
                        难度{question.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {question.bankId?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/questions/${question._id}/detail`)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          查看
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => navigate(`/questions/${question._id}/edit`)}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(question._id, question.content)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              删除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* 分页 */}
          {meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                共 {meta.total} 道题目，第 {meta.page} / {meta.totalPages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={meta.page <= 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={meta.page >= meta.totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

