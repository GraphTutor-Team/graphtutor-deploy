/**
 * GraphTutor V3.0 - 学科树形组件
 * 
 * 功能：可复用的学科树形选择器组件
 */

import { useState, useEffect } from 'react';
import { getSubjectTree } from '../../api/v3/subjects';

export default function SubjectTree({
  value = '',
  onChange,
  showSelect = true,
  showExpand = true,
  onSelect,
  className = '',
}) {
  const [subjects, setSubjects] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await getSubjectTree();
      setSubjects(data || []);
    } catch (err) {
      console.error('加载学科树失败:', err);
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

  const handleSelect = (subject) => {
    if (onChange) {
      onChange(subject.code);
    }
    if (onSelect) {
      onSelect(subject);
    }
  };

  const renderNode = (subject, level = 0) => {
    const hasChildren = subject.children && subject.children.length > 0;
    const isExpanded = expandedNodes.has(subject._id);
    const isSelected = value === subject.code;

    return (
      <div key={subject._id}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-50 ${
            isSelected ? 'bg-blue-50 border border-blue-500' : ''
          } ${className}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => showSelect && handleSelect(subject)}
        >
          {showExpand && hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(subject._id);
              }}
              className="w-5 h-5 flex items-center justify-center hover:bg-slate-200 rounded text-xs"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {showExpand && !hasChildren && <div className="w-5" />}
          <span>{subject.icon || '📚'}</span>
          <span className="flex-1">{subject.name}</span>
          {showSelect && isSelected && (
            <span className="text-blue-600">✓</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {subject.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-sm text-slate-500">加载中...</div>;
  }

  if (subjects.length === 0) {
    return <div className="text-sm text-slate-500">暂无学科数据</div>;
  }

  return (
    <div className="border rounded-lg p-2 max-h-96 overflow-y-auto">
      {subjects.map((subject) => renderNode(subject))}
    </div>
  );
}

