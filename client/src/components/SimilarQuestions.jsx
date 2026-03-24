/**
 * GraphTutor V3.0 - 相似题推荐组件
 * 
 * 功能：显示与当前错题相似的题目
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { findSimilarQuestions } from '../api/v3/questions';
import { toast } from '../utils/toast';

export default function SimilarQuestions({ questionId, knowledgeNodeId, subjectCode }) {
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (questionId) {
      loadSimilarQuestions();
    }
  }, [questionId]);

  const loadSimilarQuestions = async () => {
    if (!questionId) return;
    
    try {
      setLoading(true);
      const questions = await findSimilarQuestions(questionId, 5);
      setSimilarQuestions(questions || []);
    } catch (err) {
      console.error('加载相似题失败:', err);
      // 不显示错误提示，因为这是可选功能
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
        <div className="text-sm text-slate-600">加载相似题中...</div>
      </div>
    );
  }

  if (similarQuestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="text-sm font-semibold text-blue-900 mb-2">
        💡 相似题目推荐（{similarQuestions.length} 道）
      </div>
      <div className="space-y-2">
        {similarQuestions.map((q, idx) => (
          <div
            key={q._id || q.id || idx}
            className="p-2 bg-white rounded border border-blue-200 hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-slate-700 line-clamp-2">
                  {q.content || q.title || '题目内容'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  难度: {q.difficulty || '未知'} | 
                  知识点: {q.knowledgeNodeId || knowledgeNodeId || '未标注'}
                </div>
              </div>
              {q._id && (
                <Link
                  to={`/questions/${q._id}/detail`}
                  className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  查看
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-blue-700">
        提示：练习相似题目有助于巩固知识点
      </div>
    </div>
  );
}

