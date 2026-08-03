/**
 * GraphTutor V3.0 - 好友详情页面
 * 
 * 作用：显示好友详细信息、学习统计、学习数据对比和共同学习内容
 * 关联页面：
 *   - api/v3/friends.js (好友API)
 *   - pages/Friends.jsx (好友管理页面)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - React Router (useParams, useNavigate)
 *   - Recharts (数据可视化)
 *   - Tailwind CSS
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getFriendLearningStats,
  compareLearningData,
  getCommonLearningContent,
  getFriends,
  getFriendsLeaderboard,
  checkFriendship,
} from '../api/v3/friends';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import LoginPrompt from '../components/common/LoginPrompt';
import Icon from '../components/common/Icon';
import FriendStatsSection from '../components/friends/FriendStatsSection';
import FriendComparisonSection from '../components/friends/FriendComparisonSection';
import FriendCommonContentSection from '../components/friends/FriendCommonContentSection';
import FriendLeaderboardSection from '../components/friends/FriendLeaderboardSection';

export default function FriendDetail() {
  const { id: friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [friend, setFriend] = useState(null);
  const [stats, setStats] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [commonContent, setCommonContent] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [privacyRestricted, setPrivacyRestricted] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // stats, compare, common, leaderboard
  const [days, setDays] = useState(30);
  const [leaderboardType, setLeaderboardType] = useState('total');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');

  useEffect(() => {
    if (user && friendId) {
      loadFriendInfo();
      if (activeTab !== 'leaderboard') {
        loadStats();
      }
    }
  }, [user, friendId, days, activeTab]);

  useEffect(() => {
    if (user && activeTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [user, activeTab, leaderboardType, leaderboardPeriod]);

  const loadFriendInfo = async () => {
    try {
      const data = await getFriends({ page: 1, limit: 100 });
      const found = (data.items || []).find(
        (f) => String(f._id) === String(friendId)
      );
      if (found) {
        setFriend(found);
        return;
      }
      // 非好友：转到公开资料页，避免空白详情
      const isFriend = await checkFriendship(friendId).catch(() => false);
      if (!isFriend) {
        navigate(`/users/${friendId}`, { replace: true });
        return;
      }
      toast.error('未找到该好友信息');
    } catch (err) {
      console.error('加载好友信息失败:', err);
      toast.error('加载好友信息失败');
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      setPrivacyRestricted(false);
      const [statsData, comparisonData, commonData] = await Promise.all([
        getFriendLearningStats(friendId, { days }).catch(err => {
          const msg = err.response?.data?.message || '';
          if (
            err.response?.status === 403 ||
            err.response?.status === 400 ||
            msg.includes('隐私') ||
            msg.includes('不是好友')
          ) {
            setPrivacyRestricted(true);
            return null;
          }
          throw err;
        }),
        compareLearningData(friendId, { days }).catch(err => {
          const msg = err.response?.data?.message || '';
          if (
            err.response?.status === 403 ||
            err.response?.status === 400 ||
            msg.includes('隐私') ||
            msg.includes('不是好友')
          ) {
            return null;
          }
          throw err;
        }),
        getCommonLearningContent(friendId, { limit: 20 }).catch(err => {
          const msg = err.response?.data?.message || '';
          if (
            err.response?.status === 403 ||
            err.response?.status === 400 ||
            msg.includes('隐私') ||
            msg.includes('不是好友')
          ) {
            return null;
          }
          throw err;
        }),
      ]);
      setStats(statsData);
      setComparison(comparisonData);
      setCommonContent(commonData);
    } catch (err) {
      console.error('加载数据失败:', err);
      if (err.response?.status !== 403) {
        toast.error(err.response?.data?.message || '加载数据失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getFriendsLeaderboard({
        type: leaderboardType,
        period: leaderboardPeriod,
        limit: 50,
      });
      setLeaderboard(data);
    } catch (err) {
      console.error('加载好友排行榜失败:', err);
      toast.error(err.response?.data?.message || '加载好友排行榜失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后查看好友详情"
        description="登录后可查看好友学习数据。也可先看教程，或去做题。"
      />
    );
  }

  if (loading && !friend) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PageHeader
        title={friend ? `${friend.name || friend.email} - 好友详情` : '好友详情'}
        description="查看好友的学习统计和对比数据"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/friends')}
          className="mb-6 flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <Icon name="arrow-left" className="h-5 w-5 mr-2" />
          返回好友列表
        </button>

        {/* 好友基本信息卡片 */}
        {friend && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                {friend.avatarUrl ? (
                  <img
                    src={friend.avatarUrl}
                    alt={friend.name}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0">
                    {friend.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                    {friend.name || friend.email}
                  </h2>
                  {friend.email && friend.name && (
                    <p className="text-slate-500 dark:text-slate-400 mt-1 truncate">{friend.email}</p>
                  )}
                  {friend.school && (
                    <p className="text-slate-600 dark:text-slate-300 mt-2 truncate">
                      <Icon name="school" className="inline h-4 w-4 mr-1" />
                      {friend.school}
                    </p>
                  )}
                  {friend.major && (
                    <p className="text-slate-500 dark:text-slate-400 truncate">{friend.major}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(`/messages?userId=${friendId}`)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Icon name="message-circle" className="h-4 w-4" />
                  <span>发消息</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/friend-challenges?friendId=${friendId}`)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Icon name="trophy" className="h-4 w-4" />
                  <span>发起挑战</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 时间范围选择 */}
        <div className="mb-6 flex items-center space-x-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            统计时间范围：
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value={7}>最近7天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
            <option value={180}>最近180天</option>
          </select>
        </div>

        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                学习统计
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'compare'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                数据对比
              </button>
              <button
                onClick={() => setActiveTab('common')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'common'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                共同学习
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'leaderboard'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                好友排行
              </button>
            </nav>
          </div>
        </div>

        {/* 隐私提示 */}
        {privacyRestricted && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Icon name="lock" className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  隐私设置限制
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  该好友已设置隐私，不允许查看学习数据。您只能查看基本信息。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
          </div>
        ) : privacyRestricted ? (
          <div className="text-center py-12">
            <Icon name="lock" className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              该好友已设置隐私，不允许查看学习数据
            </p>
          </div>
        ) : (
          <>
            {/* 学习统计标签页 */}
            {activeTab === 'stats' && stats && (
              <div className="space-y-6">
                <FriendStatsSection stats={stats} />
              </div>
            )}

            {/* 数据对比标签页 */}
            {activeTab === 'compare' && comparison && (
              <div className="space-y-6">
                <FriendComparisonSection comparison={comparison} />
              </div>
            )}

            {/* 共同学习标签页 */}
            {activeTab === 'common' && commonContent && (
              <div className="space-y-6">
                <FriendCommonContentSection commonContent={commonContent} />
              </div>
            )}

            {/* 好友排行榜标签页 */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-6">
                <FriendLeaderboardSection
                  leaderboard={leaderboard}
                  type={leaderboardType}
                  period={leaderboardPeriod}
                  onTypeChange={setLeaderboardType}
                  onPeriodChange={setLeaderboardPeriod}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
