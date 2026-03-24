/**
 * GraphTutor V3.0 - 笔记分享页面
 * 
 * 功能：通过分享链接查看笔记
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getNoteByShareToken, 
  likeNote, 
  unlikeNote, 
  favoriteNote, 
  unfavoriteNote,
  checkNoteFavorite,
  getNoteRecommendations,
  exportNoteAsMarkdown,
} from '../api/v3/notes';
import { exportNoteToWord } from '../api/v3/export';
import { exportNoteToPDF } from '../utils/pdfExport';
import { toast } from '../utils/toast';
import MarkdownPreview from '../components/MarkdownPreview';
import { LoadingSpinner, EmptyState, Badge } from '../components/common';
import Icon from '../components/common/Icon';

export default function NoteShare() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    loadNote();
  }, [token]);

  useEffect(() => {
    if (note && user) {
      loadInteractionStatus();
      loadRecommendations();
    } else if (note) {
      loadRecommendations();
    }
  }, [note, user]);

  const loadNote = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getNoteByShareToken(token);
      setNote(result.data);
    } catch (err) {
      console.error('加载分享笔记失败:', err);
      setError(err.message || '分享链接无效或已过期');
      toast.error('加载笔记失败');
    } finally {
      setLoading(false);
    }
  };

  const loadInteractionStatus = async () => {
    if (!note || !user) return;
    try {
      // 如果note数据中已经包含isLiked和isFavorited，直接使用
      if (note.isLiked !== undefined) {
        setIsLiked(note.isLiked);
      }
      if (note.isFavorited !== undefined) {
        setIsFavorited(note.isFavorited);
      } else {
        // 否则调用API检查
        const favoriteResult = await checkNoteFavorite(note._id);
        setIsFavorited(favoriteResult.data?.isFavorited || false);
      }
    } catch (err) {
      console.error('加载交互状态失败:', err);
    }
  };

  const loadRecommendations = async () => {
    if (!note) return;
    try {
      const result = await getNoteRecommendations(note._id, 5);
      setRecommendations(result.data || []);
    } catch (err) {
      console.error('加载推荐笔记失败:', err);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    try {
      if (isLiked) {
        await unlikeNote(note._id);
        setIsLiked(false);
        setNote(prev => ({
          ...prev,
          likeCount: Math.max(0, (prev.likeCount || 0) - 1),
        }));
        toast.success('已取消点赞');
      } else {
        await likeNote(note._id);
        setIsLiked(true);
        setNote(prev => ({
          ...prev,
          likeCount: (prev.likeCount || 0) + 1,
        }));
        toast.success('已点赞');
      }
    } catch (err) {
      console.error('点赞失败:', err);
      toast.error('操作失败');
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    try {
      if (isFavorited) {
        await unfavoriteNote(note._id);
        setIsFavorited(false);
        setNote(prev => ({
          ...prev,
          favoriteCount: Math.max(0, (prev.favoriteCount || 0) - 1),
        }));
        toast.success('已取消收藏');
      } else {
        await favoriteNote(note._id);
        setIsFavorited(true);
        setNote(prev => ({
          ...prev,
          favoriteCount: (prev.favoriteCount || 0) + 1,
        }));
        toast.success('已收藏');
      }
    } catch (err) {
      console.error('收藏失败:', err);
      toast.error('操作失败');
    }
  };

  const handleExportNote = async (format) => {
    if (!note) return;
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

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制到剪贴板');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" text="加载中..." />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EmptyState
          icon="⚠️"
          title="无法加载笔记"
          description={error || '分享链接无效或已过期'}
          action={{
            label: '返回首页',
            onClick: () => navigate('/'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 头部操作栏 */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/notes/public')}
          className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          ← 返回公开笔记
        </button>
        <div className="flex gap-2">
          <div className="relative group">
            <button
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              导出 ▼
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExportNote('markdown')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-lg flex items-center gap-2"
              >
                <Icon name="fileText" size={16} />
                Markdown
              </button>
              <button
                onClick={() => handleExportNote('pdf')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <Icon name="file" size={16} />
                PDF
              </button>
              <button
                onClick={() => handleExportNote('word')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-lg flex items-center gap-2"
              >
                <Icon name="file" size={16} />
                Word
              </button>
            </div>
          </div>
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            复制链接
          </button>
        </div>
      </div>

      {/* 笔记内容 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-8">
        {/* 笔记头部信息 */}
        <div className="mb-6 pb-6 border-b dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={note.type === 'question' ? 'primary' : 'success'}>
              {note.type === 'question' ? '题目笔记' : '知识点笔记'}
            </Badge>
            {note.isPublic && (
              <Badge variant="success">公开</Badge>
            )}
            {note.userId && typeof note.userId === 'object' && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                作者：{note.userId.name || note.userId.email || '匿名'}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-3 text-slate-900 dark:text-slate-100">
            {note.title}
          </h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <span>创建时间：{new Date(note.createdAt).toLocaleString()}</span>
              {note.lastEditedAt && note.lastEditedAt !== note.createdAt && (
                <span>更新时间：{new Date(note.lastEditedAt).toLocaleString()}</span>
              )}
              <span>👁️ {note.viewCount || 0}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                  isLiked
                    ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
                disabled={!user}
                title={!user ? '请先登录' : isLiked ? '取消点赞' : '点赞'}
              >
                {isLiked ? '❤️' : '🤍'} {note.likeCount || 0}
              </button>
              <button
                onClick={handleFavorite}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                  isFavorited
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
                disabled={!user}
                title={!user ? '请先登录' : isFavorited ? '取消收藏' : '收藏'}
              >
                {isFavorited ? '⭐' : '☆'} {note.favoriteCount || 0}
              </button>
            </div>
          </div>
        </div>

        {/* 标签 */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {note.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* 笔记内容 */}
        <div className="prose dark:prose-invert max-w-none mb-6">
          <MarkdownPreview text={note.content} />
        </div>

        {/* 图片 */}
        {note.images && note.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {note.images.map((imageUrl, idx) => (
              <img
                key={idx}
                src={imageUrl}
                alt={`笔记图片 ${idx + 1}`}
                className="rounded-lg border dark:border-slate-700"
              />
            ))}
          </div>
        )}

        {/* 附件 */}
        {note.attachments && note.attachments.length > 0 && (
          <div className="mt-6 pt-6 border-t dark:border-slate-700">
            <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">附件</h3>
            <div className="space-y-2">
              {note.attachments.map((attachment, idx) => (
                <a
                  key={idx}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span className="text-2xl">📎</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {attachment.originalName || attachment.filename}
                    </div>
                    {attachment.size && (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {(attachment.size / 1024).toFixed(2)} KB
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 关联信息 */}
        <div className="mt-6 pt-6 border-t dark:border-slate-700">
          {note.questionId && (
            <button
              onClick={() => navigate(`/questions/${note.questionId}/detail`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查看关联题目
            </button>
          )}
          {note.knowledgeNodeId && (
            <button
              onClick={() => navigate(`/nodes`)}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 ml-2"
            >
              查看关联知识点
            </button>
          )}
        </div>
      </div>

      {/* 相关笔记推荐 */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
            相关笔记推荐
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((recNote) => (
              <div
                key={recNote._id}
                onClick={() => {
                  if (recNote.shareToken) {
                    navigate(`/notes/share/${recNote.shareToken}`);
                  } else {
                    navigate(`/notes/public`);
                  }
                }}
                className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={recNote.type === 'question' ? 'primary' : 'success'}>
                    {recNote.type === 'question' ? '题目笔记' : '知识点笔记'}
                  </Badge>
                  {recNote.isPublic && (
                    <Badge variant="success">公开</Badge>
                  )}
                </div>
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  {recNote.title}
                </h3>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                  <MarkdownPreview text={recNote.content?.substring(0, 100) || ''} />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Icon name="eye" size={14} />
                    {recNote.viewCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="heart" size={14} />
                    {recNote.likeCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="star" size={14} />
                    {recNote.favoriteCount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

