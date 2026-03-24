/**
 * GraphTutor V3.0 - 导出配置模态框组件
 * 
 * 作用：配置用户数据导出，支持选择导出格式（CSV/Excel/JSON/PDF）和自定义字段，支持保存/加载导出模板
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，使用此组件)
 *   - hooks/useUserManagement.js (导出业务逻辑)
 *   - utils/export.js (导出工具)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - LocalStorage (保存导出模板)
 *   - 多选框组件
 *   - 下拉菜单组件
 */

import { useState, useEffect } from 'react';
import { toast } from '../../../utils/toast';

// 可导出的字段定义
const AVAILABLE_FIELDS = [
  { key: 'email', label: '邮箱', default: true },
  { key: 'name', label: '姓名', default: true },
  { key: 'role', label: '角色', default: true },
  { key: 'createdAt', label: '注册时间', default: true },
  { key: 'lastLogin', label: '最后登录', default: false },
  { key: 'school', label: '学校', default: false },
  { key: 'major', label: '专业', default: false },
  { key: 'grade', label: '年级', default: false },
  { key: 'studentId', label: '学号', default: false },
  { key: 'bio', label: '个人简介', default: false },
];

// 导出格式
const EXPORT_FORMATS = [
  { key: 'csv', label: 'CSV', icon: '📄' },
  { key: 'excel', label: 'Excel', icon: '📊' },
  { key: 'json', label: 'JSON', icon: '📋' },
  { key: 'pdf', label: 'PDF', icon: '📑' },
];

export default function ExportConfigModal({ open, onClose, onExport, defaultFields = null }) {
  const [selectedFields, setSelectedFields] = useState(
    defaultFields || AVAILABLE_FIELDS.filter(f => f.default).map(f => f.key)
  );
  const [format, setFormat] = useState('csv');
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = () => {
    try {
      const templates = JSON.parse(localStorage.getItem('exportTemplates') || '[]');
      setSavedTemplates(templates);
    } catch (err) {
      console.error('加载导出模板失败:', err);
    }
  };

  const handleFieldToggle = (fieldKey) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleSelectAll = () => {
    if (selectedFields.length === AVAILABLE_FIELDS.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(AVAILABLE_FIELDS.map(f => f.key));
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('请输入模板名称');
      return;
    }

    if (selectedFields.length === 0) {
      toast.error('请至少选择一个字段');
      return;
    }

    try {
      const templates = JSON.parse(localStorage.getItem('exportTemplates') || '[]');
      const newTemplate = {
        id: Date.now().toString(),
        name: templateName.trim(),
        fields: selectedFields,
        format,
        createdAt: new Date().toISOString(),
      };
      templates.push(newTemplate);
      localStorage.setItem('exportTemplates', JSON.stringify(templates));
      toast.success('模板保存成功');
      setTemplateName('');
      setShowSaveTemplate(false);
      loadTemplates();
    } catch (err) {
      console.error('保存模板失败:', err);
      toast.error('保存模板失败');
    }
  };

  const handleLoadTemplate = (template) => {
    setSelectedFields(template.fields);
    setFormat(template.format);
    setShowSaveTemplate(false);
    toast.success(`已加载模板: ${template.name}`);
  };

  const handleDeleteTemplate = (templateId) => {
    if (!confirm('确定删除此模板吗？')) return;

    try {
      const templates = JSON.parse(localStorage.getItem('exportTemplates') || '[]');
      const filtered = templates.filter(t => t.id !== templateId);
      localStorage.setItem('exportTemplates', JSON.stringify(filtered));
      toast.success('模板删除成功');
      loadTemplates();
    } catch (err) {
      console.error('删除模板失败:', err);
      toast.error('删除模板失败');
    }
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      toast.error('请至少选择一个字段');
      return;
    }

    onExport({
      fields: selectedFields,
      format,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">导出配置</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* 导出格式选择 */}
          <div>
            <label className="block text-sm font-semibold mb-3">导出格式</label>
            <div className="grid grid-cols-4 gap-3">
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt.key}
                  type="button"
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    format === fmt.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setFormat(fmt.key)}
                >
                  <div className="text-2xl mb-1">{fmt.icon}</div>
                  <div className="text-xs font-medium">{fmt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 字段选择 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold">选择导出字段</label>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={handleSelectAll}
              >
                {selectedFields.length === AVAILABLE_FIELDS.length ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg">
              {AVAILABLE_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => handleFieldToggle(field.key)}
                    className="rounded"
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              已选择 {selectedFields.length} / {AVAILABLE_FIELDS.length} 个字段
            </div>
          </div>

          {/* 模板管理 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold">导出模板</label>
              <button
                type="button"
                className="btn btn-xs btn-primary"
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
              >
                {showSaveTemplate ? '取消保存' : '保存为模板'}
              </button>
            </div>

            {showSaveTemplate && (
              <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                  placeholder="输入模板名称"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary w-full"
                  onClick={handleSaveTemplate}
                >
                  保存模板
                </button>
              </div>
            )}

            {savedTemplates.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{template.name}</div>
                      <div className="text-xs text-slate-500">
                        {template.fields.length} 个字段 · {EXPORT_FORMATS.find(f => f.key === template.format)?.label}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        加载
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-red-600"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {savedTemplates.length === 0 && !showSaveTemplate && (
              <div className="text-sm text-slate-400 text-center py-4">
                暂无保存的模板
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExport}
              disabled={selectedFields.length === 0}
            >
              导出 ({selectedFields.length} 个字段)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

