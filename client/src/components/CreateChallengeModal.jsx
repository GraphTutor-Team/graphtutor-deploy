/**
 * GraphTutor V3.0 - 创建挑战模态框组件
 * 
 * 功能：创建新的好友挑战
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createFriendChallenge } from '../api/v3/friendChallenges';
import { toast } from '../utils/toast';
import Icon from './common/Icon';

export default function CreateChallengeModal({ friends, onClose, onSuccess, initialFriendId = '' }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    participantId: initialFriendId || '',
    title: '',
    description: '',
    target: 10,
    type: 'daily',
    endDate: '',
    difficulty: 'medium',
    reward: '',
  });

  useEffect(() => {
    if (initialFriendId) {
      setFormData((prev) => ({ ...prev, participantId: initialFriendId }));
    }
  }, [initialFriendId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.participantId) {
      toast.error('请选择挑战对象');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('请输入挑战标题');
      return;
    }

    if (formData.target < 1) {
      toast.error('目标数量必须大于0');
      return;
    }

    if (!formData.endDate) {
      toast.error('请选择结束时间');
      return;
    }

    if (new Date(formData.endDate) <= new Date()) {
      toast.error('结束时间必须晚于当前时间');
      return;
    }

    try {
      setLoading(true);
      await createFriendChallenge(formData.participantId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        target: formData.target,
        type: formData.type,
        endDate: formData.endDate,
        difficulty: formData.difficulty,
        reward: formData.reward.trim(),
      });
      toast.success('挑战创建成功');
      onSuccess?.();
    } catch (err) {
      console.error('创建挑战失败:', err);
      toast.error(err.response?.data?.message || '创建挑战失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'target' ? parseInt(value, 10) || 0 : value,
    }));
  };

  // 计算默认结束时间（根据类型）
  const getDefaultEndDate = (type) => {
    const now = new Date();
    const endDate = new Date();
    
    switch (type) {
      case 'daily':
        endDate.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        endDate.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(now.getMonth() + 1);
        break;
      default:
        endDate.setDate(now.getDate() + 7);
    }
    
    return endDate.toISOString().slice(0, 16);
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      type: newType,
      endDate: prev.endDate || getDefaultEndDate(newType),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div
          className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* 模态框 */}
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-md transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              发起好友挑战
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-4">
              {/* 选择好友 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  挑战对象 <span className="text-red-500">*</span>
                </label>
                <select
                  name="participantId"
                  value={formData.participantId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">请选择好友</option>
                  {friends.map((friend) => {
                    const friendUser = friend.user1Id?._id === user?.id ? friend.user2Id : friend.user1Id;
                    return (
                      <option key={friend._id} value={friendUser?._id || friendUser}>
                        {friendUser?.name || friendUser?.email || '未知用户'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 挑战标题 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  挑战标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="例如：每日10题挑战"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* 挑战描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  挑战描述
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="描述挑战的规则和奖励..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 挑战类型和目标 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    挑战类型
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">每日挑战</option>
                    <option value="weekly">每周挑战</option>
                    <option value="monthly">每月挑战</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    目标题数 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="target"
                    value={formData.target}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* 结束时间和难度 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    结束时间 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate || getDefaultEndDate(formData.type)}
                    onChange={handleChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    难度
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
              </div>

              {/* 奖励描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  奖励描述
                </label>
                <input
                  type="text"
                  name="reward"
                  value={formData.reward}
                  onChange={handleChange}
                  placeholder="例如：获胜者获得100积分"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>创建挑战</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

