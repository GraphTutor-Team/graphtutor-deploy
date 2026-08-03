/**
 * GraphTutor V3.0 - 公开笔记浏览页面
 * 
 * 功能：浏览和搜索公开笔记
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPublicNotes, likeNote, unlikeNote, favoriteNote, unfavoriteNote, checkNoteFavorite, getNoteRecommendations } from '../api/v3/notes';
import { toast } from '../utils/toast';
import MarkdownPreview from '../components/MarkdownPreview';
import { LoadingSpinner, EmptyState, Badge } from '../components/common';
import Icon from '../components/common/Icon';

export default function PublicNotes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('q') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [likedNotes, setLikedNotes] = useState(new Set());
  const [favoritedNotes, setFavoritedNotes] = useState(new Set());
  const [recommendedNotes, setRecommendedNotes] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(true);

  useEffect(() => {
    loadNotes();
    if (page === 1 && !searchKeyword && !selectedType && selectedTags.length === 0) {
      loadRecommendations();
    }
  }, [page, searchKeyword, selectedType, selectedTags]);

  const loadRecommendations = async () => {
    try {
      // 获取热门笔记作为推荐
      const result = await getPublicNotes({
        page: 1,
        limit: 6,
        sortBy: 'likeCount',
        sortOrder: 'desc',
      });
      setRecommendedNotes(result.data.items || []);
    } catch (err) {
      console.error('加载推荐笔记失败:', err);
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const result = await getPublicNotes({
        searchKeyword,
        type: selectedType || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        page,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const loadedNotes = result.data.items || [];
      setNotes(loadedNotes);
      setTotalPages(result.data.totalPages || 1);

      // 如果用户已登录，加载收藏状态
      if (user && loadedNotes.length > 0) {
        // 延迟加载收藏状态，确保notes状态已更新
        setTimeout(() => {
          const noteIds = loadedNotes.map(n => n._id);
          Promise.all(
            noteIds.map(id => 
              checkNoteFavorite(id)
                .then(result => ({ id, isFavorited: result.data?.isFavorited || false }))
                .catch(() => ({ id, isFavorited: false }))
            )
          ).then(results => {
            const favoritedSet = new Set();
            results.forEach(({ id, isFavorited }) => {
              if (isFavorited) favoritedSet.add(id);
            });
            setFavoritedNotes(favoritedSet);
          });
        }, 100);
      } else {
        setFavoritedNotes(new Set());
      }

      // 提取所有标签
      const allTags = new Set();
      result.data.items?.forEach(note => {
        note.tags?.forEach(tag => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags));
    } catch (err) {
      console.error('加载公开笔记失败:', err);
      toast.error('加载公开笔记失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (noteId) => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    try {
      const isLiked = likedNotes.has(noteId);
      if (isLiked) {
        await unlikeNote(noteId);
        setLikedNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(noteId);
          return newSet;
        });
        toast.success('已取消点赞');
      } else {
        await likeNote(noteId);
        setLikedNotes(prev => new Set(prev).add(noteId));
        toast.success('已点赞');
      }
      // 更新笔记的点赞数
      setNotes(prev => prev.map(note => 
        note._id === noteId 
          ? { ...note, likeCount: isLiked ? (note.likeCount || 0) - 1 : (note.likeCount || 0) + 1 }
          : note
      ));
    } catch (err) {
      console.error('点赞失败:', err);
      toast.error('操作失败');
    }
  };

  const handleFavorite = async (noteId) => {
    if (!user) {
      toast.warning('请先登录');
      return;
    }

    try {
      const isFavorited = favoritedNotes.has(noteId);
      if (isFavorited) {
        await unfavoriteNote(noteId);
        setFavoritedNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(noteId);
          return newSet;
        });
        toast.success('已取消收藏');
      } else {
        await favoriteNote(noteId);
        setFavoritedNotes(prev => new Set(prev).add(noteId));
        toast.success('已收藏');
      }
      // 更新笔记的收藏数
      setNotes(prev => prev.map(note => 
        note._id === noteId 
          ? { ...note, favoriteCount: isFavorited ? (note.favoriteCount || 0) - 1 : (note.favoriteCount || 0) + 1 }
          : note
      ));
    } catch (err) {
      console.error('收藏失败:', err);
      toast.error('操作失败');
    }
  };

  const handleSearch = () => {
    setPage(1);
    const params = new URLSearchParams();
    if (searchKeyword) params.set('q', searchKeyword);
    if (selectedType) params.set('type', selectedType);
    setSearchParams(params);
    loadNotes();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">公开笔记广场</h1>
          <button
            onClick={() => navigate('/notes')}
            className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            我的笔记
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          浏览和发现其他用户分享的学习笔记
        </p>
      </div>

      {/* 推荐笔记区域 */}
      {showRecommendations && recommendedNotes.length > 0 && page === 1 && !searchKeyword && !selectedType && selectedTags.length === 0 && (
        <div className="mb-6 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              🔥 热门推荐
            </h2>
            <button
              onClick={() => setShowRecommendations(false)}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              收起
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedNotes.slice(0, 6).map((recNote) => {
              const isLiked = likedNotes.has(recNote._id);
              const isFavorited = favoritedNotes.has(recNote._id);
              return (
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
                  </div>
                  <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100 line-clamp-2">
                    {recNote.title}
                  </h3>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                    <MarkdownPreview text={recNote.content?.substring(0, 80) || ''} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Icon name="eye" size={14} />
                        {recNote.viewCount || 0}
                      </span>
                      <span className={`flex items-center gap-1 ${isLiked ? 'text-red-600 dark:text-red-400' : ''}`}>
                        <Icon name="heart" size={14} color={isLiked ? '#ef4444' : undefined} fill={isLiked} />
                        {recNote.likeCount || 0}
                      </span>
                      <span className={`flex items-center gap-1 ${isFavorited ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                        <Icon name="star" size={14} color={isFavorited ? '#f59e0b' : undefined} fill={isFavorited} />
                        {recNote.favoriteCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 min-w-[200px] px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            搜索
          </button>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="">全部类型</option>
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
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 笔记列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="加载中..." />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<Icon name="book" size={48} color="#6366f1" />}
          title={searchKeyword || selectedType || selectedTags.length > 0 ? '未找到相关笔记' : '暂无公开笔记'}
          description={
            searchKeyword || selectedType || selectedTags.length > 0
              ? '尝试使用其他关键词搜索'
              : '还没有用户分享公开笔记'
          }
        />
      ) : (
        <>
          <div className="space-y-4 mb-4">
            {notes.map(note => {
              const isLiked = likedNotes.has(note._id);
              const isFavorited = favoritedNotes.has(note._id);
              return (
                <div
                  key={note._id}
                  className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={note.type === 'question' ? 'primary' : 'success'}>
                          {note.type === 'question' ? '题目笔记' : '知识点笔记'}
                        </Badge>
                        {note.userId && typeof note.userId === 'object' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            作者：{note.userId.name || note.userId.email || '匿名'}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">
                        {note.title}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="text-slate-700 dark:text-slate-300 mb-4">
                    <MarkdownPreview text={note.content} />
                  </div>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {note.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t dark:border-slate-700 min-w-0">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Icon name="eye" size={14} />
                        {note.viewCount || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLike(note._id)}
                        className={`flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 ${
                          isLiked ? 'text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        <Icon name="heart" size={14} color={isLiked ? '#ef4444' : undefined} fill={isLiked} />
                        {note.likeCount || 0}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFavorite(note._id)}
                        className={`flex items-center gap-1 hover:text-yellow-600 dark:hover:text-yellow-400 ${
                          isFavorited ? 'text-yellow-600 dark:text-yellow-400' : ''
                        }`}
                      >
                        <Icon name="star" size={14} color={isFavorited ? '#f59e0b' : undefined} fill={isFavorited} />
                        {note.favoriteCount || 0}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {note.knowledgeNodeId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/nodes`)}
                          className="flex-1 sm:flex-none px-3 py-1 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          查看知识点
                        </button>
                      )}
                      {note.shareToken && (
                        <button
                          type="button"
                          onClick={() => navigate(`/notes/share/${note.shareToken}`)}
                          className="flex-1 sm:flex-none px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          查看详情
                        </button>
                      )}
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
                className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                上一页
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                第 {page} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

