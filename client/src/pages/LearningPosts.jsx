/**
 * GraphTutor V3.0 - 学习动态页面
 * 
 * 作用：展示和管理学习动态
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLearningPosts } from '../api/v3/learningPosts';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import LearningPostCard from '../components/LearningPostCard';
import CreatePostModal from '../components/CreatePostModal';
import Icon from '../components/common/Icon';
import LoginPrompt from '../components/common/LoginPrompt';

export default function LearningPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, achievement, checkin, challenge
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user, activeTab]);

  const loadPosts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getLearningPosts({
        page,
        limit: 20,
        type: activeTab === 'all' ? null : activeTab,
      });

      if (page === 1) {
        setPosts(res.data?.items || []);
      } else {
        setPosts((prev) => [...prev, ...(res.data?.items || [])]);
      }

      setPagination({
        page: res.data?.page || 1,
        total: res.data?.total || 0,
        totalPages: res.data?.totalPages || 0,
      });
    } catch (err) {
      console.error('加载动态失败:', err);
      toast.error('加载动态失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = () => {
    loadPosts(1);
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后查看学习动态"
        description="登录后可浏览与发布学习动态。也可先看教程，或直接开始练习。"
      />
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="学习动态"
        description="分享你的学习成果，与好友一起进步"
      />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <Link
              to="/community"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              学习社区
            </Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link
              to="/friends"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              好友
            </Link>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <Link
              to="/friend-challenges"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              好友挑战
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Icon name="plus" className="h-5 w-5" />
            <span>发布动态</span>
          </button>
        </div>

        {/* 标签页 */}
        <div>
          <div className="border-b border-slate-200/80 dark:border-slate-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: '全部' },
                { key: 'achievement', label: '成就' },
                { key: 'checkin', label: '打卡' },
                { key: 'challenge', label: '挑战' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 动态列表 */}
        {loading && posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="surface text-center !py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-4">暂无动态</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                发布第一条动态
              </button>
              <Link to="/home?guide=1" className="btn btn-outline">
                使用教程
              </Link>
              <Link to="/quiz" className="btn btn-outline">
                去练习
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <LearningPostCard key={post._id} post={post} onUpdate={handlePostUpdate} />
              ))}
            </div>

            {/* 加载更多 */}
            {pagination.page < pagination.totalPages && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => loadPosts(pagination.page + 1)}
                  disabled={loading}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 创建动态模态框 */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            handlePostUpdate();
          }}
        />
      )}
    </div>
  );
}

