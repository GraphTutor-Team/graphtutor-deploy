/**
 * 练习/考试交卷后，静默同步好友挑战进度
 */

import { syncActiveChallengeProgress } from '../api/v3/friendChallenges';
import { toast } from './toast';

/**
 * @returns {Promise<{ updatedCount: number, challenges: any[] } | null>}
 */
export async function syncFriendChallengesAfterPractice({ silent = false } = {}) {
  try {
    const result = await syncActiveChallengeProgress();
    const data = result?.data || result || {};
    const updatedCount = Number(data.updatedCount) || 0;
    const challenges = Array.isArray(data.challenges) ? data.challenges : [];

    if (!silent && updatedCount > 0) {
      const completed = challenges.filter((c) => c.status === 'completed').length;
      if (completed > 0) {
        toast.success(`好友挑战进度已更新，有 ${completed} 场挑战完成`);
      } else {
        toast.success(`已同步 ${updatedCount} 场好友挑战进度`);
      }
    }

    return { updatedCount, challenges };
  } catch (err) {
    // 无挑战或未登录时不打断主流程
    console.warn('同步好友挑战进度跳过:', err?.message || err);
    return null;
  }
}
