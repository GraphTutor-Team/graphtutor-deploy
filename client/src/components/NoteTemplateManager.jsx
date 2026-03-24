/**
 * GraphTutor V3.0 - 笔记模板管理组件
 * 
 * 功能：管理自定义笔记模板
 */

import { useState, useEffect } from 'react';
import { 
  getAllTemplates, 
  getAllTemplatesWithCustom, 
  saveCustomTemplate, 
  deleteCustomTemplate,
  getPopularTemplates,
  recordTemplateUsage,
} from '../utils/noteTemplates';
import { toast } from '../utils/toast';
import { Badge } from './common';

export default function NoteTemplateManager({ 
  onSelectTemplate, 
  onClose,
  currentType = null,
  showPopular = true,
}) {
  const [templates, setTemplates] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [popularTemplates, setPopularTemplates] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // all, builtin, custom
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    key: '',
    name: '',
    type: 'knowledge',
    title: '',
    content: '',
    description: '',
    category: '',
    tags: [],
  });

  useEffect(() => {
    loadTemplates();
  }, [currentType]);

  const loadTemplates = () => {
    const allTemplates = getAllTemplatesWithCustom();
    const builtIn = getAllTemplates();
    const custom = allTemplates.filter(t => !builtIn.find(bt => bt.key === t.key));
    
    setTemplates(allTemplates);
    setCustomTemplates(custom);
    
    if (showPopular) {
      setPopularTemplates(getPopularTemplates(5));
    }
  };

  const filteredTemplates = templates.filter(template => {
    // 类型过滤
    if (currentType && template.type !== currentType) {
      return false;
    }
    
    // 分类过滤
    if (selectedCategory === 'builtin') {
      const builtIn = getAllTemplates();
      if (!builtIn.find(bt => bt.key === template.key)) {
        return false;
      }
    } else if (selectedCategory === 'custom') {
      const builtIn = getAllTemplates();
      if (builtIn.find(bt => bt.key === template.key)) {
        return false;
      }
    }
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        template.name?.toLowerCase().includes(keyword) ||
        template.title?.toLowerCase().includes(keyword) ||
        template.description?.toLowerCase().includes(keyword) ||
        template.content?.toLowerCase().includes(keyword)
      );
    }
    
    return true;
  });

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      key: '',
      name: '',
      type: currentType || 'knowledge',
      title: '',
      content: '',
      description: '',
      category: '',
      tags: [],
    });
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      key: template.key,
      name: template.name,
      type: template.type,
      title: template.title,
      content: template.content,
      description: template.description || '',
      category: template.category || '',
      tags: template.tags || [],
    });
    setShowCreateModal(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.title || !templateForm.content) {
      toast.warning('请填写模板名称、标题和内容');
      return;
    }

    const templateKey = editingTemplate?.key || `custom_${Date.now()}`;
    const template = {
      key: templateKey,
      name: templateForm.name,
      type: templateForm.type,
      title: templateForm.title,
      content: templateForm.content,
      description: templateForm.description,
      category: templateForm.category,
      tags: templateForm.tags,
    };

    if (saveCustomTemplate(template)) {
      toast.success(editingTemplate ? '模板更新成功' : '模板创建成功');
      setShowCreateModal(false);
      loadTemplates();
    } else {
      toast.error('保存模板失败');
    }
  };

  const handleDeleteTemplate = (templateKey) => {
    if (!window.confirm('确定要删除此模板吗？')) {
      return;
    }

    if (deleteCustomTemplate(templateKey)) {
      toast.success('模板删除成功');
      loadTemplates();
    } else {
      toast.error('删除模板失败');
    }
  };

  const handleSelectTemplate = (template) => {
    recordTemplateUsage(template.key);
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          笔记模板库
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCreateTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 创建模板
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              关闭
            </button>
          )}
        </div>
      </div>

      {/* 热门模板 */}
      {showPopular && popularTemplates.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            🔥 热门模板
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {popularTemplates.map(template => (
              <div
                key={template.key}
                onClick={() => handleSelectTemplate(template)}
                className="p-3 border rounded-lg hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {template.name}
                  </span>
                  <Badge variant={template.type === 'question' ? 'primary' : 'success'}>
                    {template.type === 'question' ? '题目' : '知识点'}
                  </Badge>
                </div>
                {template.description && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    {template.description}
                  </div>
                )}
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  使用 {template.usageCount || 0} 次
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          placeholder="搜索模板..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm rounded-lg ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setSelectedCategory('builtin')}
            className={`px-3 py-1 text-sm rounded-lg ${
              selectedCategory === 'builtin'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            内置模板
          </button>
          <button
            onClick={() => setSelectedCategory('custom')}
            className={`px-3 py-1 text-sm rounded-lg ${
              selectedCategory === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            我的模板
          </button>
        </div>
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map(template => {
          const isCustom = !getAllTemplates().find(bt => bt.key === template.key);
          return (
            <div
              key={template.key}
              className="border dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {template.name}
                    </span>
                    <Badge variant={template.type === 'question' ? 'primary' : 'success'}>
                      {template.type === 'question' ? '题目' : '知识点'}
                    </Badge>
                    {isCustom && (
                      <Badge variant="secondary">自定义</Badge>
                    )}
                  </div>
                  {template.description && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {template.description}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 dark:text-slate-500 mb-2 line-clamp-2">
                    {template.content?.substring(0, 100)}...
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSelectTemplate(template)}
                  className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  使用
                </button>
                {isCustom && (
                  <>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.key)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          {searchKeyword ? '未找到匹配的模板' : '暂无模板'}
        </div>
      )}

      {/* 创建/编辑模板弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100">
              {editingTemplate ? '编辑模板' : '创建模板'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  模板名称 *
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
                  placeholder="例如：数学公式笔记模板"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    笔记类型 *
                  </label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="question">题目笔记</option>
                    <option value="knowledge">知识点笔记</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    默认标题 *
                  </label>
                  <input
                    type="text"
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
                    placeholder="例如：数学公式笔记"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  模板描述
                </label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
                  placeholder="简短描述模板用途"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  模板内容 *（支持Markdown和变量）
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
                  rows="12"
                  placeholder={`例如：
## 标题

内容...

支持的变量：
- {date} - 当前日期
- {questionId} - 题目ID
- {knowledgeNodeId} - 知识点ID`}
                />
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  提示：使用 {'{变量名}'} 来插入动态内容
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

