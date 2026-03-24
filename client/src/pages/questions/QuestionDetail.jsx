/**
 * GraphTutor V3.0 - 题目详情页面
 * 
 * 功能：查看题目详细信息、版本历史、相关题目
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAIContext } from '../../context/AIContext';
import { getQuestion, getQuestionVersions, restoreQuestionVersion } from '../../api/v3/questions';
import { getRecommendedQuestions } from '../../api/v3/recommendations';
import { checkFavorite, addFavorite, removeFavorite, getFavoriteFolders } from '../../api/v3/favorites';
import { getQuestionNote, createNote, updateNote, getNotes } from '../../api/v3/notes';
import { generateExplanation } from '../../api/v3/ai';
import { toast } from '../../utils/toast';
import MarkdownPreview from '../../components/MarkdownPreview';

export default function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAIContext } = useAIContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeTab, setActiveTab] = useState('detail'); // detail, versions, related, note
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteFolders, setFavoriteFolders] = useState([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const [loadingRelatedNotes, setLoadingRelatedNotes] = useState(false);
  const [questionNote, setQuestionNote] = useState(null);
  const [loadingNote, setLoadingNote] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    tags: [],
    isPublic: false,
  });
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainResult, setExplainResult] = useState('');

  useEffect(() => {
    loadQuestion();
    loadVersions();
    loadSimilarQuestions();
    loadFavoriteStatus();
    loadFavoriteFolders();
    loadQuestionNote();
  }, [id]);

  useEffect(() => {
    if (question && id) {
      setAIContext({
        questionId: id,
        knowledgeNodeId: question.knowledgeNodeId ?? question.knowledgeNode ?? null,
      });
    }
    return () => setAIContext({ questionId: null, knowledgeNodeId: null });
  }, [id, question?.knowledgeNodeId, question?.knowledgeNode, setAIContext]);

  useEffect(() => {
    if (!question?.knowledgeNodeId) return;
    let cancelled = false;
    setLoadingRelatedNotes(true);
    (async () => {
      try {
        const res = await getNotes({
          knowledgeNodeId: question.knowledgeNodeId,
          limit: 5,
        });
        const items = res?.data?.data?.items ?? res?.data?.items ?? [];
        if (!cancelled) setRelatedNotes(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setRelatedNotes([]);
      } finally {
        if (!cancelled) setLoadingRelatedNotes(false);
      }
    })();
    return () => { cancelled = true; };
  }, [question?.knowledgeNodeId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getQuestion(id);
      setQuestion(data);
    } catch (err) {
      console.error('加载题目失败:', err);
      setError(err.message || '加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const data = await getQuestionVersions(id);
      setVersions(data || []);
    } catch (err) {
      console.error('加载版本历史失败:', err);
    }
  };

  const loadSimilarQuestions = async () => {
    try {
      setLoadingSimilar(true);
      const data = await getRecommendedQuestions({
        strategy: 'similar',
        questionId: id,
        limit: 5,
      });
      setSimilarQuestions(data || []);
    } catch (err) {
      console.error('加载相似题目失败:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const loadFavoriteStatus = async () => {
    if (!user) return;
    try {
      const result = await checkFavorite(id);
      setIsFavorited(result.data.isFavorite);
      if (result.data.folders && result.data.folders.length > 0) {
        setSelectedFolderId(result.data.folders[0].folderId);
      }
    } catch (err) {
      console.error('加载收藏状态失败:', err);
    }
  };

  const loadFavoriteFolders = async () => {
    if (!user) return;
    try {
      const result = await getFavoriteFolders();
      setFavoriteFolders(result.data || []);
      if (result.data && result.data.length > 0 && !selectedFolderId) {
        const defaultFolder = result.data.find(f => f.isDefault) || result.data[0];
        setSelectedFolderId(defaultFolder._id);
      }
    } catch (err) {
      console.error('加载收藏夹失败:', err);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast('请先登录', 'warning');
      return;
    }

    if (isFavorited) {
      // 取消收藏
      if (!selectedFolderId) {
        toast('无法确定收藏夹', 'error');
        return;
      }
      try {
        setFavoriteLoading(true);
        await removeFavorite(id, selectedFolderId);
        setIsFavorited(false);
        toast('已取消收藏', 'success');
      } catch (err) {
        console.error('取消收藏失败:', err);
        toast(err.message || '取消收藏失败', 'error');
      } finally {
        setFavoriteLoading(false);
      }
    } else {
      // 显示收藏夹选择弹窗
      setShowFavoriteModal(true);
    }
  };

  const handleConfirmFavorite = async () => {
    if (!selectedFolderId) {
      toast('请选择收藏夹', 'warning');
      return;
    }
    try {
      setFavoriteLoading(true);
      await addFavorite({
        questionId: id,
        folderId: selectedFolderId,
      });
      setIsFavorited(true);
      setShowFavoriteModal(false);
      toast('收藏成功', 'success');
    } catch (err) {
      console.error('收藏失败:', err);
      if (err.response?.status === 409) {
        toast('题目已在此收藏夹中', 'warning');
      } else {
        toast(err.message || '收藏失败', 'error');
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  const loadQuestionNote = async () => {
    if (!user) return;
    try {
      setLoadingNote(true);
      const result = await getQuestionNote(id);
      if (result.data) {
        setQuestionNote(result.data);
        setNoteForm({
          title: result.data.title || '',
          content: result.data.content || '',
          tags: result.data.tags || [],
          isPublic: result.data.isPublic || false,
        });
      }
    } catch (err) {
      // 如果没有笔记，不显示错误
      if (err.response?.status !== 404) {
        console.error('加载笔记失败:', err);
      }
    } finally {
      setLoadingNote(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim()) {
      toast('请输入笔记标题', 'warning');
      return;
    }
    if (!noteForm.content.trim()) {
      toast('请输入笔记内容', 'warning');
      return;
    }
    try {
      if (questionNote) {
        await updateNote(questionNote._id, noteForm);
        toast('更新成功', 'success');
      } else {
        await createNote({
          type: 'question',
          questionId: id,
          ...noteForm,
        });
        toast('创建成功', 'success');
      }
      setShowNoteEditor(false);
      loadQuestionNote();
    } catch (err) {
      console.error('保存笔记失败:', err);
      toast(err.message || '保存笔记失败', 'error');
    }
  };

  const handleRestoreVersion = async (versionId) => {
    if (!window.confirm('确定要恢复到此版本吗？当前版本将被保存为新版本。')) {
      return;
    }

    try {
      await restoreQuestionVersion(id, versionId);
      alert('恢复成功');
      loadQuestion();
      loadVersions();
    } catch (err) {
      alert(err.message || '恢复失败');
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'question_manager';

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error || '题目不存在'}</div>
        <button
          onClick={() => navigate('/questions')}
          className="mt-4 px-4 py-2 border rounded-lg hover:bg-slate-50"
        >
          返回题目列表
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">题目详情</h1>
          <div className="flex gap-2">
            {user && (
              <>
                <button
                  onClick={handleFavorite}
                  disabled={favoriteLoading}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isFavorited
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isFavorited ? '取消收藏' : '收藏题目'}
                >
                  {favoriteLoading ? '...' : isFavorited ? '★ 已收藏' : '☆ 收藏'}
                </button>
                {showFavoriteModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                      <h3 className="text-lg font-bold mb-4">选择收藏夹</h3>
                      <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                        {favoriteFolders.map(folder => (
                          <label
                            key={folder._id}
                            className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                          >
                            <input
                              type="radio"
                              name="folder"
                              value={folder._id}
                              checked={selectedFolderId === folder._id}
                              onChange={(e) => setSelectedFolderId(e.target.value)}
                              className="mr-3"
                            />
                            <span className="mr-2">{folder.icon}</span>
                            <span className="flex-1">{folder.name}</span>
                            <span className="text-sm text-slate-500">
                              ({folder.questionCount || 0}题)
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowFavoriteModal(false)}
                          className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleConfirmFavorite}
                          disabled={favoriteLoading || !selectedFolderId}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          确认收藏
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {user && (
              <button
                onClick={async () => {
                  if (!question || explainLoading) return;
                  const opts = question.options || question.choices || [];
                  const ans = question.answerIndex ?? question.answer;
                  const answerIndex = typeof ans === 'number' ? ans : (Array.isArray(ans) ? ans[0] : 0);
                  setExplainLoading(true);
                  setExplainResult('');
                  try {
                    const explanation = await generateExplanation({
                      content: question.content,
                      options: opts,
                      answerIndex: Math.min(answerIndex, opts.length - 1),
                    });
                    setExplainResult(explanation);
                  } catch (err) {
                    toast.error(err.message || 'AI 讲解生成失败');
                  } finally {
                    setExplainLoading(false);
                  }
                }}
                disabled={explainLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {explainLoading ? '生成中…' : 'AI 讲解'}
              </button>
            )}
            {canManage && (
              <button
                onClick={() => navigate(`/questions/${id}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                编辑
              </button>
            )}
            <button
              onClick={() => navigate('/questions')}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50"
            >
              返回
            </button>
          </div>
        </div>
        {question.qid && (
          <p className="text-sm text-slate-600">题目ID: {question.qid}</p>
        )}
      </div>

      {/* 标签页 */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('detail')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'detail'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            题目内容
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'versions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            版本历史 ({versions.length})
          </button>
          <button
            onClick={() => setActiveTab('related')}
            className={`px-4 py-2 border-b-2 ${
              activeTab === 'related'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600'
            }`}
          >
            相似题目 ({similarQuestions.length})
          </button>
          {question?.knowledgeNodeId && (
            <button
              onClick={() => setActiveTab('related_notes')}
              className={`px-4 py-2 border-b-2 ${
                activeTab === 'related_notes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600'
              }`}
            >
              相关笔记 ({relatedNotes.length})
            </button>
          )}
          {user && (
            <button
              onClick={() => setActiveTab('note')}
              className={`px-4 py-2 border-b-2 ${
                activeTab === 'note'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600'
              }`}
            >
              我的笔记 {questionNote ? '✓' : ''}
            </button>
          )}
        </div>
      </div>

      {/* 题目内容标签页 */}
      {activeTab === 'detail' && (
        <div className="space-y-6">
          {/* 题干 */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-bold mb-4">题干</h2>
            <div className="text-slate-800 whitespace-pre-wrap">{question.content}</div>
          </div>

          {/* 选项/答案（根据题型显示） */}
          {question.type === 'single' || question.type === 'multiple' || question.type === 'judge' ? (
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-bold mb-4">选项</h2>
              <div className="space-y-3">
                {question.options?.map((option, index) => {
                  const isCorrect = question.type === 'multiple'
                    ? Array.isArray(question.answer) && question.answer.includes(index)
                    : (question.answerIndex === index || question.answer === index);
                  
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 ${
                        isCorrect
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span>{option}</span>
                        {isCorrect && (
                          <span className="ml-auto px-2 py-1 bg-green-600 text-white text-xs rounded">
                            正确答案
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : question.type === 'fill' ? (
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-bold mb-4">答案</h2>
              <div className="space-y-3">
                {(question.blankAnswers || []).map((answer, index) => (
                  <div key={index} className="p-3 rounded-lg border-2 border-green-500 bg-green-50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">空白 {index + 1}:</span>
                      <span>{answer}</span>
                      <span className="ml-auto px-2 py-1 bg-green-600 text-white text-xs rounded">
                        答案
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : question.type === 'short' ? (
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-bold mb-4">参考答案</h2>
              <div className="p-3 rounded-lg border-2 border-green-500 bg-green-50">
                <div className="text-slate-800 whitespace-pre-wrap">
                  {question.answer || '-'}
                </div>
              </div>
            </div>
          ) : null}

          {/* 解析 */}
          {question.explain && (
            <div className="bg-white p-6 rounded-lg border">
              <h2 className="text-lg font-bold mb-4">解析</h2>
              <div className="text-slate-700 whitespace-pre-wrap">{question.explain}</div>
            </div>
          )}

          {/* AI 讲解（Phase 0.4 + 1.2：重新生成 / 复制） */}
          {explainResult && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI 讲解</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!question || explainLoading) return;
                      const opts = question.options || question.choices || [];
                      const ans = question.answerIndex ?? question.answer;
                      const answerIndex = typeof ans === 'number' ? ans : (Array.isArray(ans) ? ans[0] : 0);
                      setExplainLoading(true);
                      try {
                        const explanation = await generateExplanation({
                          content: question.content,
                          options: opts,
                          answerIndex: Math.min(answerIndex, opts.length - 1),
                        });
                        setExplainResult(explanation);
                      } catch (err) {
                        toast.error(err.message || '生成失败');
                      } finally {
                        setExplainLoading(false);
                      }
                    }}
                    disabled={explainLoading}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {explainLoading ? '生成中…' : '重新生成'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(explainResult);
                        toast.success('已复制到剪贴板');
                      } catch {
                        toast.error('复制失败');
                      }
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    复制
                  </button>
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                <MarkdownPreview content={explainResult} />
              </div>
            </div>
          )}

          {/* 元信息 */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-bold mb-4">题目信息</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-slate-600">题型</div>
                <div className="font-medium mt-1">
                  {(() => {
                    const typeMap = {
                      single: '单选题',
                      multiple: '多选题',
                      judge: '判断题',
                      fill: '填空题',
                      short: '简答题',
                    };
                    return typeMap[question.type || 'single'] || '单选题';
                  })()}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">学科</div>
                <div className="font-medium mt-1">
                  {question.subjectCode?.name || question.subjectCode || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">难度</div>
                <div className="font-medium mt-1">难度 {question.difficulty}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">所属题库</div>
                <div className="font-medium mt-1">
                  {question.bankId?.name || '-'}
                </div>
              </div>
              {question.groupId && (
                <div>
                  <div className="text-sm text-slate-600">关联群组</div>
                  <div className="font-medium mt-1">
                    {question.groupId?.name || '-'}
                    {question.groupId?.code && (
                      <span className="text-xs text-slate-500 ml-2">
                        ({question.groupId.code})
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-slate-600">知识点</div>
                <div className="font-medium mt-1">
                  {question.knowledgeNodeId || '-'}
                </div>
              </div>
              {question.tags && question.tags.length > 0 && (
                <div className="col-span-2 md:col-span-4">
                  <div className="text-sm text-slate-600 mb-2">标签</div>
                  <div className="flex flex-wrap gap-2">
                    {question.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-slate-600">创建时间</div>
                <div className="font-medium mt-1 text-sm">
                  {new Date(question.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">更新时间</div>
                <div className="font-medium mt-1 text-sm">
                  {new Date(question.updatedAt).toLocaleString()}
                </div>
              </div>
              {question.managerId && (
                <div>
                  <div className="text-sm text-slate-600">负责人</div>
                  <div className="font-medium mt-1 text-sm">
                    {question.managerId?.name || question.managerId?.email || '-'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 版本历史标签页 */}
      {activeTab === 'versions' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {versions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">暂无版本历史</div>
          ) : (
            <div className="divide-y">
              {versions.map((version, index) => (
                <div key={version._id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">版本 {version.version}</span>
                      {index === 0 && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          当前版本
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(version.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {version.editor && (
                    <div className="text-sm text-slate-600 mb-2">
                      编辑者: {version.editor.name || version.editor.email}
                    </div>
                  )}
                  {version.reason && (
                    <div className="text-sm text-slate-600 mb-2">
                      修改原因: {version.reason}
                    </div>
                  )}
                  {version.changes && version.changes.length > 0 && (
                    <div className="text-sm text-slate-600 mb-2">
                      <div className="font-medium">变更内容:</div>
                      <ul className="list-disc list-inside ml-2">
                        {version.changes.map((change, i) => (
                          <li key={i}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {index > 0 && canManage && (
                    <button
                      onClick={() => handleRestoreVersion(version.version)}
                      className="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      恢复到此版本
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 相似题目标签页 */}
      {activeTab === 'related' && (
        <div className="space-y-4">
          {loadingSimilar ? (
            <div className="text-center py-12 text-slate-500">加载中...</div>
          ) : similarQuestions.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border text-center">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">暂无相似题目</div>
              <div className="text-sm text-slate-600 mb-4">
                没有找到与当前题目相似的题目
              </div>
              <button
                onClick={() => navigate('/recommendations')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                查看智能推荐
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {similarQuestions.map((q, index) => (
                <div
                  key={q._id || q.id || index}
                  className="bg-white p-6 rounded-lg border hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {(() => {
                            const typeMap = {
                              single: '单选题',
                              multiple: '多选题',
                              judge: '判断题',
                              fill: '填空题',
                              short: '简答题',
                            };
                            return typeMap[q.type || 'single'] || '单选题';
                          })()}
                        </span>
                        {q.difficulty && (
                          <span className="text-xs text-slate-500">
                            难度：{q.difficulty}
                          </span>
                        )}
                        {q.recommendationReason && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            💡 {q.recommendationReason}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {q.content || '（无题干）'}
                      </h3>
                      {q.knowledgeNodeId && (
                        <div className="text-sm text-slate-600 mb-2">
                          知识点：{q.knowledgeNodeId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/questions/${q._id || q.id}/detail`)}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50"
                    >
                      查看详情
                    </button>
                    <button
                      onClick={() => {
                        navigate('/quiz', {
                          state: {
                            questionIds: [q._id || q.id],
                          },
                        });
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      开始练习
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 相关笔记标签页（同知识点下的笔记） */}
      {activeTab === 'related_notes' && question?.knowledgeNodeId && (
        <div className="space-y-4">
          {loadingRelatedNotes ? (
            <div className="text-center py-12 text-slate-500">加载中...</div>
          ) : relatedNotes.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border text-center">
              <div className="text-4xl mb-4">📝</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">暂无相关笔记</div>
              <div className="text-sm text-slate-600 mb-4">
                同知识点下暂无其他笔记，可在「我的笔记」中为本题添加笔记
              </div>
              {user && (
                <button
                  onClick={() => setActiveTab('note')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  去写笔记
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {relatedNotes.map((note) => (
                <div
                  key={note._id}
                  className="bg-white p-6 rounded-lg border hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1 truncate">{note.title}</h3>
                      {note.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {note.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-sm text-slate-600 line-clamp-2">
                        {(note.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 120)}
                        {(note.content || '').length > 120 ? '…' : ''}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {note.questionId && (
                        <button
                          onClick={() => navigate(`/questions/${note.questionId}/detail`)}
                          className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50"
                        >
                          查看题目
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/notes')}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        在笔记中打开
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 笔记标签页 */}
      {activeTab === 'note' && user && (
        <div className="space-y-6">
          {loadingNote ? (
            <div className="text-center py-12 text-slate-500">加载中...</div>
          ) : questionNote ? (
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">我的笔记</h2>
                <button
                  onClick={() => setShowNoteEditor(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  编辑笔记
                </button>
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-2">{questionNote.title}</h3>
                {questionNote.tags && questionNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {questionNote.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-sm text-slate-600 mb-4">
                  创建于：{new Date(questionNote.createdAt).toLocaleString()} | 
                  最后编辑：{new Date(questionNote.lastEditedAt).toLocaleString()}
                </div>
              </div>
              <div className="prose max-w-none">
                <MarkdownPreview text={questionNote.content} />
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border text-center">
              <div className="text-4xl mb-4">📝</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">暂无笔记</div>
              <div className="text-sm text-slate-600 mb-4">
                为这道题创建笔记，记录你的学习心得
              </div>
              <button
                onClick={() => {
                  setNoteForm({
                    title: `关于"${question?.content?.substring(0, 30)}..."的笔记`,
                    content: '',
                    tags: [],
                    isPublic: false,
                  });
                  setShowNoteEditor(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建笔记
              </button>
            </div>
          )}

          {/* 笔记编辑器 */}
          {showNoteEditor && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-bold mb-4">
                {questionNote ? '编辑笔记' : '新建笔记'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">标题 *</label>
                  <input
                    type="text"
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="请输入笔记标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">内容 *（支持Markdown）</label>
                  <textarea
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="10"
                    placeholder="请输入笔记内容，支持Markdown格式"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">标签（用逗号分隔）</label>
                  <input
                    type="text"
                    value={noteForm.tags.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      setNoteForm({ ...noteForm, tags });
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="例如：重要, 难点, 易错"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="noteIsPublic"
                    checked={noteForm.isPublic}
                    onChange={(e) => setNoteForm({ ...noteForm, isPublic: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="noteIsPublic" className="text-sm">
                    公开笔记（其他用户可见）
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNoteEditor(false);
                    if (questionNote) {
                      setNoteForm({
                        title: questionNote.title,
                        content: questionNote.content,
                        tags: questionNote.tags || [],
                        isPublic: questionNote.isPublic || false,
                      });
                    }
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

