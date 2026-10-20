/**
 * GraphTutor V3.0 - 好友管理页面
 * 
 * 作用：提供完整的好友管理功能，包括好友列表、好友请求管理、快速操作等
 * 关联页面：
 *   - api/v3/friends.js (好友API)
 *   - pages/FriendsDiscover.jsx (好友发现页面)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - Tailwind CSS
 *   - 分页和搜索
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  deleteFriend,
  blockFriend,
} from '../api/v3/friends';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import SocialHubNav from '../components/SocialHubNav';
import Icon from '../components/common/Icon';
import EmptyState from '../components/common/EmptyState';

export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [requestTotalPages, setRequestTotalPages] = useState(1);

  useEffect(() => {
    if (user) {
      if (activeTab === 'friends') {
        loadFriends();
      } else {
        loadFriendRequests();
      }
    }
  }, [user, activeTab, page, requestPage]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const data = await getFriends({ page, limit: 20 });
      setFriends(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('加载好友列表失败:', err);
      toast.error('加载好友列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      setLoading(true);
      const [receivedData, sentData] = await Promise.all([
        getFriendRequests({ type: 'received', page: requestPage, limit: 20 }),
        getFriendRequests({ type: 'sent', page: requestPage, limit: 20 }),
      ]);
      setFriendRequests(receivedData.items || []);
      setSentRequests(sentData.items || []);
      setRequestTotalPages(Math.max(receivedData.totalPages || 1, sentData.totalPages || 1));
    } catch (err) {
      console.error('加载好友请求失败:', err);
      toast.error('加载好友请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      toast.success('好友请求已接受');
      loadFriendRequests();
      if (activeTab === 'friends') {
        loadFriends();
      }
    } catch (err) {
      console.error('接受请求失败:', err);
      toast.error(err.response?.data?.message || '接受请求失败');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      toast.success('好友请求已拒绝');
      loadFriendRequests();
    } catch (err) {
      console.error('拒绝请求失败:', err);
      toast.error(err.response?.data?.message || '拒绝请求失败');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await cancelFriendRequest(requestId);
      toast.success('好友请求已取消');
      loadFriendRequests();
    } catch (err) {
      console.error('取消请求失败:', err);
      toast.error(err.response?.data?.message || '取消请求失败');
    }
  };

  const handleDeleteFriend = async (friendId) => {
    if (!confirm('确定要删除这个好友吗？')) {
      return;
    }
    try {
      await deleteFriend(friendId);
      toast.success('好友已删除');
      loadFriends();
    } catch (err) {
      console.error('删除好友失败:', err);
      toast.error(err.response?.data?.message || '删除好友失败');
    }
  };

  const handleBlockFriend = async (friendId) => {
    if (!confirm('确定要屏蔽这个好友吗？屏蔽后你们将无法看到对方的信息。')) {
      return;
    }
    try {
      await blockFriend(friendId);
      toast.success('好友已屏蔽');
      loadFriends();
    } catch (err) {
      console.error('屏蔽好友失败:', err);
      toast.error(err.response?.data?.message || '屏蔽好友失败');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="好友"
        subtitle="好友列表与请求"
      />

      <SocialHubNav />

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate('/friends/discover')}
            className="btn btn-outline"
          >
            发现好友
          </button>
          <button
            type="button"
            onClick={() => navigate('/friend-challenges')}
            className="btn btn-outline"
          >
            好友挑战
          </button>
          <button
            type="button"
            onClick={() => navigate('/learning-posts')}
            className="btn btn-outline"
          >
            学习动态
          </button>
        </div>

        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('friends');
                  setPage(1);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'friends'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                我的好友 ({friends.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('requests');
                  setRequestPage(1);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                好友请求
                {friendRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {friendRequests.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* 好友列表 */}
        {activeTab === 'friends' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
              </div>
            ) : friends.length === 0 ? (
              <EmptyState
                icon="users"
                title="还没有好友"
                description="添加好友后可以一起练习、比拼和讨论。也可以先看使用教程，或去做几道题。"
                actionLink="/friends/discover"
                actionLabel="去发现好友"
                secondaryLink="/home?guide=1"
                secondaryLabel="使用教程"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {friends.map((friend) => (
                    <div
                      key={friend._id}
                      className="surface !p-4 hover:border-blue-200 dark:hover:border-slate-600 transition-colors flex flex-col gap-3 min-w-0"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/friends/${friend._id}`)}
                        >
                          <div className="flex-shrink-0">
                            {friend.avatarUrl ? (
                              <img
                                src={friend.avatarUrl}
                                alt={friend.name}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                {friend.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {friend.name || friend.email}
                            </h3>
                            {friend.school && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                {friend.school}
                              </p>
                            )}
                            {friend.major && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                {friend.major}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="relative flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const menu = document.getElementById(`menu-${friend._id}`);
                              menu?.classList.toggle('hidden');
                            }}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            aria-label="更多操作"
                          >
                            <Icon name="dots-vertical" className="h-5 w-5" />
                          </button>
                          <div
                            id={`menu-${friend._id}`}
                            className="hidden absolute right-0 mt-1 w-40 bg-white dark:bg-slate-700 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-600"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById(`menu-${friend._id}`)?.classList.add('hidden');
                                handleDeleteFriend(friend._id);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-600"
                            >
                              删除好友
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById(`menu-${friend._id}`)?.classList.add('hidden');
                                handleBlockFriend(friend._id);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                            >
                              屏蔽好友
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/messages?userId=${friend._id}`);
                          }}
                          className="flex-1 min-w-[6.5rem] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          发消息
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/friends/${friend._id}`)}
                          className="flex-1 min-w-[6.5rem] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
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

        {/* 好友请求 */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* 收到的请求 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                收到的请求 ({friendRequests.length})
              </h3>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : friendRequests.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400">暂无待处理的好友请求</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendRequests.map((request) => (
                    <div
                      key={request._id}
                      className="surface !p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {request.fromUserId?.avatarUrl ? (
                          <img
                            src={request.fromUserId.avatarUrl}
                            alt={request.fromUserId.name}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {request.fromUserId?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {request.fromUserId?.name || request.fromUserId?.email}
                          </h4>
                          {request.message && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {request.message}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(request._id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          接受
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(request._id)}
                          className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 发送的请求 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                发送的请求 ({sentRequests.length})
              </h3>
              {sentRequests.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400">暂无发送的好友请求</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div
                      key={request._id}
                      className="surface !p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {request.toUserId?.avatarUrl ? (
                          <img
                            src={request.toUserId.avatarUrl}
                            alt={request.toUserId.name}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {request.toUserId?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {request.toUserId?.name || request.toUserId?.email}
                          </h4>
                          {request.message && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {request.message}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {request.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(request._id)}
                            className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium"
                          >
                            取消
                          </button>
                        )}
                        {request.status === 'accepted' && (
                          <span className="px-4 py-2 text-sm text-green-600 dark:text-green-400">
                            已接受
                          </span>
                        )}
                        {request.status === 'rejected' && (
                          <span className="px-4 py-2 text-sm text-red-600 dark:text-red-400">
                            已拒绝
                          </span>
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

