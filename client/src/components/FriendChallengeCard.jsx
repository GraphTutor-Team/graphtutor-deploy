/**
 * GraphTutor V3.0 - 好友挑战卡片组件
 * 
 * 功能：显示单个好友挑战的详细信息
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  acceptChallenge,
  cancelChallenge,
  updateChallengeProgress,
} from '../api/v3/friendChallenges';
import { toast } from '../utils/toast';
import Icon from './common/Icon';

export default function FriendChallengeCard({ challenge, onUpdate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // 处理 populate 后的数据结构
  const creatorId = typeof challenge.creatorId === 'string' 
    ? challenge.creatorId 
    : challenge.creatorId?._id || challenge.creatorId;
  const participantId = typeof challenge.participantId === 'string'
    ? challenge.participantId
    : challenge.participantId?._id || challenge.participantId;
  
  const isCreator = creatorId?.toString() === user?.id;
  const isParticipant = participantId?.toString() === user?.id;
  const canAccept = !isCreator && challenge.status === 'pending';
  const canCancel = (isCreator || isParticipant) && challenge.status !== 'completed' && challenge.status !== 'failed';

  const handleAccept = async () => {
    try {
      setLoading(true);
      await acceptChallenge(challenge._id);
      toast.success('挑战已接受');
      onUpdate?.();
    } catch (err) {
      console.error('接受挑战失败:', err);
      toast.error(err.response?.data?.message || '接受挑战失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('确定要取消这个挑战吗？')) return;
    try {
      setLoading(true);
      await cancelChallenge(challenge._id);
      toast.success('挑战已取消');
      onUpdate?.();
    } catch (err) {
      console.error('取消挑战失败:', err);
      toast.error(err.response?.data?.message || '取消挑战失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    try {
      setLoading(true);
      await updateChallengeProgress(challenge._id);
      toast.success('进度已更新');
      onUpdate?.();
    } catch (err) {
      console.error('更新进度失败:', err);
      toast.error(err.response?.data?.message || '更新进度失败');
    } finally {
      setLoading(false);
    }
  };

  const creatorProgress = challenge.target > 0 
    ? ((challenge.creatorProgress || 0) / challenge.target * 100).toFixed(1)
    : 0;
  const participantProgress = challenge.target > 0
    ? ((challenge.participantProgress || 0) / challenge.target * 100).toFixed(1)
    : 0;
  
  const creatorName = typeof challenge.creatorId === 'object' 
    ? (challenge.creatorId?.name || challenge.creatorId?.email || '未知用户')
    : '未知用户';
  const participantName = typeof challenge.participantId === 'object'
    ? (challenge.participantId?.name || challenge.participantId?.email || '未知用户')
    : '未知用户';

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {challenge.title}
          </h3>
          {challenge.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {challenge.description}
            </p>
          )}
          <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>目标：{challenge.target} 题</span>
            <span>类型：{challenge.type === 'daily' ? '每日' : challenge.type === 'weekly' ? '每周' : challenge.type === 'monthly' ? '每月' : '自定义'}</span>
            <span>结束：{new Date(challenge.endDate).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
        <div className="ml-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            challenge.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
            challenge.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
            challenge.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {challenge.status === 'active' ? '进行中' :
             challenge.status === 'completed' ? '已完成' :
             challenge.status === 'pending' ? '待接受' :
             challenge.status === 'failed' ? '已失败' : '已取消'}
          </span>
        </div>
      </div>

      {/* 进度显示 */}
      {challenge.status === 'active' && (
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">
                {isCreator ? '我' : creatorName}
              </span>
              <span className="font-medium">{challenge.creatorProgress} / {challenge.target}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(creatorProgress, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">
                {isParticipant ? '我' : participantName}
              </span>
              <span className="font-medium">{challenge.participantProgress} / {challenge.target}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(participantProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center space-x-2 mt-4">
        {canAccept && (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Icon name="check" className="h-4 w-4" />
            <span>接受挑战</span>
          </button>
        )}
        {challenge.status === 'active' && (
          <button
            onClick={handleUpdateProgress}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Icon name="refresh-cw" className="h-4 w-4" />
            <span>更新进度</span>
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Icon name="x" className="h-4 w-4" />
            <span>取消</span>
          </button>
        )}
        <Link
          to={`/friends/${isCreator ? participantId : creatorId}`}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center space-x-2"
        >
          <Icon name="user" className="h-4 w-4" />
          <span>查看好友</span>
        </Link>
      </div>
    </div>
  );
}

