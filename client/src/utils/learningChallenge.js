/**
 * GraphTutor V3.0 - 学习挑战系统
 * 
 * 功能：创建和管理学习挑战
 */

/**
 * 挑战类型
 */
export const CHALLENGE_TYPES = {
  DAILY: 'daily', // 每日挑战
  WEEKLY: 'weekly', // 每周挑战
  MONTHLY: 'monthly', // 每月挑战
  CUSTOM: 'custom', // 自定义挑战
};

/**
 * 创建学习挑战
 */
export function createChallenge(config) {
  const {
    id,
    type,
    title,
    description,
    target,
    startDate,
    endDate,
    reward,
    difficulty = 'medium',
  } = config;

  const challenge = {
    id: id || `challenge_${Date.now()}`,
    type,
    title,
    description,
    target,
    startDate: startDate || new Date().toISOString(),
    endDate,
    reward,
    difficulty,
    progress: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  saveChallenge(challenge);
  return challenge;
}

/**
 * 获取所有挑战
 */
export function getChallenges() {
  try {
    const challenges = localStorage.getItem('challenges');
    return challenges ? JSON.parse(challenges) : [];
  } catch (err) {
    console.error('获取挑战失败:', err);
    return [];
  }
}

/**
 * 更新挑战进度
 */
export function updateChallengeProgress(challengeId, progress) {
  const challenges = getChallenges();
  const index = challenges.findIndex(c => c.id === challengeId);
  
  if (index !== -1) {
    challenges[index].progress = progress;
    challenges[index].lastUpdated = new Date().toISOString();
    
    // 检查是否完成
    if (progress >= challenges[index].target) {
      challenges[index].status = 'completed';
      challenges[index].completedAt = new Date().toISOString();
    }
    
    saveChallenges(challenges);
    return challenges[index];
  }
  
  return null;
}

/**
 * 获取活跃挑战
 */
export function getActiveChallenges() {
  const challenges = getChallenges();
  const now = new Date();
  
  return challenges.filter(c => {
    if (c.status !== 'active') return false;
    const startDate = new Date(c.startDate);
    const endDate = new Date(c.endDate);
    return now >= startDate && now <= endDate;
  });
}

/**
 * 获取挑战统计
 */
export function getChallengeStats() {
  const challenges = getChallenges();
  
  return {
    total: challenges.length,
    active: challenges.filter(c => c.status === 'active').length,
    completed: challenges.filter(c => c.status === 'completed').length,
    failed: challenges.filter(c => c.status === 'failed').length,
    byType: {
      daily: challenges.filter(c => c.type === CHALLENGE_TYPES.DAILY).length,
      weekly: challenges.filter(c => c.type === CHALLENGE_TYPES.WEEKLY).length,
      monthly: challenges.filter(c => c.type === CHALLENGE_TYPES.MONTHLY).length,
      custom: challenges.filter(c => c.type === CHALLENGE_TYPES.CUSTOM).length,
    },
  };
}

/**
 * 生成推荐挑战
 */
export function generateRecommendedChallenges(data) {
  const {
    stats = {},
    progress7d = [],
    nodeStats = [],
    wrongQuestions = [],
  } = data;

  const recommendations = [];

  // 每日挑战
  const avgDaily = progress7d.reduce((sum, d) => sum + (d.total || 0), 0) / Math.max(progress7d.length, 1);
  if (avgDaily > 0) {
    recommendations.push({
      type: CHALLENGE_TYPES.DAILY,
      title: '每日练习挑战',
      description: `完成${Math.ceil(avgDaily * 1.2)}道题`,
      target: Math.ceil(avgDaily * 1.2),
      difficulty: 'easy',
      reward: '每日练习徽章',
    });
  }

  // 每周挑战
  const weekTotal = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  if (weekTotal > 0) {
    recommendations.push({
      type: CHALLENGE_TYPES.WEEKLY,
      title: '每周练习挑战',
      description: `本周完成${Math.ceil(weekTotal * 1.5)}道题`,
      target: Math.ceil(weekTotal * 1.5),
      difficulty: 'medium',
      reward: '每周练习徽章',
    });
  }

  // 正确率挑战
  const total = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
  const correct = progress7d.reduce((sum, d) => sum + (d.correct || 0), 0);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  if (accuracy > 0 && accuracy < 90) {
    recommendations.push({
      type: CHALLENGE_TYPES.WEEKLY,
      title: '正确率挑战',
      description: `本周正确率达到${Math.min(accuracy + 10, 95).toFixed(0)}%`,
      target: Math.min(accuracy + 10, 95),
      difficulty: 'hard',
      reward: '准确率徽章',
    });
  }

  // 知识点挑战
  const weakNodes = nodeStats.filter(n => (n.accuracy || 0) < 0.6 && (n.total || 0) >= 3);
  if (weakNodes.length > 0) {
    recommendations.push({
      type: CHALLENGE_TYPES.WEEKLY,
      title: '知识点掌握挑战',
      description: `掌握${Math.min(weakNodes.length, 5)}个薄弱知识点`,
      target: Math.min(weakNodes.length, 5),
      difficulty: 'medium',
      reward: '知识点徽章',
    });
  }

  return recommendations;
}

/**
 * 保存挑战
 */
function saveChallenge(challenge) {
  const challenges = getChallenges();
  const index = challenges.findIndex(c => c.id === challenge.id);
  
  if (index !== -1) {
    challenges[index] = challenge;
  } else {
    challenges.push(challenge);
  }
  
  saveChallenges(challenges);
}

/**
 * 保存所有挑战
 */
function saveChallenges(challenges) {
  try {
    localStorage.setItem('challenges', JSON.stringify(challenges));
  } catch (err) {
    console.error('保存挑战失败:', err);
  }
}

/**
 * 删除挑战
 */
export function deleteChallenge(challengeId) {
  const challenges = getChallenges();
  const filtered = challenges.filter(c => c.id !== challengeId);
  saveChallenges(filtered);
}

/**
 * 检查挑战完成情况
 */
export function checkChallengeCompletion(challenge, data) {
  const { progress7d = [], nodeStats = [], wrongQuestions = [] } = data;
  
  let progress = 0;
  
  // 根据挑战类型计算进度
  if (challenge.type === CHALLENGE_TYPES.DAILY) {
    const today = new Date().toISOString().split('T')[0];
    const todayData = progress7d.find(d => d.date === today);
    progress = todayData ? (todayData.total || 0) : 0;
  } else if (challenge.type === CHALLENGE_TYPES.WEEKLY) {
    const weekTotal = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
    progress = weekTotal;
  } else if (challenge.type === CHALLENGE_TYPES.MONTHLY) {
    const monthTotal = progress7d.reduce((sum, d) => sum + (d.total || 0), 0);
    progress = monthTotal;
  }
  
  return {
    progress,
    percentage: challenge.target > 0 ? Math.min((progress / challenge.target) * 100, 100) : 0,
    isCompleted: progress >= challenge.target,
  };
}

