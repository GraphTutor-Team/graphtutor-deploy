/**
 * GraphTutor V3.0 - 学习首页（简化版）
 * 
 * 作用：展示实时资讯、推荐内容、快速操作等
 * 详细统计数据已迁移到 /statistics 页面
 */

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLearningData } from "../context/LearningDataContext";
import QuickActionsPanel from "../components/QuickActionsPanel";
import LearningOverview from "../components/LearningOverview";
import LearningPathSection from "../components/LearningPathSection";
import HomeUsageGuide from "../components/HomeUsageGuide";
import Icon from "../components/common/Icon";
import { getNotifications } from "../api/v3/notifications";
import { getRecommendedQuestions } from "../api/v3/recommendations";
import { getFriends } from "../api/v3/friends";
import { getForgettingCurve } from "../api/v3/enhancedAnalytics";
import { getDailyChallenge } from "../api/v3/dailyChallenge";
import { listSessions } from "../api/quizzes";
import { usePageAI } from "../hooks/usePageAI";

function formatTimeAgo(dateString) {
  if (!dateString) return '刚刚';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

const HOME_CACHE_TTL_MS = 20 * 1000;
let homeCache = { userId: null, data: null, ts: 0 };
function getHomeCache(uid) {
  if (!uid || !homeCache.data || homeCache.userId !== uid) return null;
  if (Date.now() - homeCache.ts > HOME_CACHE_TTL_MS) return null;
  return homeCache.data;
}
function setHomeCache(uid, data) {
  homeCache = { userId: uid, data, ts: Date.now() };
}
function clearHomeCache() {
  homeCache = { userId: null, data: null, ts: 0 };
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const { learningDataVersion } = useLearningData();
  const userId = user?._id || user?.id || user?.userId || null;

  const [notifications, setNotifications] = useState([]);
  const [recommendedQuestions, setRecommendedQuestions] = useState([]);
  const [guessYouWant, setGuessYouWant] = useState([]); // 猜你想练（基于错题知识点）
  const [forgettingCurve, setForgettingCurve] = useState([]); // 遗忘曲线：建议今日复习的知识点
  const [friendsCount, setFriendsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dailyChallengeLoading, setDailyChallengeLoading] = useState(false);
  const [ongoingSession, setOngoingSession] = useState(null);

  const homeBrief = useMemo(() => {
    const forgetNames = (Array.isArray(forgettingCurve) ? forgettingCurve : [])
      .slice(0, 5)
      .map((item) => item.name || item.knowledgeNodeName || item.key || item.nodeName)
      .filter(Boolean);
    const recStems = (Array.isArray(recommendedQuestions) ? recommendedQuestions : [])
      .slice(0, 3)
      .map((q) => String(q.content || q.title || '').replace(/\s+/g, ' ').slice(0, 40))
      .filter(Boolean);
    return [
      '页面：学习首页。',
      `建议复习：${forgetNames.join('、') || '暂无'}`,
      `推荐题：${recStems.join('；') || '暂无'}`,
      `未完成练习：${ongoingSession ? '有' : '无'}`,
    ].join('\n');
  }, [forgettingCurve, recommendedQuestions, ongoingSession]);

  usePageAI({ pageType: 'home', brief: homeBrief });

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setOngoingSession(null);
      return;
    }
    let cancelled = false;
    listSessions({ userId, status: 'ongoing' })
      .then((list) => {
        if (!cancelled) setOngoingSession(Array.isArray(list) && list[0] ? list[0] : null);
      })
      .catch(() => {
        if (!cancelled) setOngoingSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, learningDataVersion]);

  // 跨页面同步：练习/考试提交后失效学习数据，此处收到版本变化则清缓存并重新拉取
  useEffect(() => {
    if (learningDataVersion > 0 && userId) {
      clearHomeCache();
      setLoading(true);
      fetchAndCache();
    }
  }, [learningDataVersion]);

  const loadData = async () => {
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('learningDataInvalidated')) {
        clearHomeCache();
        sessionStorage.removeItem('learningDataInvalidated');
      }
    } catch (_) {}
    const cached = getHomeCache(userId);
    if (cached) {
      setNotifications(cached.notifications);
      setRecommendedQuestions(cached.recommendedQuestions);
      setGuessYouWant(cached.guessYouWant || []);
      setForgettingCurve(cached.forgettingCurve || []);
      setFriendsCount(cached.friendsCount);
      setLoading(false);
      fetchAndCache();
      return;
    }
    setLoading(true);
    await fetchAndCache();
  };

  const fetchAndCache = async () => {
    try {
      const [notificationsRes, questionsRes, guessRes, forgetRes, friendsRes] = await Promise.allSettled([
        getNotifications({ page: 1, limit: 5, type: 'system' }),
        getRecommendedQuestions({ limit: 3, includeReasons: false }),
        getRecommendedQuestions({ strategy: 'weak_points', limit: 5, includeReasons: false }),
        getForgettingCurve(15),
        getFriends({ limit: 50 }),
      ]);
      const items = notificationsRes.status === 'fulfilled'
        ? (notificationsRes.value?.data?.items || []).slice(0, 5)
        : [];
      const questions = questionsRes.status === 'fulfilled'
        ? (Array.isArray(questionsRes.value) ? questionsRes.value : questionsRes.value?.data || []).slice(0, 3)
        : [];
      const guessList = guessRes.status === 'fulfilled'
        ? (Array.isArray(guessRes.value) ? guessRes.value : guessRes.value?.data || [])
        : [];
      const forgetList = forgetRes.status === 'fulfilled' && forgetRes.value?.data
        ? forgetRes.value.data
        : [];
      const data = friendsRes.status === 'fulfilled' ? friendsRes.value : null;
      const friends = data?.items ?? data?.data?.items ?? (Array.isArray(data) ? data : []);
      const count = Array.isArray(friends) ? friends.length : 0;
      setNotifications(items);
      setRecommendedQuestions(questions);
      setGuessYouWant(Array.isArray(guessList) ? guessList : []);
      setForgettingCurve(Array.isArray(forgetList) ? forgetList : []);
      setFriendsCount(count);
      if (userId) setHomeCache(userId, { notifications: items, recommendedQuestions: questions, guessYouWant: Array.isArray(guessList) ? guessList : [], forgettingCurve: Array.isArray(forgetList) ? forgetList : [], friendsCount: count });
    } catch (err) {
      console.error('加载首页数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.name || user?.email?.split('@')[0] || '同学';

  return (
    <div className="page-shell text-slate-900 dark:text-slate-100">
      {/* 品牌欢迎区 */}
      <header className="animate-rise-in pt-2 sm:pt-4">
        <p className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          GraphTutor
        </p>
        <p className="mt-2 text-base sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
          {userId ? `你好，${displayName}` : '知识图谱驱动的智能学习'}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          从练习开始，错题与复习会自动跟上。
        </p>
      </header>

      <HomeUsageGuide />

      {!userId && (
        <section
          className="rounded-xl text-white p-6 sm:p-8 animate-rise-in-delay"
          style={{ backgroundColor: 'var(--color-cta)' }}
        >
          <h2 className="text-xl font-bold mb-1">登录后开始学习</h2>
          <p className="text-white/75 text-sm mb-5 max-w-md">
            练习、错题本、学习数据和好友功能需要登录后使用。
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/login" className="btn btn-primary border-0">
              去登录
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-white/35 text-white/90 hover:bg-white/10 text-sm font-semibold"
            >
              注册账号
            </Link>
          </div>
        </section>
      )}

      {userId && (
        <section
          className="rounded-xl text-white p-6 sm:p-7 animate-rise-in-delay"
          style={{ backgroundColor: 'var(--color-cta)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">立即开始练习</h2>
              <p className="text-white/75 text-sm">
                选择题库即可做题；错题会进入错题本，方便复习
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link to="/quiz" className="btn btn-primary gap-2 px-5 py-2.5">
                <Icon name="play" className="h-5 w-5" />
                开始练习
              </Link>
              {ongoingSession && (
                <Link
                  to={`/quiz2?resume=1${ongoingSession.id ? `&sessionId=${ongoingSession.id}` : ''}`}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-white/35 text-white/90 hover:bg-white/10 text-sm font-medium transition-colors"
                >
                  继续未完成
                </Link>
              )}
              <button
                type="button"
                disabled={dailyChallengeLoading}
                onClick={async () => {
                  setDailyChallengeLoading(true);
                  try {
                    const data = await getDailyChallenge();
                    if (data?.questionIds?.length) {
                      navigate('/quiz', { state: { groupPracticeQuestionIds: data.questionIds } });
                    } else {
                      window.alert('暂无题目，请稍后再试或联系管理员导入题库。');
                    }
                  } catch (err) {
                    window.alert(err.message || '获取今日挑战失败');
                  } finally {
                    setDailyChallengeLoading(false);
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-white/35 text-white/90 hover:bg-white/10 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {dailyChallengeLoading ? '加载中…' : '今日挑战'}
              </button>
            </div>
          </div>
        </section>
      )}

      {userId && <LearningPathSection />}

      {userId && (
        <section className="surface">
          <h2 className="section-title mb-4">今日建议</h2>
          {forgettingCurve.length === 0 && guessYouWant.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                暂无个性化建议，先去练几道题，系统会根据错题给你推荐。
              </p>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link to="/quiz" className="btn btn-primary">
                  开始练习
                </Link>
                <Link to="/recommendations" className="btn btn-outline">
                  智能推荐
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {forgettingCurve.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">建议复习</div>
                  <ul className="space-y-2.5">
                    {forgettingCurve.slice(0, 3).map((item) => (
                      <li key={item.knowledgeNodeId} className="flex items-center gap-2 text-sm">
                        <span className="truncate flex-1 text-slate-800 dark:text-slate-100" title={item.knowledgeNodeId}>
                          {item.knowledgeNodeId}
                        </span>
                        <Link to="/review" className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0">
                          去复习
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {guessYouWant.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">猜你想练</div>
                  <ul className="space-y-2.5">
                    {guessYouWant.slice(0, 3).map((q) => (
                      <li key={q._id || q.id}>
                        <Link
                          to={`/questions/${q._id || q.id}/detail`}
                          className="text-sm text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                        >
                          {((q.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 36) || '题目')}
                          {(q.content || '').length > 36 ? '…' : ''}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/recommendations?strategy=weak_points"
                    className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    更多推荐 →
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {userId && <QuickActionsPanel />}

      {userId && (
        <section>
          <LearningOverview userId={userId} />
        </section>
      )}

      <section className="surface">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">最近通知</h2>
          <Link to="/notifications" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            全部
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 py-4">加载中...</p>
        ) : notifications.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/80">
            {notifications.slice(0, 3).map((notification) => (
              <li key={notification._id || notification.id} className="py-3 first:pt-0 last:pb-0">
                <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                  {notification.title || '通知'}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                  {notification.content || notification.message || '暂无内容'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{formatTimeAgo(notification.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 py-4">暂无通知</p>
        )}
      </section>

      {userId && (
        <section className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400 pb-2">
          <Link to="/friends" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            好友{friendsCount > 0 ? `（${friendsCount}）` : ''}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/recommendations" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            智能推荐{recommendedQuestions.length > 0 ? `（${recommendedQuestions.length}）` : ''}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/analytics" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            学习数据
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/community" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            社区
          </Link>
        </section>
      )}
    </div>
  );
}
