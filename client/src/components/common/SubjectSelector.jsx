/**
 * GraphTutor V3.0 - 学科选择器组件
 * 
 * 功能：支持单选/多选学科，树形结构展示
 */

import { useState, useEffect } from 'react';
import { getSubjectTree } from '../../api/v3/subjects';

/**
 * 学科选择器
 * @param {Object} props
 * @param {string|Array} props.value - 选中的学科代码（单选为string，多选为Array）
 * @param {Function} props.onChange - 选择变化回调
 * @param {boolean} props.multiple - 是否多选（默认false）
 * @param {boolean} props.showTree - 是否显示树形结构（默认true）
 * @param {string} props.placeholder - 占位符
 */
export default function SubjectSelector({
  value,
  onChange,
  multiple = false,
  showTree = true,
  placeholder = '请选择学科',
}) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(
    multiple ? (Array.isArray(value) ? new Set(value) : new Set()) : value || ''
  );

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (multiple) {
      setSelected(Array.isArray(value) ? new Set(value) : new Set());
    } else {
      setSelected(value || '');
    }
  }, [value, multiple]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const tree = await getSubjectTree();
      setSubjects(tree);
      // 默认展开第一级
      if (tree.length > 0) {
        setExpanded(new Set(tree.map((s) => s.code)));
      }
    } catch (error) {
      console.error('加载学科列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (code) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpanded(newExpanded);
  };

  const handleSelect = (code) => {
    if (multiple) {
      const newSelected = new Set(selected);
      if (newSelected.has(code)) {
        newSelected.delete(code);
      } else {
        newSelected.add(code);
      }
      setSelected(newSelected);
      onChange?.(Array.from(newSelected));
    } else {
      setSelected(code);
      onChange?.(code);
    }
  };

  const renderSubject = (subject, level = 0) => {
    const hasChildren = subject.children && subject.children.length > 0;
    const isExpanded = expanded.has(subject.code);
    const isSelected = multiple
      ? selected.has(subject.code)
      : selected === subject.code;

    return (
      <div key={subject.code} className="select-none">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-100 cursor-pointer ${
            isSelected ? 'bg-blue-50 text-blue-600' : ''
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          onClick={() => handleSelect(subject.code)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(subject.code);
              }}
              className="w-4 h-4 flex items-center justify-center"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          <span className="mr-2">{subject.icon || '📚'}</span>
          <span className="flex-1">{subject.name}</span>
          {isSelected && (
            <span className="text-blue-600">✓</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {subject.children.map((child) => renderSubject(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="border rounded p-4 text-center text-slate-500">
        加载学科列表...
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="border rounded p-4 text-center text-slate-500">
        暂无学科数据
      </div>
    );
  }

  return (
    <div className="border rounded bg-white max-h-64 overflow-y-auto">
      {subjects.map((subject) => renderSubject(subject))}
    </div>
  );
}

