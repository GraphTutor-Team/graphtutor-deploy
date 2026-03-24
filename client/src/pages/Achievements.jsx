/**
 * GraphTutor V3.0 - 学习成就页面
 * 
 * 功能：显示用户的学习成就和徽章，支持分类、进度、分享
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAchievements, getAchievementStats } from '../api/v3/achievements';
import { toast } from '../utils/toast';
import AchievementCard from '../components/AchievementCard';
import AchievementProgress from '../components/AchievementProgress';
import PageHeader from '../components/PageHeader';

const ACHIEVEMENT_CATEGORIES = [
  { id: 'all', label: '全部', icon: '🏆' },
  { id: 'streak', label: '连续学习', icon: '🔥' },
  { id: 'questions', label: '答题量', icon: '📚' },
  { id: 'accuracy', label: '正确率', icon: '⭐' },
  { id: 'knowledge', label: '知识点', icon: '💡' },
  { id: 'goal', label: '目标达成', icon: '🎯' },
  { id: 'exam', label: '考试', icon: '💯' },
];

function getCategory(type) {
  if (type?.startsWith('streak')) return 'streak';
  if (type?.startsWith('questions')) return 'questions';
  if (type?.startsWith('accuracy')) return 'accuracy';
  if (type?.startsWith('knowledge')) return 'knowledge';
  if (type?.startsWith('goal')) return 'goal';
  if (type?.startsWith('perfect') || type?.startsWith('exam')) return 'exam';
  return 'other';
}

export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newAchievements, setNewAchievements] = useState([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // 过滤成就
    if (selectedCategory === 'all') {
      setAchievements(allAchievements);
    } else {
      setAchievements(
        allAchievements.filter((a) => getCategory(a.type) === selectedCategory)
      );
    }
  }, [selectedCategory, allAchievements]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [achievementsData, statsData] = await Promise.all([
        getAchievements(),
        getAchievementStats(),
      ]);
      
      // 检查是否有新成就
      const previousAchievements = JSON.parse(
        localStorage.getItem('previousAchievements') || '[]'
      );
      const newOnes = achievementsData.filter(
        (a) => !previousAchievements.includes(a._id)
      );
      
      if (newOnes.length > 0) {
        setNewAchievements(newOnes);
        localStorage.setItem(
          'previousAchievements',
          JSON.stringify(achievementsData.map((a) => a._id))
        );
      }

      setAllAchievements(achievementsData);
      setAchievements(achievementsData);
      setStats(statsData);
    } catch (err) {
      console.error('加载学习成就失败:', err);
      toast.error('加载学习成就失败');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (achievement) => {
    const shareText = `我刚刚在GraphTutor获得了成就：${achievement.icon} ${achievement.title} - ${achievement.description}`;
    
    if (navigator.share) {
      navigator.share({
        title: '学习成就分享',
        text: shareText,
        url: window.location.href,
      }).catch(() => {
        // 分享失败，复制到剪贴板
        navigator.clipboard.writeText(shareText);
        toast.success('成就信息已复制到剪贴板！');
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('成就信息已复制到剪贴板！');
    }
  };

  // 按分类统计
  const categoryStats = ACHIEVEMENT_CATEGORIES.map((cat) => {
    if (cat.id === 'all') {
      return { ...cat, count: allAchievements.length };
    }
    const count = allAchievements.filter(
      (a) => getCategory(a.type) === cat.id
    ).length;
    return { ...cat, count };
  });

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="学习成就" subtitle="查看你的学习成就和徽章" />
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="学习成就" subtitle="查看你的学习成就和徽章" />

      {/* 新成就通知 */}
      {newAchievements.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-bounce">🎉</div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">恭喜！获得新成就</h3>
              <div className="text-sm text-slate-700">
                你刚刚解锁了 {newAchievements.length} 个新成就！
              </div>
            </div>
            <button
              onClick={() => setNewAchievements([])}
              className="px-3 py-1 text-sm bg-white rounded-lg hover:bg-slate-50"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">总成就数</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">最近获得</div>
            <div className="text-lg font-semibold text-slate-900">
              {stats.recent && stats.recent.length > 0
                ? `${stats.recent[0].icon} ${stats.recent[0].title}`
                : '暂无'}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">完成度</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.total > 0 ? Math.round((stats.total / 20) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-500 mt-1">共20个成就</div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="text-sm text-slate-600 mb-1">本周获得</div>
            <div className="text-3xl font-bold text-purple-600">
              {stats.thisWeek || 0}
            </div>
          </div>
        </div>
      )}

      {/* 分类筛选 */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-wrap gap-2">
          {categoryStats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* 成就列表 */}
      {achievements.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border text-center">
          <div className="text-4xl mb-4">🏆</div>
          <div className="text-lg font-semibold text-slate-900 mb-2">
            {selectedCategory === 'all' ? '暂无成就' : '该分类暂无成就'}
          </div>
          <div className="text-sm text-slate-600">
            {selectedCategory === 'all'
              ? '继续学习，解锁更多成就吧！'
              : '尝试其他分类或继续学习解锁成就'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const isNew = newAchievements.some((na) => na._id === achievement._id);
            return (
              <AchievementCard
                key={achievement._id}
                achievement={achievement}
                onShare={handleShare}
                showAnimation={isNew}
              />
            );
          })}
        </div>
      )}

      {/* 未解锁成就预览（可选） */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-bold mb-4">成就进度</h3>
        <div className="space-y-3">
          <div className="text-sm text-slate-600 mb-2">
            以下是一些可解锁的成就，继续努力吧！
          </div>
          {/* 这里可以显示未解锁成就的进度 */}
          <div className="text-xs text-slate-500">
            提示：完成更多题目、保持连续学习、提高正确率都可以解锁新成就
          </div>
        </div>
      </div>
    </div>
  );
}

