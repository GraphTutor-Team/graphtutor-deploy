/**
 * GraphTutor V3.0 - 复习计划推送定时任务
 *
 * 每周一 8:00、每月 1 日 8:00 为近期活跃用户推送复习计划到通知中心（不依赖 node-cron）
 */

import { runWeeklyPush, runMonthlyPush } from '../services/reviewPlanPushService.js';
import { runGroupWeeklyReportPush } from '../services/groupWeeklyReportService.js';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 每小时检查一次
const TARGET_HOUR = 8; // 8 点执行
let lastWeeklyKey = '';
let lastMonthlyKey = '';
let timer = null;

function getWeekKey() {
  const d = new Date();
  const y = d.getFullYear();
  const start = new Date(y, 0, 1);
  const weekNum = Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7);
  return `${y}-W${weekNum}`;
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function tick() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const date = now.getDate();

  if (hour !== TARGET_HOUR) return;

  const weekKey = getWeekKey();
  const monthKey = getMonthKey();

  if (dayOfWeek === 1 && weekKey !== lastWeeklyKey) {
    lastWeeklyKey = weekKey;
    try {
      const result = await runWeeklyPush(30);
      console.log('[ReviewPlanPush] 本周复习计划推送完成:', result);
    } catch (err) {
      console.error('[ReviewPlanPush] 本周推送失败:', err?.message || err);
    }
    try {
      const groupResult = await runGroupWeeklyReportPush();
      console.log('[GroupWeeklyReport] 小组周报推送完成:', groupResult);
    } catch (err) {
      console.error('[GroupWeeklyReport] 小组周报推送失败:', err?.message || err);
    }
  }

  if (date === 1 && monthKey !== lastMonthlyKey) {
    lastMonthlyKey = monthKey;
    try {
      const result = await runMonthlyPush(30);
      console.log('[ReviewPlanPush] 本月学习建议推送完成:', result);
    } catch (err) {
      console.error('[ReviewPlanPush] 本月推送失败:', err?.message || err);
    }
  }
}

/**
 * 启动复习计划推送定时器（每小时检查，周一 8:00 / 每月 1 日 8:00 执行）
 */
export function startReviewPlanPushScheduler() {
  if (timer) return;
  timer = setInterval(tick, CHECK_INTERVAL_MS);
  tick().catch((err) => console.error('[ReviewPlanPush] 首次 tick 失败:', err?.message || err));
  console.log('[ReviewPlanPush] 定时任务已启动（每周一 8:00 / 每月 1 日 8:00）');
}

/**
 * 停止定时器
 */
export function stopReviewPlanPushScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
