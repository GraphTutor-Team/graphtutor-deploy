/**
 * GraphTutor V3.0 - 笔记管理页面
 * 
 * 作用：提供完整的笔记管理功能，包括创建、编辑、删除、搜索、分类、标签管理等，支持Markdown编辑和导出
 * 关联页面：
 *   - api/v3/notes.js (笔记API)
 *   - utils/pdfExport.js (PDF导出)
 *   - components/NoteTemplateManager.jsx (笔记模板管理)
 *   - components/NoteTagEditor.jsx (标签编辑)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - Markdown编辑器
 *   - 笔记搜索和筛选
 *   - 标签管理
 *   - 导出功能
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getNotes,
  getNoteStats,
  createNote,
  updateNote,
  deleteNote,
  exportNotesAsMarkdown,
  exportNoteAsMarkdown,
  generateShareLink,
  getFavoriteNotes,
} from '../api/v3/notes';
import { generateNoteSummary } from '../api/v3/ai';
import { findNodeName } from '../api/graph';
import { getRecommendedQuestions } from '../api/v3/recommendations';
import { exportNoteToWord } from '../api/v3/export';
import { exportNoteToPDF } from '../utils/pdfExport';
import { toast } from '../utils/toast';
import MarkdownPreview from '../components/MarkdownPreview';
import ImageUploader from '../components/ImageUploader';
import AttachmentUploader from '../components/AttachmentUploader';
import { applyTemplate, getAllTemplates } from '../utils/noteTemplates';
import NoteStatsPanel from '../components/NoteStatsPanel';
import NoteTemplateManager from '../components/NoteTemplateManager';
import MarkdownImporter from '../components/MarkdownImporter';
import NoteDetailPanel from '../components/NoteDetailPanel';
import NoteTagEditor from '../components/NoteTagEditor';
import Icon from '../components/common/Icon';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/common/EmptyState';
import LoginPrompt from '../components/common/LoginPrompt';
import { usePageAI } from '../hooks/usePageAI';

const NOTE_TYPE_LABELS = {
  question: '题目笔记',
  knowledge: '知识点笔记',
  general: '通用笔记',
};

export default function Notes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'favorites'
  const [favoriteNotes, setFavoriteNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({
    type: 'general',
    questionId: '',
    knowledgeNodeId: '',
    title: '',
    content: '',
    summary: '',
    tags: [],
    isPublic: false,
    images: [],
    attachments: [],
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [relatedQuestionsForNote, setRelatedQuestionsForNote] = useState([]);
  const [loadingRelatedQuestions, setLoadingRelatedQuestions] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);

  const noteBrief = useMemo(() => {
    const current = viewingNote || (editingNote ? { title: noteForm.title, content: noteForm.content } : null);
    if (!current) return `页面：学习笔记。共 ${notes.length} 篇，当前没有打开某一篇。`;
    const body = String(current.content || '').replace(/\s+/g, ' ').slice(0, 500);
    return `页面：学习笔记。标题：${current.title || '未命名'}。正文摘录：${body || '空'}`;
  }, [viewingNote, editingNote, noteForm.title, noteForm.content, notes.length]);

  const openNoteContent = viewingNote?.content || (editingNote ? noteForm.content : '');
  usePageAI({
    pageType: 'notes',
    brief: noteBrief,
    noteContent: String(openNoteContent || '').slice(0, 8000),
  });

  const filterKnowledgeNodeId = searchParams.get('knowledgeNodeId');
  const filterQuestionId = searchParams.get('questionId');
  const [filterNodeName, setFilterNodeName] = useState('');

  useEffect(() => {
    if (!filterKnowledgeNodeId) {
      setFilterNodeName('');
      return undefined;
    }
    let cancelled = false;
    findNodeName(filterKnowledgeNodeId).then((name) => {
      if (!cancelled) setFilterNodeName(name || '');
    });
    return () => {
      cancelled = true;
    };
  }, [filterKnowledgeNodeId]);

  const clearUrlFilters = () => {
    setViewingNote(null);
    navigate('/notes');
  };

  function buildNotePayload(forUpdate = false) {
    const base = {
      title: noteForm.title.trim(),
      content: noteForm.content,
      summary: noteForm.summary || '',
      tags: noteForm.tags || [],
      isPublic: noteForm.isPublic || false,
      images: noteForm.images || [],
      attachments: noteForm.attachments || [],
    };
    if (forUpdate) return base;
    return {
      ...base,
      type: noteForm.type,
      questionId: noteForm.type === 'question' ? noteForm.questionId.trim() : undefined,
      knowledgeNodeId: noteForm.type === 'knowledge' ? noteForm.knowledgeNodeId.trim() : undefined,
    };
  }

  useEffect(() => {
    const tab = searchParams.get('tab');
    const knowledgeNodeId = searchParams.get('knowledgeNodeId');
    const questionId = searchParams.get('questionId');
    const action = searchParams.get('action');
    if (tab === 'favorites') setActiveTab('favorites');
    if (knowledgeNodeId) {
      setSelectedType('knowledge');
      setSearchKeyword('');
    }
    if (questionId) {
      setSelectedType('question');
      setSearchKeyword('');
    }
    if (action === 'create' && user) {
      setEditingNote(null);
      setNoteForm({
        type: knowledgeNodeId ? 'knowledge' : questionId ? 'question' : 'general',
        questionId: questionId || '',
        knowledgeNodeId: knowledgeNodeId || '',
        title: '',
        content: '',
        summary: '',
        tags: [],
        isPublic: false,
        images: [],
        attachments: [],
      });
      setShowNoteModal(true);
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'my') {
        loadNotes();
        loadStats();
      } else if (activeTab === 'favorites') {
        loadFavoriteNotes();
      }
    }
  }, [user, page, searchKeyword, selectedType, selectedTags, activeTab, searchParams]);

  useEffect(() => {
    if (!editingNote) {
      setRelatedQuestionsForNote([]);
      return;
    }
    const qid = editingNote.questionId || noteForm.questionId;
    const kid = editingNote.knowledgeNodeId || noteForm.knowledgeNodeId;
    if (!qid && !kid) return;
    let cancelled = false;
    setLoadingRelatedQuestions(true);
    (async () => {
      try {
        const list = await getRecommendedQuestions({
          strategy: 'similar',
          questionId: qid || undefined,
          knowledgeNodeId: kid || undefined,
          limit: 5,
          includeReasons: false,
        });
        if (!cancelled) setRelatedQuestionsForNote(Array.isArray(list) ? list : list?.data || []);
      } catch {
        if (!cancelled) setRelatedQuestionsForNote([]);
      } finally {
        if (!cancelled) setLoadingRelatedQuestions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editingNote?._id, editingNote?.questionId, editingNote?.knowledgeNodeId, noteForm.questionId, noteForm.knowledgeNodeId]);

  const loadFavoriteNotes = async () => {
    try {
      setLoading(true);
      const result = await getFavoriteNotes({
        page,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setFavoriteNotes(result.data.items || []);
      setTotalPages(result.data.totalPages || 1);
    } catch (err) {
      console.error('加载收藏笔记失败:', err);
      toast.error('加载收藏笔记失败');
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const knowledgeNodeId = searchParams.get('knowledgeNodeId');
      const questionId = searchParams.get('questionId');
      const result = await getNotes({
        searchKeyword,
        type: selectedType || undefined,
        knowledgeNodeId: knowledgeNodeId || undefined,
        questionId: questionId || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        page,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setNotes(result.data.items || []);
      setTotalPages(result.data.totalPages || 1);

      // 提取所有标签
      const allTags = new Set();
      result.data.items?.forEach(note => {
        note.tags?.forEach(tag => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags));
    } catch (err) {
      console.error('加载笔记失败:', err);
      toast.error('加载笔记失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getNoteStats();
      setStats(result.data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  const handleCreateNote = () => {
    setViewingNote(null);
    setEditingNote(null);
    setNoteForm({
      type: 'general',
      questionId: '',
      knowledgeNodeId: '',
      title: '',
      content: '',
      summary: '',
      tags: [],
      isPublic: false,
      images: [],
      attachments: [],
    });
    setShowNoteModal(true);
  };

  const handleApplyTemplate = (template) => {
    const appliedTemplate = applyTemplate(template.key, {
      questionId: noteForm.questionId,
      knowledgeNodeId: noteForm.knowledgeNodeId,
    });
    if (appliedTemplate) {
      setNoteForm({
        ...noteForm,
        type: appliedTemplate.type,
        title: appliedTemplate.title,
        content: appliedTemplate.content,
      });
      setShowTemplateModal(false);
      toast.success('模板已应用');
    } else if (template) {
      // 如果是自定义模板，直接使用
      setNoteForm({
        ...noteForm,
        type: template.type,
        title: template.title,
        content: template.content,
      });
      setShowTemplateModal(false);
      toast.success('模板已应用');
    }
  };

  const handleImportComplete = (results) => {
    if (results.success.length > 0) {
      loadNotes();
      loadStats();
      setShowImportModal(false);
    }
  };

  const handleEditNote = (note) => {
    setViewingNote(null);
    setEditingNote(note);
    setNoteForm({
      type: note.type,
      questionId: note.questionId || '',
      knowledgeNodeId: note.knowledgeNodeId || '',
      title: note.title,
      content: note.content,
      summary: note.summary || '',
      tags: note.tags || [],
      isPublic: note.isPublic || false,
      images: note.images || [],
      attachments: note.attachments || [],
    });
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim()) {
      toast.warning('请输入笔记标题');
      return;
    }
    if (!noteForm.content.trim()) {
      toast.warning('请输入笔记内容');
      return;
    }
    if (noteForm.type === 'question' && !noteForm.questionId.trim()) {
      toast.warning('题目笔记请填写题目ID');
      return;
    }
    if (noteForm.type === 'knowledge' && !noteForm.knowledgeNodeId.trim()) {
      toast.warning('知识点笔记请填写知识点ID');
      return;
    }

    try {
      if (editingNote) {
        await updateNote(editingNote._id, buildNotePayload(true));
        toast.success('更新成功');
      } else {
        await createNote(buildNotePayload(false));
        toast.success('创建成功');
      }
      setShowNoteModal(false);
      setEditingNote(null);
      loadNotes();
      loadStats();
    } catch (err) {
      console.error('保存笔记失败:', err);
      if (err.response?.status === 409) {
        toast.warning('该题目已有笔记，请编辑现有笔记');
      } else {
        toast.error(err.message || '保存笔记失败');
      }
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('确定要删除此笔记吗？')) {
      return;
    }
    try {
      await deleteNote(noteId);
      toast.success('删除成功');
      if (viewingNote?._id === noteId) setViewingNote(null);
      loadNotes();
      loadStats();
    } catch (err) {
      console.error('删除笔记失败:', err);
      toast.error(err.message || '删除笔记失败');
    }
  };

  const handleBatchExport = async () => {
    const noteIds = selectedNoteIds.length > 0 ? selectedNoteIds : (activeTab === 'my' ? notes : favoriteNotes).map(n => n._id);
    if (noteIds.length === 0) {
      toast.warning('没有可导出的笔记');
      return;
    }
    try {
      await exportNotesAsMarkdown(noteIds);
      toast.success('导出成功');
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败');
    }
  };

  const handleExportNote = async (note, format) => {
    try {
      switch (format) {
        case 'markdown':
          await exportNoteAsMarkdown(note._id);
          toast.success('Markdown导出成功');
          break;
        case 'pdf':
          exportNoteToPDF(note);
          toast.success('PDF导出已启动，请使用浏览器的打印功能保存');
          break;
        case 'word':
          await exportNoteToWord(note);
          toast.success('Word导出成功');
          break;
        default:
          toast.warning('不支持的导出格式');
      }
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败: ' + (err.message || '未知错误'));
    }
  };

  const handleShareNote = async (noteId) => {
    try {
      const result = await generateShareLink(noteId);
      setShareInfo(result.data);
      setShowShareModal(true);
    } catch (err) {
      console.error('生成分享链接失败:', err);
      toast.error('生成分享链接失败');
    }
  };

  const copyShareLink = () => {
    if (shareInfo && shareInfo.shareUrl) {
      const fullUrl = `${window.location.origin}${shareInfo.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success('分享链接已复制');
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后管理笔记"
        description="登录后可创建与整理学习笔记。也可先看使用教程，或去做题积累素材。"
      />
    );
  }

  return (
    <div className="page-shell !space-y-4">
      <PageHeader
        title={activeTab === 'my' ? '我的笔记' : '收藏的笔记'}
        subtitle={stats ? `共 ${stats.total || 0} 篇` : '创建、整理与导出学习笔记'}
        actions={[
          { label: '公开广场', onClick: () => navigate('/notes/public'), variant: 'btn-outline' },
          { label: '我的收藏', onClick: () => navigate('/notes?tab=favorites'), variant: 'btn-outline' },
          { label: '导入', onClick: () => setShowImportModal(true), variant: 'btn-outline' },
          { label: '模板', onClick: () => setShowTemplateManager(true), variant: 'btn-outline' },
          { label: '导出', onClick: handleBatchExport, variant: 'btn-outline' },
          { label: '新建笔记', onClick: handleCreateNote, variant: 'btn-primary' },
        ]}
      />

      {(filterKnowledgeNodeId || filterQuestionId) && activeTab === 'my' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
          <span>
            当前筛选：
            {filterKnowledgeNodeId && `知识点「${filterNodeName || filterKnowledgeNodeId}」`}
            {filterQuestionId && `题目「${filterQuestionId}」`}
          </span>
          <div className="flex gap-2">
            {filterKnowledgeNodeId && (
              <button
                type="button"
                onClick={() => navigate(`/quiz?knowledgeNodeId=${encodeURIComponent(filterKnowledgeNodeId)}&nodeName=${encodeURIComponent(filterNodeName || filterKnowledgeNodeId)}`)}
                className="px-3 py-1 rounded-lg border border-blue-200 hover:bg-white"
              >
                练这个知识点
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const q = new URLSearchParams();
                if (filterKnowledgeNodeId) q.set('knowledgeNodeId', filterKnowledgeNodeId);
                if (filterQuestionId) q.set('questionId', filterQuestionId);
                q.set('action', 'create');
                navigate(`/notes?${q.toString()}`);
              }}
              className="px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              在此筛选下新建
            </button>
            <button type="button" onClick={clearUrlFilters} className="px-3 py-1 rounded-lg border border-blue-200 hover:bg-white">
              清除筛选
            </button>
          </div>
        </div>
      )}

      {/* 统计面板 */}
      {activeTab === 'my' && stats && (
        <NoteStatsPanel stats={stats} notes={notes} />
      )}

      {/* 标签页 */}
      <div className="flex gap-2 border-b border-slate-200/80 dark:border-slate-700">
        <button
          onClick={() => {
            setActiveTab('my');
            setPage(1);
          }}
          className={`px-4 py-2.5 font-medium text-sm transition-colors ${
            activeTab === 'my'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          我的笔记
        </button>
        <button
          onClick={() => {
            setActiveTab('favorites');
            setPage(1);
          }}
          className={`px-4 py-2.5 font-medium text-sm transition-colors ${
            activeTab === 'favorites'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          收藏的笔记
        </button>
      </div>

      {/* 搜索和筛选 */}
      {activeTab === 'my' && (
      <div className="surface !p-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg"
          />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">全部类型</option>
            <option value="general">通用笔记</option>
            <option value="question">题目笔记</option>
            <option value="knowledge">知识点笔记</option>
          </select>
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                    setPage(1);
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* 笔记列表 */}
      <div className={viewingNote && activeTab === 'my' ? 'grid gap-6 lg:grid-cols-2' : ''}>
      <div>
      {loading ? (
        <div className="text-center py-12 text-slate-500">加载中...</div>
      ) : (activeTab === 'my' ? notes : favoriteNotes).length === 0 ? (
        <div className="surface !py-12">
          <EmptyState
            icon="notes"
            title={searchKeyword || selectedType || selectedTags.length > 0 ? '未找到相关笔记' : '暂无笔记'}
            description={
              searchKeyword || selectedType || selectedTags.length > 0
                ? '尝试使用其他关键词，或清空筛选查看全部笔记。下一步：清空筛选或创建新笔记。'
                : '创建你的第一篇笔记，或在做题时从题目详情页添加笔记。下一步：点击下方按钮创建笔记。'
            }
            action={searchKeyword || selectedType || selectedTags.length > 0
              ? () => {
                  setSearchKeyword('');
                  setSelectedType('');
                  setSelectedTags([]);
                }
              : handleCreateNote}
            actionLabel={searchKeyword || selectedType || selectedTags.length > 0 ? '清空筛选' : '创建笔记'}
          />
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-4">
            {(activeTab === 'my' ? notes : favoriteNotes).map(note => {
              const isSelected = selectedNoteIds.includes(note._id);
              return (
                <div
                  key={note._id}
                  className={`surface !p-4 hover:border-blue-200 dark:hover:border-slate-600 transition-colors cursor-pointer ${
                    viewingNote?._id === note._id ? 'ring-2 ring-blue-400 border-blue-300' : ''
                  }`}
                  onClick={() => activeTab === 'my' && setViewingNote(note)}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNoteIds([...selectedNoteIds, note._id]);
                        } else {
                          setSelectedNoteIds(selectedNoteIds.filter(id => id !== note._id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {NOTE_TYPE_LABELS[note.type] || note.type}
                        </span>
                        {note.isPublic && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            公开
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{note.title}</h3>
                      <div className="text-slate-700 mb-2 max-h-24 overflow-hidden">
                        {note.summary ? (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{note.summary}</p>
                        ) : (
                          <MarkdownPreview text={note.content} />
                        )}
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {note.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setViewingNote(note)}
                          className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                        >
                          预览
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditNote(note)}
                          className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleShareNote(note._id)}
                          className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                        >
                          分享
                        </button>
                        <div className="relative group">
                          <button
                            className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                          >
                            导出 ▼
                          </button>
                          <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => handleExportNote(note, 'markdown')}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-lg flex items-center gap-2"
                            >
                              <Icon name="fileText" size={16} />
                              Markdown
                            </button>
                            <button
                              onClick={() => handleExportNote(note, 'pdf')}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              📄 PDF
                            </button>
                            <button
                              onClick={() => handleExportNote(note, 'word')}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-lg"
                            >
                              📘 Word
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note._id)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                        >
                          删除
                        </button>
                        {note.questionId && (
                          <button
                            onClick={() => navigate(`/questions/${note.questionId}/detail`)}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            查看题目
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                上一页
              </button>
              <span className="text-sm text-slate-600">
                第 {page} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
      </div>

      {viewingNote && activeTab === 'my' && (
        <NoteDetailPanel
          note={viewingNote}
          onClose={() => setViewingNote(null)}
          onEdit={handleEditNote}
          onDelete={handleDeleteNote}
          onShare={handleShareNote}
          onExport={handleExportNote}
        />
      )}
      </div>

      {/* 笔记编辑弹窗 */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingNote ? '编辑笔记' : '新建笔记'}
              </h3>
              {!editingNote && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
                  >
                    <Icon name="fileText" size={16} />
                    使用模板
                  </button>
                  <button
                    onClick={() => setShowTemplateManager(true)}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    ⚙️ 管理模板
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">笔记类型 *</label>
                  <select
                    value={noteForm.type}
                    onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingNote}
                  >
                    <option value="general">通用笔记</option>
                    <option value="question">题目笔记</option>
                    <option value="knowledge">知识点笔记</option>
                  </select>
                </div>
                {noteForm.type !== 'general' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {noteForm.type === 'question' ? '题目ID' : '知识点ID'} *
                  </label>
                  <input
                    type="text"
                    value={noteForm[noteForm.type === 'question' ? 'questionId' : 'knowledgeNodeId']}
                    onChange={(e) => {
                      const key = noteForm.type === 'question' ? 'questionId' : 'knowledgeNodeId';
                      setNoteForm({ ...noteForm, [key]: e.target.value });
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder={noteForm.type === 'question' ? '输入题目ID' : '输入知识点ID'}
                    disabled={!!editingNote}
                  />
                </div>
                )}
              </div>
              {noteForm.type === 'general' && !editingNote && (
                <p className="text-xs text-slate-500">通用笔记无需关联题目或知识点，适合个人学习记录。</p>
              )}
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
                <label className="block text-sm font-medium mb-2">内容 *（左侧 Markdown 编辑，右侧实时预览）</label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="flex flex-col min-h-[320px]">
                    <div className="text-xs text-slate-500 mb-1">Markdown 源码</div>
                    <textarea
                      value={noteForm.content}
                      onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                      className="flex-1 w-full min-h-[320px] px-3 py-2 border rounded-lg font-mono text-sm leading-relaxed resize-y"
                      placeholder={'# 标题\n\n- 要点一\n- 要点二\n\n```js\nconsole.log("hello")\n```'}
                    />
                  </div>
                  <div className="flex flex-col min-h-[320px]">
                    <div className="text-xs text-slate-500 mb-1">预览</div>
                    <div className="flex-1 min-h-[320px] max-h-[480px] overflow-y-auto p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                      {noteForm.content?.trim() ? (
                        <MarkdownPreview text={noteForm.content} />
                      ) : (
                        <p className="text-sm text-slate-400">在左侧输入 Markdown，此处实时预览</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">支持标题、列表、代码块、链接与 ![图片](url)</span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!noteForm.content?.trim()) {
                        toast.warning('请先输入笔记内容');
                        return;
                      }
                      setSummaryLoading(true);
                      try {
                        const { summary } = await generateNoteSummary(noteForm.content);
                        setNoteForm((f) => ({ ...f, summary }));
                        toast.success('摘要已生成');
                      } catch (err) {
                        toast.error(err.message || '生成摘要失败');
                      } finally {
                        setSummaryLoading(false);
                      }
                    }}
                    disabled={summaryLoading}
                    className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    {summaryLoading ? '生成中…' : 'AI 生成摘要'}
                  </button>
                </div>
                {noteForm.summary && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400">
                    摘要：{noteForm.summary}
                  </div>
                )}
              </div>
              
              {/* 图片上传 */}
              <div>
                <label className="block text-sm font-medium mb-1">图片</label>
                <ImageUploader
                  key={editingNote?._id || 'new-note'}
                  value={noteForm.images}
                  onUpload={(urls) => setNoteForm({ ...noteForm, images: urls })}
                  maxImages={10}
                />
                {noteForm.images && noteForm.images.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    已上传 {noteForm.images.length} 张图片
                  </div>
                )}
              </div>

              {/* 附件上传 */}
              <div>
                <label className="block text-sm font-medium mb-1">附件</label>
                <AttachmentUploader
                  key={`att-${editingNote?._id || 'new'}`}
                  value={noteForm.attachments}
                  onUpload={(attachments) => setNoteForm({ ...noteForm, attachments })}
                  maxAttachments={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">标签</label>
                <NoteTagEditor
                  content={noteForm.content}
                  tags={noteForm.tags}
                  popularTags={availableTags.map((tag) => ({ tag, count: 1 }))}
                  onChange={(tags) => setNoteForm({ ...noteForm, tags })}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={noteForm.isPublic}
                  onChange={(e) => setNoteForm({ ...noteForm, isPublic: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm">
                  公开笔记（其他用户可见）
                </label>
              </div>

              {editingNote && (editingNote.questionId || editingNote.knowledgeNodeId || noteForm.questionId || noteForm.knowledgeNodeId) && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">相关题目</h4>
                  {loadingRelatedQuestions ? (
                    <div className="text-sm text-slate-500">加载中...</div>
                  ) : relatedQuestionsForNote.length > 0 ? (
                    <ul className="space-y-1">
                      {relatedQuestionsForNote.map((q) => (
                        <li key={q._id || q.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNoteModal(false);
                              setEditingNote(null);
                              navigate(`/questions/${q._id || q.id}/detail`);
                            }}
                            className="text-left w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 truncate block"
                          >
                            {(q.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 50)}
                            {(q.content || '').length > 50 ? '…' : ''}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">暂无相关题目</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingNote(null);
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
        </div>
      )}

      {/* 分享弹窗 */}
      {showShareModal && shareInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">分享笔记</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">分享链接</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}${shareInfo.shareUrl}`}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg bg-slate-50"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    复制
                  </button>
                </div>
              </div>
              {shareInfo.expiresAt && (
                <div className="text-sm text-slate-600">
                  链接有效期至：{new Date(shareInfo.expiresAt).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareInfo(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模板选择模态框 */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <NoteTemplateManager
            onSelectTemplate={handleApplyTemplate}
            onClose={() => setShowTemplateModal(false)}
            currentType={noteForm.type}
            showPopular={true}
          />
        </div>
      )}

      {/* 模板管理模态框 */}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <NoteTemplateManager
            onClose={() => setShowTemplateManager(false)}
            currentType={null}
            showPopular={true}
          />
        </div>
      )}

      {/* Markdown导入模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                导入Markdown笔记
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                关闭
              </button>
            </div>
            <MarkdownImporter
              onImportComplete={handleImportComplete}
              defaultKnowledgeNodeId={null}
            />
          </div>
        </div>
      )}
    </div>
  );
}

