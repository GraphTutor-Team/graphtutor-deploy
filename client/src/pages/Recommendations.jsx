/**
 * GraphTutor V3.0 - 智能推荐页面
 * 
 * 功能：显示智能推荐的题目
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRecommendedQuestions } from '../api/v3/recommendations';
import { getSubjectTree } from '../api/v3/subjects';
import { getBanks } from '../api/v3/questionBanks';
import { toast } from '../utils/toast';
import { usePageAI } from '../hooks/usePageAI';

export default function Recommendations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const strategyFromQuery = new URLSearchParams(location.search).get('strategy');
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);

  const recommendBrief = useMemo(() => {
    const stems = questions
      .slice(0, 5)
      .map((q) => String(q.content || '').replace(/\s+/g, ' ').slice(0, 40))
      .filter(Boolean);
    return `页面：智能推荐。当前推荐：${stems.join('；') || '暂无'}`;
  }, [questions]);

  usePageAI({ pageType: 'recommendations', brief: recommendBrief });
  const [subjects, setSubjects] = useState([]);
  const [banks, setBanks] = useState([]);

  // 筛选条件
  const [filters, setFilters] = useState({
    strategy: strategyFromQuery === 'weak_points' || strategyFromQuery === 'goal_based' ? strategyFromQuery : 'adaptive',
    subjectCode: '',
    bankId: '',
    limit: 10,
  });

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user, filters]);

  const loadOptions = async () => {
    try {
      const [subjectsData, banksData] = await Promise.all([
        getSubjectTree().catch(() => []),
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setSubjects(subjectsData || []);
      setBanks(banksData.data || []);
    } catch (err) {
      console.error('加载选项数据失败:', err);
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await getRecommendedQuestions(filters);
      setQuestions(data);
    } catch (err) {
      console.error('加载推荐题目失败:', err);
      toast.error('加载推荐题目失败');
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

  const getTypeLabel = (type) => {
    const labels = {
      single: '单选题',
      multiple: '多选题',
      judge: '判断题',
      fill: '填空题',
      short: '简答题',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      single: 'bg-blue-100 text-blue-800',
      multiple: 'bg-slate-100 text-slate-800',
      judge: 'bg-green-100 text-green-800',
      fill: 'bg-yellow-100 text-yellow-800',
      short: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">智能推荐</h1>
        <p className="text-slate-600">基于你的学习数据，为你推荐最适合的练习题目</p>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">推荐策略：</label>
            <select
              value={filters.strategy}
              onChange={(e) => handleFilterChange('strategy', e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="adaptive">自适应推荐</option>
              <option value="weak_points">薄弱知识点</option>
              <option value="goal_based">基于学习目标</option>
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

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">题库：</label>
            <select
              value={filters.bankId}
              onChange={(e) => handleFilterChange('bankId', e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm min-w-[200px]"
            >
              <option value="">全部题库</option>
              {banks.map((bank) => (
                <option key={bank._id} value={bank._id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">数量：</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value, 10))}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value={5}>5道</option>
              <option value={10}>10道</option>
              <option value={20}>20道</option>
              <option value={30}>30道</option>
            </select>
          </div>

          <button
            onClick={loadRecommendations}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            刷新推荐
          </button>
        </div>
      </div>

      {/* 推荐题目列表 */}
      {questions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border text-center">
          <div className="text-4xl mb-4">📚</div>
          <div className="text-lg font-semibold text-slate-900 mb-2">暂无推荐题目</div>
          <div className="text-sm text-slate-600 mb-4">
            可能的原因：你已经完成了所有相关题目，或者当前筛选条件下没有可用题目
          </div>
          <button
            onClick={() => navigate('/quiz')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            去练习
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question._id || question.id || index}
              className="bg-white p-6 rounded-lg border hover:border-blue-300  transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(question.type || 'single')}`}>
                      {getTypeLabel(question.type || 'single')}
                    </span>
                    {question.difficulty && (
                      <span className="text-xs text-slate-500">
                        难度：{question.difficulty}
                      </span>
                    )}
                    {question.recommendationReason && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        💡 {question.recommendationReason}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {question.content || '（无题干）'}
                  </h3>
                  {question.knowledgeNodeId && (
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:underline mb-2"
                      onClick={() => navigate(`/quiz?knowledgeNodeId=${encodeURIComponent(question.knowledgeNodeId)}&nodeName=${encodeURIComponent(question.knowledgeNodeName || question.knowledgeNodeId)}`)}
                    >
                      知识点：{question.knowledgeNodeName || question.knowledgeNodeId}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {question.subjectCode && (
                    <span className="text-xs text-slate-500">
                      学科：{question.subjectCode}
                    </span>
                  )}
                  {question.bankId && (
                    <span className="text-xs text-slate-500">
                      题库：{question.bankId?.name || question.bankId}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/questions/${question._id || question.id}/detail`)}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => {
                      navigate('/quiz', {
                        state: {
                          questionIds: [question._id || question.id],
                          practiceSource: 'ai',
                        },
                      });
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    开始练习
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 快速操作 */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            找到 {questions.length} 道推荐题目
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (questions.length > 0) {
                  const questionIds = questions.map(q => q._id || q.id).filter(Boolean);
                  navigate('/quiz', {
                    state: { questionIds, practiceSource: 'ai' },
                  });
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              disabled={questions.length === 0}
            >
              练习全部推荐题目
            </button>
            <button
              onClick={() => navigate('/exam')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              开始考试
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

