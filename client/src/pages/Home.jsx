/**
 * GraphTutor V3.0 - 学习首页（简化版）
 * 
 * 作用：展示实时资讯、推荐内容、快速操作等
 * 详细统计数据已迁移到 /statistics 页面
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useLearningData } from "../context/LearningDataContext";
import QuickActionsPanel from "../components/QuickActionsPanel";
import LearningOverview from "../components/LearningOverview";
import LearningPathSection from "../components/LearningPathSection";
import Icon from "../components/common/Icon";
import { getNotifications } from "../api/v3/notifications";
import { getRecommendedQuestions } from "../api/v3/recommendations";
import { getFriends } from "../api/v3/friends";
import { getForgettingCurve } from "../api/v3/enhancedAnalytics";
import { getDailyChallenge } from "../api/v3/dailyChallenge";

const TYPE_ICONS = {
  achievement: '🎉',
  reply: '💬',
  like: '👍',
  reminder: '⏰',
  goal: '🎯',
  system: '🔔',
  discussion: '💭',
};

const TYPE_COLORS = {
  achievement: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  reply: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  like: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  reminder: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  goal: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  system: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  discussion: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
};

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

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

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

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-7xl mx-auto px-4 py-6">
      <PageHeader
        title="学习首页"
        subtitle="欢迎回来！查看最新资讯和推荐内容。"
      />

      {/* 一键开始练习：新用户 / 所有登录用户的首屏强引导 */}
      {userId && (
        <section className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-1">立即开始练习</h2>
              <p className="text-blue-100 dark:text-blue-200 text-sm">
                选择题库即可做题，错题会自动进入错题本，方便复习
              </p>
            </div>
            <Link
              to="/quiz"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 shadow-md transition-all shrink-0"
            >
              <Icon name="play" className="h-5 w-5" />
              开始练习
            </Link>
          </div>
        </section>
      )}

      {/* 学习路径 / 任务：新手任务 + 每日任务 */}
      {userId && (
        <LearningPathSection />
      )}

      {/* 遗忘曲线预警：建议今日复习的知识点 */}
      {userId && forgettingCurve.length > 0 && (
        <section className="rounded-xl border border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-50/80 to-pink-50/80 dark:from-slate-800 dark:to-slate-800 p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <span className="text-rose-600 dark:text-rose-400">📉</span>
            建议今日复习
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            根据练习时间与正确率预估：若不复习，约 7 天后遗忘概率较高
          </p>
          <ul className="space-y-2">
            {forgettingCurve.slice(0, 8).map((item) => (
              <li key={item.knowledgeNodeId} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[140px]" title={item.knowledgeNodeId}>
                  {item.knowledgeNodeId}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {item.daysSinceLastPractice >= 1 ? `已停练 ${item.daysSinceLastPractice} 天` : '今日已练'}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  7 天后遗忘约 {item.forgetProbability7d}%
                </span>
                <span className="flex gap-1 ml-auto shrink-0">
                  <Link
                    to={`/quiz?knowledgeNodeId=${encodeURIComponent(item.knowledgeNodeId)}`}
                    className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800 text-xs"
                  >
                    按知识点练
                  </Link>
                  <Link
                    to="/review"
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs"
                  >
                    去复习
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/review"
            className="inline-block mt-3 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            查看全部复习 →
          </Link>
        </section>
      )}

      {/* 猜你想练：基于错题知识点 */}
      {userId && guessYouWant.length > 0 && (
        <section className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-slate-800 dark:to-slate-800 p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400">💡</span>
            猜你想练
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            基于你的错题知识点推荐，巩固薄弱环节
          </p>
          <div className="flex flex-wrap gap-2">
            {guessYouWant.slice(0, 5).map((q) => (
              <Link
                key={q._id || q.id}
                to={`/questions/${q._id || q.id}/detail`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-shadow text-left max-w-full"
              >
                <span className="text-slate-500 dark:text-slate-400 shrink-0">📌</span>
                <span className="text-sm text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0">
                  {((q.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 40) || '题目')}
                  {(q.content || '').length > 40 ? '…' : ''}
                </span>
                <Icon name="chevron-right" className="h-4 w-4 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>
          <Link
            to="/recommendations?strategy=weak_points"
            className="inline-block mt-3 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
          >
            更多推荐 →
          </Link>
        </section>
      )}

      {/* 今日挑战 */}
      {userId && (
        <section className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-slate-800 dark:to-slate-800 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            今日挑战
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            每天 10 道题，与全站同题。完成即计入练习记录，错题入错题本。
          </p>
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
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {dailyChallengeLoading ? '加载中…' : '开始今日挑战（10 题）'}
          </button>
        </section>
      )}

      {/* 快速操作面板 */}
      {userId && (
        <section>
          <QuickActionsPanel />
        </section>
      )}

      {/* 学习概览 - 简化版 */}
      {userId && (
        <section>
          <LearningOverview userId={userId} />
        </section>
      )}

      {/* 实时资讯区域 */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Icon name="bell" className="h-5 w-5 inline-block mr-2" />
            实时资讯
          </h2>
          <Link
            to="/notifications"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            查看全部
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">加载中...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id || notification.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[notification.type] || TYPE_COLORS.system}`}>
                    <span className="text-lg">{TYPE_ICONS[notification.type] || '🔔'}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                      {notification.title || '通知'}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {notification.content || notification.message || '暂无内容'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              暂无最新资讯
            </p>
          </div>
        )}
      </section>

      {/* 推荐内容区域 */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Icon name="star" className="h-5 w-5 inline-block mr-2" />
            推荐内容
          </h2>
          <Link
            to="/recommendations"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            查看全部
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="book" className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                推荐题目
              </h3>
              {recommendedQuestions.length > 0 && (
                <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {recommendedQuestions.length} 道
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {recommendedQuestions.length > 0
                ? `为你推荐了 ${recommendedQuestions.length} 道适合的练习题目`
                : '基于你的学习情况，为你推荐适合的练习题目'}
            </p>
            <Link
              to="/recommendations"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              开始练习 →
            </Link>
          </div>
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="users" className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                好友动态
              </h3>
              {friendsCount > 0 && (
                <span className="ml-auto text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  {friendsCount} 位好友
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {friendsCount > 0
                ? `你有 ${friendsCount} 位好友，查看他们的学习动态和成就`
                : '查看好友的学习动态和成就'}
            </p>
            <Link
              to="/friends"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              查看好友 →
            </Link>
          </div>
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="trending-up" className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                学习统计
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              查看详细的学习数据和分析报告
            </p>
            <Link
              to="/statistics"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              查看统计 →
            </Link>
          </div>
        </div>
      </section>

      {/* 快速链接 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/quiz"
          className="card text-center hover:shadow-lg transition-shadow p-4"
        >
          <Icon name="play" className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
          <div className="font-medium text-slate-900 dark:text-slate-100">开始练习</div>
        </Link>
        <Link
          to="/statistics"
          className="card text-center hover:shadow-lg transition-shadow p-4"
        >
          <Icon name="bar-chart" className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
          <div className="font-medium text-slate-900 dark:text-slate-100">学习统计</div>
        </Link>
        <Link
          to="/review"
          className="card text-center hover:shadow-lg transition-shadow p-4"
        >
          <Icon name="book-open" className="h-8 w-8 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
          <div className="font-medium text-slate-900 dark:text-slate-100">错题复习</div>
        </Link>
        <Link
          to="/graph"
          className="card text-center hover:shadow-lg transition-shadow p-4"
        >
          <Icon name="network" className="h-8 w-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
          <div className="font-medium text-slate-900 dark:text-slate-100">知识图谱</div>
        </Link>
      </section>
    </div>
  );
}
