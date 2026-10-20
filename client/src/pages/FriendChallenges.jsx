/**
 * GraphTutor V3.0 - 好友挑战页面
 * 
 * 作用：管理好友之间的学习挑战
 */

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriendChallenges, getChallengeStats } from '../api/v3/friendChallenges';
import { getFriends } from '../api/v3/friends';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import SocialHubNav from '../components/SocialHubNav';
import LoginPrompt from '../components/common/LoginPrompt';
import Icon from '../components/common/Icon';
import FriendChallengeCard from '../components/FriendChallengeCard';
import CreateChallengeModal from '../components/CreateChallengeModal';

export default function FriendChallenges() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');

  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, active, pending, completed
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab, friendId]);

  useEffect(() => {
    if (friendId && user) {
      setShowCreateModal(true);
    }
  }, [friendId, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengesRes, statsRes, friendsRes] = await Promise.all([
        getFriendChallenges({ status: activeTab === 'all' ? null : activeTab }),
        getChallengeStats(),
        getFriends(),
      ]);

      setChallenges(challengesRes.data?.items || []);
      setStats(statsRes.data || null);
      // getFriends 已解包为 data，直接取 items
      setFriends(friendsRes.items || []);
    } catch (err) {
      console.error('加载挑战数据失败:', err);
      toast.error('加载挑战数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后发起挑战"
        description="登录后可与好友发起学习挑战。也可先看教程，或去做题。"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PageHeader
        title="好友挑战"
        description="与好友一起学习，互相激励"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SocialHubNav />
        {/* 创建挑战按钮 */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Icon name="plus" className="h-5 w-5" />
            <span>发起挑战</span>
          </button>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">总挑战数</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total || 0}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">进行中</div>
              <div className="text-2xl font-bold text-blue-600">{stats.active || 0}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">已完成</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">胜率</div>
              <div className="text-2xl font-bold text-blue-600">{stats.winRate || 0}%</div>
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              {['all', 'pending', 'active', 'completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  {tab === 'all' ? '全部' : tab === 'pending' ? '待接受' : tab === 'active' ? '进行中' : '已完成'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 挑战列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="trophy" className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">暂无挑战</p>
            {friendId ? (
              <Link
                to={`/friends/${friendId}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                返回好友详情
              </Link>
            ) : (
              <Link
                to="/friends"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                去添加好友
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <FriendChallengeCard key={challenge._id} challenge={challenge} onUpdate={loadData} />
            ))}
          </div>
        )}
      </div>

      {/* 创建挑战模态框 */}
      {showCreateModal && (
        <CreateChallengeModal
          friends={friends}
          initialFriendId={friendId || ''}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

