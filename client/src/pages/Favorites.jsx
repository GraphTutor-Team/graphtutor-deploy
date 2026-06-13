/**
 * GraphTutor V3.0 - 收藏管理页面
 * 
 * 功能：管理收藏夹和收藏的题目
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getFavoriteFolders,
  createFavoriteFolder,
  updateFavoriteFolder,
  deleteFavoriteFolder,
  getFavorites,
  removeFavorite,
  getFavoriteStats,
  batchRemoveFavorites,
  batchMoveFavorites,
} from '../api/v3/favorites';
import { addGroupSharedQuestion } from '../api/v3/groups';
import { toast } from '../utils/toast';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';

export default function Favorites() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const fromGroup = location.state?.fromGroup;
  const groupName = location.state?.groupName;

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '⭐',
  });

  useEffect(() => {
    if (user) {
      loadFolders();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedFolderId) {
      loadFavorites();
    }
  }, [selectedFolderId, page, searchKeyword]);

  const loadFolders = async () => {
    try {
      const result = await getFavoriteFolders();
      const folderList = result.data || [];
      setFolders(folderList);
      if (folderList.length > 0 && !selectedFolderId) {
        const defaultFolder = folderList.find(f => f.isDefault) || folderList[0];
        setSelectedFolderId(defaultFolder._id);
      }
    } catch (err) {
      console.error('加载收藏夹失败:', err);
      toast.error('加载收藏夹失败');
    }
  };

  const loadFavorites = async () => {
    if (!selectedFolderId) return;
    try {
      setFavoritesLoading(true);
      const result = await getFavorites({
        folderId: selectedFolderId,
        searchKeyword,
        page,
        limit: 20,
        sortBy: 'favoritedAt',
        sortOrder: 'desc',
      });
      setFavorites(result.data.items || []);
      setTotalPages(result.data.totalPages || 1);
    } catch (err) {
      console.error('加载收藏失败:', err);
      toast.error('加载收藏失败');
    } finally {
      setFavoritesLoading(false);
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getFavoriteStats();
      setStats(result.data);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderForm.name.trim()) {
      toast.warning('请输入收藏夹名称');
      return;
    }
    try {
      await createFavoriteFolder(folderForm);
      toast.success('创建成功');
      setShowFolderModal(false);
      setFolderForm({ name: '', description: '', color: '#3B82F6', icon: '⭐' });
      loadFolders();
      loadStats();
    } catch (err) {
      console.error('创建收藏夹失败:', err);
      toast.error(err.message || '创建收藏夹失败');
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder || !folderForm.name.trim()) {
      toast.warning('请输入收藏夹名称');
      return;
    }
    try {
      await updateFavoriteFolder(editingFolder._id, folderForm);
      toast.success('更新成功');
      setShowFolderModal(false);
      setEditingFolder(null);
      setFolderForm({ name: '', description: '', color: '#3B82F6', icon: '⭐' });
      loadFolders();
    } catch (err) {
      console.error('更新收藏夹失败:', err);
      toast.error(err.message || '更新收藏夹失败');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('确定要删除此收藏夹吗？收藏夹中的所有题目将被删除。')) {
      return;
    }
    try {
      await deleteFavoriteFolder(folderId);
      toast.success('删除成功');
      if (selectedFolderId === folderId) {
        const remaining = folders.filter(f => f._id !== folderId);
        setSelectedFolderId(remaining.length > 0 ? remaining[0]._id : '');
      }
      loadFolders();
      loadStats();
    } catch (err) {
      console.error('删除收藏夹失败:', err);
      toast.error(err.message || '删除收藏夹失败');
    }
  };

  const handleRemoveFavorite = async (questionId) => {
    try {
      await removeFavorite(questionId, selectedFolderId);
      toast.success('已取消收藏');
      loadFavorites();
      loadStats();
    } catch (err) {
      console.error('取消收藏失败:', err);
      toast.error(err.message || '取消收藏失败');
    }
  };

  const handleBatchRemove = async () => {
    if (selectedQuestionIds.length === 0) {
      toast.warning('请选择要删除的题目');
      return;
    }
    if (!window.confirm(`确定要删除选中的 ${selectedQuestionIds.length} 道题目吗？`)) {
      return;
    }
    try {
      await batchRemoveFavorites({
        questionIds: selectedQuestionIds,
        folderId: selectedFolderId,
      });
      toast.success('批量删除成功');
      setSelectedQuestionIds([]);
      loadFavorites();
      loadStats();
    } catch (err) {
      console.error('批量删除失败:', err);
      toast.error(err.message || '批量删除失败');
    }
  };

  const handleStartPractice = () => {
    const questionIds = selectedQuestionIds.length > 0
      ? selectedQuestionIds
      : favorites.map(f => f.questionId);
    
    if (questionIds.length === 0) {
      toast.warning('没有可练习的题目');
      return;
    }

    navigate('/quiz', {
      state: { questionIds },
    });
  };

  const selectedFolder = folders.find(f => f._id === selectedFolderId);

  if (!user) {
    return (
      <div className="p-6 text-center">
        <div className="text-slate-500">请先登录</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">我的收藏</h1>
        {stats && (
          <div className="text-sm text-slate-600">
            共收藏 {stats.total || 0} 道题目
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：收藏夹列表 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">收藏夹</h2>
              <button
                onClick={() => {
                  setEditingFolder(null);
                  setFolderForm({ name: '', description: '', color: '#3B82F6', icon: '⭐' });
                  setShowFolderModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                + 新建
              </button>
            </div>
            <div className="space-y-2">
              {folders.map(folder => (
                <div
                  key={folder._id}
                  onClick={() => {
                    setSelectedFolderId(folder._id);
                    setPage(1);
                    setSelectedQuestionIds([]);
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFolderId === folder._id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span>{folder.icon}</span>
                      <span className="font-medium truncate">{folder.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {folder.questionCount || 0}
                    </span>
                  </div>
                  {folder.description && (
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {folder.description}
                    </div>
                  )}
                  {!folder.isDefault && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                          setFolderForm({
                            name: folder.name,
                            description: folder.description || '',
                            color: folder.color || '#3B82F6',
                            icon: folder.icon || '⭐',
                          });
                          setShowFolderModal(true);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        编辑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder._id);
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：收藏列表 */}
        <div className="lg:col-span-3">
          {selectedFolder && (
            <>
              {/* 工具栏 */}
              <div className="bg-white rounded-lg border p-4 mb-4">
                <div className="flex flex-wrap items-center gap-4">
                  <input
                    type="text"
                    placeholder="搜索题目..."
                    value={searchKeyword}
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      setPage(1);
                    }}
                    className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={handleStartPractice}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedQuestionIds.length > 0
                      ? `练习选中 (${selectedQuestionIds.length})`
                      : `练习全部 (${favorites.length})`}
                  </button>
                  {selectedQuestionIds.length > 0 && (
                    <button
                      onClick={handleBatchRemove}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      批量删除 ({selectedQuestionIds.length})
                    </button>
                  )}
                </div>
              </div>

              {/* 收藏列表 */}
              {fromGroup && groupName && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 mb-4">
                  正在为小组「{groupName}」添加题目，点击题目下方的「加入小组题库」即可加入。
                </div>
              )}
              {favoritesLoading ? (
                <div className="text-center py-12 text-slate-500">加载中...</div>
              ) : favorites.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-12">
                  <EmptyState
                    icon="star"
                    title={searchKeyword ? '未找到相关题目' : '当前收藏夹为空'}
                    description={
                      searchKeyword
                        ? '尝试换一个关键词搜索，或清空搜索查看全部收藏。'
                        : '做题或浏览题目时点击收藏，题目会出现在这里。下一步：去练习并收藏题目。'
                    }
                    actionLink={searchKeyword ? undefined : '/quiz'}
                    actionLabel={searchKeyword ? undefined : '去练习'}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-4">
                    {favorites.map(favorite => {
                      const question = favorite.question;
                      if (!question) return null;

                      const isSelected = selectedQuestionIds.includes(favorite.questionId);

                      return (
                        <div
                          key={favorite._id}
                          className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQuestionIds([...selectedQuestionIds, favorite.questionId]);
                                } else {
                                  setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== favorite.questionId));
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  {(() => {
                                    const typeMap = {
                                      single: '单选题',
                                      multiple: '多选题',
                                      judge: '判断题',
                                      fill: '填空题',
                                      short: '简答题',
                                      coding: '编程题',
                                    };
                                    return typeMap[question.type] || '单选题';
                                  })()}
                                </span>
                                {question.difficulty && (
                                  <span className="text-xs text-slate-500">
                                    难度：{question.difficulty}
                                  </span>
                                )}
                                <span className="text-xs text-slate-500">
                                  收藏于：{new Date(favorite.favoritedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-slate-800 mb-2 line-clamp-2">
                                {question.content}
                              </div>
                              {favorite.notes && (
                                <div className="text-sm text-slate-600 mb-2 bg-yellow-50 p-2 rounded">
                                  备注：{favorite.notes}
                                </div>
                              )}
                              {favorite.tags && favorite.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {favorite.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  onClick={() => navigate(`/questions/${question._id || question.id}/detail`)}
                                  className="px-3 py-1 text-sm border rounded-lg hover:bg-slate-50"
                                >
                                  查看详情
                                </button>
                                <button
                                  onClick={() => {
                                    navigate('/quiz', {
                                      state: { questionIds: [favorite.questionId] },
                                    });
                                  }}
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  练习
                                </button>
                                {fromGroup && favorite.questionId && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await addGroupSharedQuestion(fromGroup, { questionId: favorite.questionId, type: 'good' });
                                        toast.success('已加入小组题库');
                                      } catch (err) {
                                        toast.error(err.message || '加入失败');
                                      }
                                    }}
                                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    加入小组题库
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveFavorite(favorite.questionId)}
                                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                                >
                                  取消收藏
                                </button>
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
            </>
          )}
        </div>
      </div>

      {/* 收藏夹编辑弹窗 */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editingFolder ? '编辑收藏夹' : '新建收藏夹'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名称 *</label>
                <input
                  type="text"
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="请输入收藏夹名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={folderForm.description}
                  onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="请输入收藏夹描述"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">颜色</label>
                  <input
                    type="color"
                    value={folderForm.color}
                    onChange={(e) => setFolderForm({ ...folderForm, color: e.target.value })}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">图标</label>
                  <input
                    type="text"
                    value={folderForm.icon}
                    onChange={(e) => setFolderForm({ ...folderForm, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="⭐"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setEditingFolder(null);
                  setFolderForm({ name: '', description: '', color: '#3B82F6', icon: '⭐' });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingFolder ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

