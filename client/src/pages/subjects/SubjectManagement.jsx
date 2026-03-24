/**
 * GraphTutor V3.0 - 学科管理页面
 * 
 * 功能：管理学科分类树，创建、编辑、删除学科，支持树形结构展示
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getSubjectTree,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../../api/v3/subjects';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/PageHeader';

export default function SubjectManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level: 1,
    parentId: '',
    description: '',
    color: '#3B82F6',
    icon: '📚',
    order: 0,
  });

  const canManage = user?.role === 'admin' || user?.role === 'question_manager';

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSubjectTree();
      setSubjects(data || []);
      // 默认展开第一级
      if (data && data.length > 0) {
        const firstLevelIds = data.map(s => s._id || s.code);
        setExpandedNodes(new Set(firstLevelIds));
      }
    } catch (err) {
      console.error('加载学科列表失败:', err);
      setError(err.message || '加载学科列表失败');
      toast.error('加载学科列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (id) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleEdit = async (subject) => {
    try {
      const subjectData = await getSubject(subject.code);
      setFormData({
        code: subjectData.code,
        name: subjectData.name,
        level: subjectData.level,
        parentId: subjectData.parentId?._id || subjectData.parentId || '',
        description: subjectData.description || '',
        color: subjectData.color || '#3B82F6',
        icon: subjectData.icon || '📚',
        order: subjectData.order || 0,
      });
      setEditingId(subject.code);
      setShowForm(true);
    } catch (err) {
      toast.error(err.message || '加载学科信息失败');
    }
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`确定要删除学科"${subject.name}"吗？\n\n注意：删除学科可能会影响已关联的题目和题库。此操作不可恢复。`)) {
      return;
    }

    try {
      await deleteSubject(subject.code);
      toast.success('学科删除成功');
      loadSubjects();
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');

      if (editingId) {
        await updateSubject(editingId, {
          name: formData.name,
          level: formData.level,
          parentId: formData.parentId || null,
          description: formData.description,
          color: formData.color,
          icon: formData.icon,
          order: formData.order,
        });
        toast.success('学科更新成功');
      } else {
        await createSubject(formData);
        toast.success('学科创建成功');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        code: '',
        name: '',
        level: 1,
        parentId: '',
        description: '',
        color: '#3B82F6',
        icon: '📚',
        order: 0,
      });
      loadSubjects();
    } catch (err) {
      setError(err.message || '保存失败');
      toast.error(err.message || '保存失败');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      code: '',
      name: '',
      level: 1,
      parentId: '',
      description: '',
      color: '#3B82F6',
      icon: '📚',
      order: 0,
    });
  };

  const renderSubjectNode = (subject, level = 0) => {
    const hasChildren = subject.children && subject.children.length > 0;
    const isExpanded = expandedNodes.has(subject._id || subject.code);

    return (
      <div key={subject._id || subject.code} className="select-none">
        <div
          className={`flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg border border-slate-200 mb-1 ${
            level > 0 ? 'ml-6' : ''
          }`}
          style={{ 
            paddingLeft: `${level * 24 + 12}px`,
            borderLeftColor: subject.color || '#3B82F6',
            borderLeftWidth: '4px',
          }}
        >
          {hasChildren && (
            <button
              onClick={() => handleToggleExpand(subject._id || subject.code)}
              className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <span className="text-lg">{subject.icon || '📚'}</span>
          <span className="font-medium text-slate-900">{subject.name}</span>
          <span className="text-xs text-slate-500 font-mono">({subject.code})</span>
          {subject.description && (
            <span className="text-xs text-slate-400 ml-2">
              - {subject.description}
            </span>
          )}
          {canManage && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    parentId: subject._id || subject.code,
                    level: (subject.level || 1) + 1,
                  }));
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                添加子学科
              </button>
              <button
                onClick={() => handleEdit(subject)}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(subject)}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                删除
              </button>
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {subject.children.map((child) => renderSubjectNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 获取所有学科用于父学科选择（扁平化）
  const getAllSubjects = (subjects, result = []) => {
    subjects.forEach((subject) => {
      result.push(subject);
      if (subject.children) {
        getAllSubjects(subject.children, result);
      }
    });
    return result;
  };

  const allSubjects = getAllSubjects(subjects);

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="学科管理" desc="加载中..." />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="学科管理"
        desc="管理学科分类树形结构，支持多级分类"
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {subjects.length > 0 && (
            <span>共 {allSubjects.length} 个学科</span>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                code: '',
                name: '',
                level: 1,
                parentId: '',
                description: '',
                color: '#3B82F6',
                icon: '📚',
                order: 0,
              });
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 创建学科
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* 使用说明 */}
      {canManage && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold text-blue-900 mb-2">使用说明：</div>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>学科采用树形结构，支持多级分类（如：计算机科学 → 数据结构 → 线性表）</li>
            <li>创建题库和题目时，必须选择对应的学科分类</li>
            <li>学科代码建议使用大写字母和连字符（如：CS-DS-LIST）</li>
            <li>删除学科前，请确保没有题目或题库关联到此学科</li>
          </ul>
        </div>
      )}

      {/* 学科树 */}
      <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
        {subjects.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-4">📚</div>
            <div className="text-lg font-semibold mb-2">暂无学科数据</div>
            {canManage && (
              <div className="mt-4">
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  创建第一个学科
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {subjects.map((subject) => renderSubjectNode(subject))}
          </div>
        )}
      </div>

      {/* 创建/编辑表单 */}
      {showForm && canManage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? '编辑学科' : '创建学科'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    学科代码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                    required
                    disabled={!!editingId}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    placeholder="如：CS-DS-LIST"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    只能包含大写字母、数字和连字符，创建后不可修改
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    学科名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如：线性表"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    层级
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    自动根据父学科计算，也可手动设置
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    父学科
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">无（顶级学科）</option>
                    {allSubjects
                      .filter((s) => !editingId || (s._id !== editingId && s.code !== editingId))
                      .map((subject) => {
                        const indent = '  '.repeat((subject.level || 1) - 1);
                        return (
                          <option key={subject._id || subject.code} value={subject._id || subject.code}>
                            {indent}{subject.icon || '📚'} {subject.name} ({subject.code})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    颜色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-16 h-10 border rounded-lg"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    图标
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如：📚、💻、🔬"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    支持emoji表情符号
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    排序
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    数字越小越靠前
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="学科描述（可选）"
                />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 border rounded-lg hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
