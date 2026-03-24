/**
 * GraphTutor V3.0 - 好友发现页面
 * 
 * 作用：提供好友发现功能，包括用户搜索、推荐好友、查看用户资料等
 * 关联页面：
 *   - api/v3/friends.js (好友API)
 *   - pages/Friends.jsx (好友管理页面)
 * 技术栈：
 *   - React Hooks (useState, useEffect, useDebounce)
 *   - Tailwind CSS
 *   - 搜索和推荐
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  searchUsers,
  getRecommendedFriends,
  sendFriendRequest,
  checkFriendship,
  getMutualFriends,
} from '../api/v3/friends';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import Icon from '../components/common/Icon';
import { useDebounce } from '../hooks/useDebounce';

export default function FriendsDiscover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('search'); // search, recommendations
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [showMutualFriends, setShowMutualFriends] = useState(false);

  const debouncedSearch = useDebounce(searchKeyword, 500);

  useEffect(() => {
    if (user) {
      if (activeTab === 'recommendations') {
        loadRecommendations();
      }
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (debouncedSearch && debouncedSearch.trim().length > 0) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, page]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const data = await searchUsers({
        keyword: debouncedSearch,
        page,
        limit: 20,
      });
      setSearchResults(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('搜索用户失败:', err);
      toast.error('搜索用户失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await getRecommendedFriends({ limit: 20 });
      setRecommendations(data || []);
    } catch (err) {
      console.error('加载推荐好友失败:', err);
      toast.error('加载推荐好友失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (toUserId, message = '') => {
    try {
      await sendFriendRequest(toUserId, message);
      toast.success('好友请求已发送');
      // 更新搜索结果中的关系状态
      setSearchResults(prev => prev.map(u => 
        u._id === toUserId ? { ...u, relationship: 'request_sent' } : u
      ));
      setRecommendations(prev => prev.map(u => 
        u._id === toUserId ? { ...u, relationship: 'request_sent' } : u
      ));
    } catch (err) {
      console.error('发送请求失败:', err);
      toast.error(err.response?.data?.message || '发送请求失败');
    }
  };

  const handleViewMutualFriends = async (userId) => {
    try {
      const mutual = await getMutualFriends(userId);
      setMutualFriends(mutual);
      setSelectedUser(userId);
      setShowMutualFriends(true);
    } catch (err) {
      console.error('获取共同好友失败:', err);
      toast.error('获取共同好友失败');
    }
  };

  const getRelationshipButton = (targetUser) => {
    if (targetUser.relationship === 'friend') {
      return (
        <button
          onClick={() => navigate(`/friends`)}
          className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm font-medium"
        >
          已是好友
        </button>
      );
    }
    if (targetUser.relationship === 'request_sent') {
      return (
        <button
          disabled
          className="px-4 py-2 bg-slate-100 text-slate-500 rounded-md text-sm font-medium cursor-not-allowed"
        >
          已发送请求
        </button>
      );
    }
    if (targetUser.relationship === 'request_received') {
      return (
        <button
          onClick={() => navigate(`/friends?tab=requests`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          查看请求
        </button>
      );
    }
    return (
      <button
        onClick={() => handleSendRequest(targetUser._id)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        添加好友
      </button>
    );
  };

  const UserCard = ({ user: targetUser }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex-shrink-0">
            {targetUser.avatarUrl ? (
              <img
                src={targetUser.avatarUrl}
                alt={targetUser.name}
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xl">
                {targetUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              {targetUser.name || targetUser.email}
            </h3>
            {targetUser.email && targetUser.name && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {targetUser.email}
              </p>
            )}
            {targetUser.school && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                <Icon name="school" className="inline h-4 w-4 mr-1" />
                {targetUser.school}
              </p>
            )}
            {targetUser.major && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {targetUser.major}
              </p>
            )}
            {targetUser.grade && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {targetUser.grade}
              </p>
            )}
            {targetUser.bio && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                {targetUser.bio}
              </p>
            )}
            {targetUser.mutualFriendsCount !== undefined && targetUser.mutualFriendsCount > 0 && (
              <button
                onClick={() => handleViewMutualFriends(targetUser._id)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                {targetUser.mutualFriendsCount} 个共同好友
              </button>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          {getRelationshipButton(targetUser)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PageHeader
        title="发现好友"
        description="搜索用户或查看推荐好友"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('search');
                  setSearchResults([]);
                  setSearchKeyword('');
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                搜索用户
              </button>
              <button
                onClick={() => {
                  setActiveTab('recommendations');
                  loadRecommendations();
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recommendations'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                推荐好友
              </button>
            </nav>
          </div>
        </div>

        {/* 搜索标签页 */}
        {activeTab === 'search' && (
          <div>
            {/* 搜索框 */}
            <div className="mb-6">
              <div className="relative">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="搜索用户（姓名、邮箱、学校、专业）"
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 搜索结果 */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">搜索中...</p>
              </div>
            ) : searchKeyword.trim().length === 0 ? (
              <div className="text-center py-12">
                <Icon name="search" className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  搜索用户
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  输入关键词搜索用户（姓名、邮箱、学校、专业）
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="user-x" className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  未找到用户
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  尝试使用其他关键词搜索
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((result) => (
                    <UserCard key={result._id} user={result} />
                  ))}
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                        第 {page} / {totalPages} 页
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 推荐标签页 */}
        {activeTab === 'recommendations' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="users" className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  暂无推荐
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  系统暂时没有推荐的好友
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((recommendation) => (
                  <UserCard key={recommendation._id} user={recommendation} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 共同好友模态框 */}
        {showMutualFriends && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  共同好友
                </h3>
                <button
                  onClick={() => {
                    setShowMutualFriends(false);
                    setMutualFriends([]);
                    setSelectedUser(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Icon name="x" className="h-6 w-6" />
                </button>
              </div>
              {mutualFriends.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">暂无共同好友</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {mutualFriends.map((friend) => (
                    <div
                      key={friend._id}
                      className="flex items-center space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded"
                    >
                      {friend.avatarUrl ? (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {friend.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {friend.name || friend.email}
                        </p>
                        {friend.school && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {friend.school}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

