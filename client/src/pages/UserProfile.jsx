/**
 * GraphTutor - 用户公开资料页
 * 路由：/users/:id
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Icon from '../components/common/Icon';
import { useAuth } from '../context/AuthContext';
import { getPublicUserProfile, sendFriendRequest } from '../api/v3/friends';
import { toast } from '../utils/toast';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const me = user?.id || user?._id;
      if (me && String(me) === String(id)) {
        navigate('/profile', { replace: true });
        return;
      }
      setLoading(true);
      try {
        const data = await getPublicUserProfile(id);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message || err.message || '加载资料失败');
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id, user?._id, navigate]);

  const handleAddFriend = async () => {
    try {
      setSending(true);
      await sendFriendRequest(id, '');
      toast.success('好友请求已发送');
      setProfile((prev) => (prev ? { ...prev, relationship: 'request_sent' } : prev));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="用户资料" subtitle="加载中…" />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="用户资料" subtitle="未找到该用户" />
        <div className="card p-8 text-center space-y-3">
          <p className="text-slate-600 dark:text-slate-400">该用户不存在或无法查看。</p>
          <Link to="/friends/discover" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            去发现好友 →
          </Link>
        </div>
      </div>
    );
  }

  const rel = profile.relationship;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title="用户资料" subtitle="查看公开信息并添加好友" />

      <div className="card p-6 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-5 min-w-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0">
              {(profile.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {profile.name}
            </h2>
            {profile.profileRestricted ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                对方已限制展示详细资料。
              </p>
            ) : (
              <>
                {(profile.school || profile.major || profile.grade) && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {[profile.school, profile.major, profile.grade].filter(Boolean).join(' · ')}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          {rel === 'friend' && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/messages?userId=${id}`)}
                className="flex-1 min-w-[8rem] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center justify-center gap-2"
              >
                <Icon name="message-circle" className="h-4 w-4" />
                发消息
              </button>
              <button
                type="button"
                onClick={() => navigate(`/friends/${id}`)}
                className="flex-1 min-w-[8rem] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                查看学习详情
              </button>
            </>
          )}
          {rel === 'none' && profile.allowFriendRequests !== false && (
            <button
              type="button"
              disabled={sending}
              onClick={handleAddFriend}
              className="flex-1 min-w-[8rem] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? '发送中…' : '添加好友'}
            </button>
          )}
          {rel === 'request_sent' && (
            <span className="px-4 py-2 text-sm text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-lg">
              已发送好友请求
            </span>
          )}
          {rel === 'request_received' && (
            <button
              type="button"
              onClick={() => navigate('/friends?tab=requests')}
              className="flex-1 min-w-[8rem] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查看好友请求
            </button>
          )}
          <Link
            to="/friends/discover"
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:underline"
          >
            发现更多好友
          </Link>
        </div>
      </div>
    </div>
  );
}
