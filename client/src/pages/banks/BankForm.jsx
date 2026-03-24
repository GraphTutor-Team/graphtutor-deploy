/**
 * GraphTutor V3.0 - 题库表单组件
 * 
 * 功能：创建或编辑题库，支持学科分类目录和权限设置
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createBank, updateBank, getBank } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';
import { getGroups } from '../../api/v3/groups';
import SubjectSelector from '../../components/common/SubjectSelector';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/PageHeader';

export default function BankForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    subjectCode: '',
    description: '',
    isPublic: true,
    source: 'manual', // manual: 手动创建, import: 导入, official: 官方
    groupId: '', // 关联群组
    settings: {
      difficultyRange: [1, 2, 3, 4, 5],
      questionTypes: ['single'],
      aiEnabled: false,
    },
  });

  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [canEditPermissions, setCanEditPermissions] = useState(false);

  useEffect(() => {
    loadSubjects();
    loadGroups();
    if (isEdit) {
      loadBank();
    } else {
      // 新建时，根据用户角色设置默认权限
      if (user?.role === 'admin') {
        setCanEditPermissions(true);
      }
    }
  }, [id, user]);

  const loadSubjects = async () => {
    try {
      const tree = await getSubjectTree();
      setSubjects(tree);
    } catch (error) {
      console.error('加载学科列表失败:', error);
      toast.error('加载学科列表失败');
    }
  };

  const loadGroups = async () => {
    try {
      const groupsData = await getGroups({ status: 'active' });
      setGroups(groupsData || []);
    } catch (error) {
      console.error('加载群组列表失败:', error);
      // 不显示错误，因为群组是可选的
    }
  };

  const loadBank = async () => {
    try {
      setLoading(true);
      const bank = await getBank(id);
      
      // 检查权限：管理员可以编辑所有，其他用户只能编辑自己的
      const isOwner = bank.ownerId?._id === user?._id || bank.ownerId === user?._id;
      const isAdmin = user?.role === 'admin';
      const canEdit = isAdmin || isOwner;
      
      if (!canEdit) {
        toast.error('您没有权限编辑此题库');
        navigate('/banks');
        return;
      }

      setCanEditPermissions(isAdmin);
      
      setFormData({
        name: bank.name || '',
        subjectCode: bank.subjectCode?.code || bank.subjectCode || '',
        description: bank.description || '',
        isPublic: bank.isPublic ?? true,
        source: bank.source || 'manual',
        groupId: bank.groupId?._id || bank.groupId || '',
        settings: bank.settings || {
          difficultyRange: [1, 2, 3, 4, 5],
          questionTypes: ['single'],
          aiEnabled: false,
        },
      });
    } catch (err) {
      setError(err.message || '加载题库失败');
      toast.error('加载题库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // 验证学科（建议必选，但不强制）
    if (!formData.subjectCode) {
      const confirm = window.confirm('未选择学科，题库将无法按学科分类。是否继续？');
      if (!confirm) {
        setSubmitting(false);
        return;
      }
    }

    try {
      if (isEdit) {
        await updateBank(id, formData);
        toast.success('题库更新成功');
      } else {
        await createBank(formData);
        toast.success('题库创建成功');
      }
      navigate('/banks');
    } catch (err) {
      setError(err.message || '保存失败');
      toast.error(err.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    if (field.startsWith('settings.')) {
      const settingKey = field.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingKey]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // 获取所有学科（扁平化树形结构）
  const getAllSubjects = (subjects, result = []) => {
    subjects.forEach((subject) => {
      result.push(subject);
      if (subject.children && subject.children.length > 0) {
        getAllSubjects(subject.children, result);
      }
    });
    return result;
  };

  const allSubjects = getAllSubjects(subjects);

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title={isEdit ? '编辑题库' : '创建题库'} />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={isEdit ? '编辑题库' : '创建题库'}
        subtitle={isEdit ? '修改题库信息和设置' : '创建一个新的题库，支持学科分类和权限管理'}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* 基本信息 */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">基本信息</h2>
          
          <div className="space-y-4">
            {/* 题库名称 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                题库名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入题库名称，如：计算机科学-官方题库"
              />
            </div>

            {/* 学科分类（树形选择） */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                所属学科分类 <span className="text-blue-500">（建议选择）</span>
              </label>
              <div className="mb-2">
                <select
                  value={formData.subjectCode}
                  onChange={(e) => handleChange('subjectCode', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不选择学科（不推荐）</option>
                  {allSubjects.map((subject) => {
                    const indent = '  '.repeat(subject.level - 1);
                    return (
                      <option key={subject.code} value={subject.code}>
                        {indent}{subject.icon || '📚'} {subject.name} ({subject.code})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="text-xs text-slate-500">
                💡 提示：选择学科后，题库将归类到对应的学科目录下，便于管理和查找。
                例如：计算机科学 → 数据结构 → 官方题库
              </div>
            </div>

            {/* 题库来源 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                题库来源
              </label>
              <select
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">手动创建</option>
                <option value="import">导入创建</option>
                <option value="official">官方题库</option>
              </select>
              <div className="text-xs text-slate-500 mt-1">
                用于标识题库的创建方式，便于分类管理
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入题库描述（可选），例如：包含操作系统基础知识的官方题库"
              />
            </div>
          </div>
        </div>

        {/* 权限设置 */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">权限设置</h2>
          
          <div className="space-y-4">
            {/* 公开性 */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => handleChange('isPublic', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">公开题库（所有用户可见）</span>
              </label>
              <div className="text-xs text-slate-500 mt-1 ml-6">
                公开题库：所有用户都可以查看和使用
                私有题库：只有创建者和管理员可以访问
              </div>
            </div>

            {/* 权限说明 */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-blue-900 mb-2">权限说明：</div>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>管理员</strong>：可以管理所有题库（创建、编辑、删除）</li>
                <li><strong>出题负责人</strong>：只能管理自己创建的题库</li>
                <li><strong>学习者</strong>：只能管理自己创建的题库，且只能查看公开题库</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 高级设置 */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-bold mb-4">高级设置</h2>

          <div className="space-y-4">
            {/* AI启用 */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.settings.aiEnabled}
                  onChange={(e) =>
                    handleChange('settings.aiEnabled', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">启用AI生成题目</span>
              </label>
              <div className="text-xs text-slate-500 mt-1 ml-6">
                启用后，可以使用AI辅助生成题目
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/banks')}
            className="px-6 py-2 border rounded-lg hover:bg-slate-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
