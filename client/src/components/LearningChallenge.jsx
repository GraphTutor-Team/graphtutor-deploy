/**
 * GraphTutor V3.0 - 学习挑战组件
 * 
 * 功能：显示和管理学习挑战
 */

import { useState, useEffect } from 'react';
import {
  getChallenges,
  getActiveChallenges,
  getChallengeStats,
  createChallenge,
  updateChallengeProgress,
  deleteChallenge,
  checkChallengeCompletion,
  generateRecommendedChallenges,
  CHALLENGE_TYPES,
} from '../utils/learningChallenge';

export default function LearningChallenge({ data }) {
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    type: CHALLENGE_TYPES.DAILY,
    title: '',
    description: '',
    target: 10,
    endDate: '',
    reward: '',
    difficulty: 'medium',
  });

  useEffect(() => {
    loadChallenges();
    if (data) {
      const recommended = generateRecommendedChallenges(data);
      setRecommendations(recommended);
    }
  }, [data]);

  useEffect(() => {
    // 定期更新挑战进度
    const interval = setInterval(() => {
      if (data) {
        updateAllChallengesProgress();
      }
    }, 60000); // 每分钟更新一次

    return () => clearInterval(interval);
  }, [data, challenges]);

  const loadChallenges = () => {
    const allChallenges = getActiveChallenges();
    setChallenges(allChallenges);
    setStats(getChallengeStats());
  };

  const updateAllChallengesProgress = () => {
    const activeChallenges = getActiveChallenges();
    activeChallenges.forEach(challenge => {
      const completion = checkChallengeCompletion(challenge, data);
      updateChallengeProgress(challenge.id, completion.progress);
    });
    loadChallenges();
  };

  const handleCreateChallenge = () => {
    if (!newChallenge.title || !newChallenge.target) {
      alert('请填写完整信息');
      return;
    }

    const challenge = createChallenge({
      ...newChallenge,
      endDate: newChallenge.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    setShowCreateModal(false);
    setNewChallenge({
      type: CHALLENGE_TYPES.DAILY,
      title: '',
      description: '',
      target: 10,
      endDate: '',
      reward: '',
      difficulty: 'medium',
    });
    loadChallenges();
  };

  const handleUseRecommendation = (rec) => {
    const endDate = new Date();
    if (rec.type === CHALLENGE_TYPES.DAILY) {
      endDate.setDate(endDate.getDate() + 1);
    } else if (rec.type === CHALLENGE_TYPES.WEEKLY) {
      endDate.setDate(endDate.getDate() + 7);
    } else if (rec.type === CHALLENGE_TYPES.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    createChallenge({
      ...rec,
      endDate: endDate.toISOString().split('T')[0],
    });

    loadChallenges();
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      medium: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
      hard: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    };
    return colors[difficulty] || colors.medium;
  };

  const getTypeLabel = (type) => {
    const labels = {
      [CHALLENGE_TYPES.DAILY]: '每日',
      [CHALLENGE_TYPES.WEEKLY]: '每周',
      [CHALLENGE_TYPES.MONTHLY]: '每月',
      [CHALLENGE_TYPES.CUSTOM]: '自定义',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">🏆 学习挑战</h2>
          <p className="text-slate-600 dark:text-slate-400">
            挑战自己，提升学习动力
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 创建挑战
        </button>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.total}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">总挑战</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.active}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">进行中</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.completed}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">已完成</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.failed}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">已失败</div>
          </div>
        </div>
      )}

      {/* 推荐挑战 */}
      {recommendations.length > 0 && (
        <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
          <h3 className="text-lg font-bold mb-4">💡 推荐挑战</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 border dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {rec.title}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {rec.description}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(rec.difficulty)}`}>
                    {rec.difficulty === 'easy' ? '简单' : rec.difficulty === 'medium' ? '中等' : '困难'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    奖励：{rec.reward}
                  </span>
                  <button
                    onClick={() => handleUseRecommendation(rec)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    接受挑战
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 活跃挑战 */}
      <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">进行中的挑战</h3>
        {challenges.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            暂无活跃挑战
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map(challenge => {
              const completion = checkChallengeCompletion(challenge, data);
              return (
                <div
                  key={challenge.id}
                  className="p-4 border dark:border-slate-600 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {challenge.title}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {getTypeLabel(challenge.type)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                          {challenge.difficulty === 'easy' ? '简单' : challenge.difficulty === 'medium' ? '中等' : '困难'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {challenge.description}
                      </div>
                      {challenge.reward && (
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                          奖励：{challenge.reward}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteChallenge(challenge.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      删除
                    </button>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">
                        进度：{completion.progress}/{challenge.target}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {completion.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          completion.isCompleted
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${completion.percentage}%` }}
                      />
                    </div>
                  </div>
                  {completion.isCompleted && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-sm">
                      🎉 挑战完成！
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 创建挑战弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">创建挑战</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">挑战类型</label>
                <select
                  value={newChallenge.type}
                  onChange={(e) => setNewChallenge({ ...newChallenge, type: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value={CHALLENGE_TYPES.DAILY}>每日挑战</option>
                  <option value={CHALLENGE_TYPES.WEEKLY}>每周挑战</option>
                  <option value={CHALLENGE_TYPES.MONTHLY}>每月挑战</option>
                  <option value={CHALLENGE_TYPES.CUSTOM}>自定义挑战</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">挑战标题 *</label>
                <input
                  type="text"
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="输入挑战标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">挑战描述</label>
                <textarea
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  rows="3"
                  placeholder="输入挑战描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">目标数量 *</label>
                <input
                  type="number"
                  value={newChallenge.target}
                  onChange={(e) => setNewChallenge({ ...newChallenge, target: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">结束日期</label>
                <input
                  type="date"
                  value={newChallenge.endDate}
                  onChange={(e) => setNewChallenge({ ...newChallenge, endDate: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">难度</label>
                <select
                  value={newChallenge.difficulty}
                  onChange={(e) => setNewChallenge({ ...newChallenge, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">奖励</label>
                <input
                  type="text"
                  value={newChallenge.reward}
                  onChange={(e) => setNewChallenge({ ...newChallenge, reward: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  placeholder="输入奖励描述"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                取消
              </button>
              <button
                onClick={handleCreateChallenge}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

