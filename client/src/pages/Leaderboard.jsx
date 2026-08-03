/**
 * GraphTutor V3.0 - 学习排行榜页面
 *
 * 功能：多维度排行榜、学科联赛（按学科/月度、段位）
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { getSubjectTree } from '../api/v3/subjects';
import { toast } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import LoginPrompt from '../components/common/LoginPrompt';

function flattenSubjects(subjects, result = []) {
  subjects.forEach((s) => {
    if (s.code) result.push({ code: s.code, name: s.name || s.code });
    if (s.children?.length) flattenSubjects(s.children, result);
  });
  return result;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('total');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [mode, setMode] = useState('normal'); // 'normal' | 'league' | 'teams'
  const [subjects, setSubjects] = useState([]);
  const [leagueSubjectCode, setLeagueSubjectCode] = useState('');
  const [leagueSeason, setLeagueSeason] = useState('');
  const [leagueData, setLeagueData] = useState(null);
  const [teamsPeriod, setTeamsPeriod] = useState('week');
  const [teamsData, setTeamsData] = useState(null);

  useEffect(() => {
    if (user && mode === 'league') {
      getSubjectTree()
        .then((tree) => {
          setSubjects(tree || []);
          const flat = flattenSubjects(tree || []);
          if (flat.length && !leagueSubjectCode) setLeagueSubjectCode(flat[0].code);
        })
        .catch(() => setSubjects([]));
    }
  }, [user, mode]);

  useEffect(() => {
    if (user && mode === 'normal') {
      loadLeaderboard();
    }
  }, [user, selectedType, selectedPeriod, mode]);

  useEffect(() => {
    if (user && mode === 'league' && leagueSubjectCode) {
      loadLeague();
    }
  }, [user, mode, leagueSubjectCode, leagueSeason]);

  useEffect(() => {
    if (user && mode === 'teams') {
      loadTeams();
    }
  }, [user, mode, teamsPeriod]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v3/leaderboard', {
        params: {
          type: selectedType,
          period: selectedPeriod,
          limit: 100,
        },
      });
      setLeaderboard(res.data.data?.items || []);
    } catch (err) {
      console.error('加载排行榜失败:', err);
      toast.error('加载排行榜失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLeague = async () => {
    if (!leagueSubjectCode) return;
    try {
      setLoading(true);
      const params = { subjectCode: leagueSubjectCode };
      if (leagueSeason) params.season = leagueSeason;
      const res = await api.get('/v3/leaderboard/league', { params });
      setLeagueData(res.data.data || null);
    } catch (err) {
      console.error('加载学科联赛失败:', err);
      toast.error('加载学科联赛失败');
      setLeagueData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v3/leaderboard/teams', { params: { period: teamsPeriod } });
      setTeamsData(res.data.data || null);
    } catch (err) {
      console.error('加载战队赛失败:', err);
      toast.error('加载战队赛失败');
      setTeamsData(null);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      total: '综合排行',
      questions: '答题量',
      accuracy: '正确率',
      streak: '连续学习',
      weekly: '本周排行',
      monthly: '本月排行',
    };
    return labels[type] || type;
  };

  const getScoreLabel = (type) => {
    const labels = {
      total: '综合得分',
      questions: '答题数',
      accuracy: '正确率',
      streak: '连续天数',
      weekly: '本周得分',
      monthly: '本月得分',
    };
    return labels[type] || '得分';
  };

  const formatScore = (score, type) => {
    if (type === 'accuracy') {
      return `${score.toFixed(1)}%`;
    }
    return score.toLocaleString();
  };

  if (!user) {
    return (
      <LoginPrompt
        title="登录后查看排行榜"
        description="登录后可查看学习排行与联赛。也可先看教程，或去做题上榜。"
      />
    );
  }

  const leagueItems = leagueData?.items || [];
  const flatSubjects = flattenSubjects(subjects);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="学习排行榜" subtitle="查看你的学习排名和成就" />

      {/* 模式切换：普通排行 / 学科联赛 / 战队赛 */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setMode('normal')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            mode === 'normal' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          普通排行
        </button>
        <button
          onClick={() => setMode('league')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            mode === 'league' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          学科联赛
        </button>
        <button
          onClick={() => setMode('teams')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            mode === 'teams' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          战队赛
        </button>
      </div>

      {mode === 'teams' && (
        <>
          <div className="bg-white p-4 rounded-lg border flex flex-wrap items-center gap-4">
            <label className="font-medium text-slate-700">周期</label>
            <div className="flex gap-2">
              {['week', 'month'].map((p) => (
                <button
                  key={p}
                  onClick={() => setTeamsPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    teamsPeriod === p ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p === 'week' ? '本周' : '本月'}
                </button>
              ))}
            </div>
            <span className="text-sm text-slate-500">按你加入的群组汇总答题量与正确率排名</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">加载中...</div>
          ) : teamsData?.message && !teamsData?.items?.length ? (
            <div className="bg-white p-12 rounded-lg border text-center">
              <div className="text-4xl mb-4">👥</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">暂无战队数据</div>
              <div className="text-sm text-slate-600">{teamsData.message}</div>
              <div className="mt-4 text-sm text-slate-500">前往「群组管理」创建或加入群组即可参与战队赛</div>
            </div>
          ) : !teamsData?.items?.length ? (
            <div className="bg-white p-12 rounded-lg border text-center">
              <div className="text-4xl mb-4">👥</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">本周暂无答题记录</div>
              <div className="text-sm text-slate-600">战队成员做题后即可在此看到排名</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="p-4 bg-emerald-50 border-b flex justify-between items-center">
                <h3 className="font-semibold">战队赛 · {teamsPeriod === 'week' ? '本周' : '本月'}</h3>
              </div>
              <div className="divide-y">
                {teamsData.items.map((item) => {
                  const isTopThree = item.rank <= 3;
                  const medalEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : null;
                  return (
                    <div
                      key={item.groupId}
                      className={`p-4 flex items-center gap-4 ${isTopThree ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex-shrink-0 w-12 text-center">
                        {medalEmoji ? (
                          <span className="text-2xl">{medalEmoji}</span>
                        ) : (
                          <span className="text-lg font-bold text-slate-600">{item.rank}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg truncate">{item.name}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          成员 {item.memberCount} 人 · 正确 {item.correct}/{item.total} 题 · 正确率 {item.accuracy}%
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-emerald-600">{item.score}</div>
                        <div className="text-xs text-slate-500">综合得分</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'league' && (
        <>
          <div className="bg-white p-4 rounded-lg border flex flex-wrap items-center gap-4">
            <label className="font-medium text-slate-700">学科</label>
            <select
              value={leagueSubjectCode}
              onChange={(e) => setLeagueSubjectCode(e.target.value)}
              className="border rounded-lg px-3 py-2 min-w-[140px]"
            >
              {flatSubjects.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name || s.code}
                </option>
              ))}
            </select>
            <label className="font-medium text-slate-700">赛季</label>
            <input
              type="month"
              value={leagueSeason || leagueData?.season || (() => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              })()}
              onChange={(e) => setLeagueSeason(e.target.value || '')}
              className="border rounded-lg px-3 py-2"
            />
            <span className="text-sm text-slate-500">
              {leagueData?.season ? `${leagueData.season} 月赛` : '默认当月'}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">加载中...</div>
          ) : leagueItems.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border text-center">
              <div className="text-4xl mb-4">🏅</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">本月该学科暂无联赛数据</div>
              <div className="text-sm text-slate-600">在本学科下答题即可参与当月联赛，冲击黄金/白银/青铜段位</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="p-4 bg-amber-50 border-b flex justify-between items-center">
                <h3 className="font-semibold">
                  {flatSubjects.find((s) => s.code === leagueData?.subjectCode)?.name || leagueData?.subjectCode} · {leagueData?.season || ''} 月赛
                </h3>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-amber-200 rounded">前10% 黄金</span>
                  <span className="px-2 py-1 bg-slate-200 rounded">10–30% 白银</span>
                  <span className="px-2 py-1 bg-amber-700/20 rounded">30–60% 青铜</span>
                  <span className="px-2 py-1 bg-slate-100 rounded">其余 参与</span>
                </div>
              </div>
              <div className="divide-y">
                {leagueItems.map((item) => {
                  const isTopThree = item.rank <= 3;
                  const medalEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : null;
                  const tierClass = {
                    黄金: 'bg-amber-400 text-amber-900',
                    白银: 'bg-slate-300 text-slate-800',
                    青铜: 'bg-amber-700/30 text-amber-900',
                    参与: 'bg-slate-100 text-slate-600',
                  }[item.tier] || 'bg-slate-100 text-slate-600';
                  return (
                    <div
                      key={item.userId}
                      className={`p-4 flex items-center gap-4 ${
                        item.isMe ? 'bg-blue-50 border-l-4 border-l-blue-600' : isTopThree ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-shrink-0 w-12 text-center">
                        {medalEmoji ? (
                          <span className="text-2xl">{medalEmoji}</span>
                        ) : (
                          <span className="text-lg font-bold text-slate-600">{item.rank}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg truncate">{item.name}</span>
                          {item.isMe && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">我</span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierClass}`}>
                            {item.tier}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          正确 {item.correct}/{item.total} 题
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-blue-600">{item.score}</div>
                        <div className="text-xs text-slate-500">综合得分</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {leagueItems.length > 0 && (
            <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
              <h3 className="font-semibold mb-3">我的联赛</h3>
              {(() => {
                const my = leagueItems.find((item) => item.isMe);
                if (!my) {
                  return (
                    <div className="text-slate-600">
                      本月该学科你尚未参与答题，去做题即可上榜并参与段位排名。
                    </div>
                  );
                }
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-amber-700">
                        第 {my.rank} 名 · {my.tier}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {leagueData?.subjectCode} · {leagueData?.season}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-orange-600">{my.score} 分</div>
                      <div className="text-xs text-slate-500">正确 {my.correct}/{my.total} 题</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {mode === 'normal' && (
        <>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                {['total', 'questions', 'accuracy', 'streak', 'weekly', 'monthly'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      selectedType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
              {['total', 'questions', 'accuracy'].includes(selectedType) && (
                <div className="flex gap-2">
                  {['all', 'week', 'month'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1 rounded text-xs ${
                        selectedPeriod === period
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {period === 'all' ? '全部' : period === 'week' ? '本周' : '本月'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">加载中...</div>
          ) : leaderboard.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border text-center">
              <div className="text-4xl mb-4">🏆</div>
              <div className="text-lg font-semibold text-slate-900 mb-2">暂无排行数据</div>
              <div className="text-sm text-slate-600">开始学习，登上排行榜吧！</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="p-4 bg-slate-50 border-b">
                <h3 className="font-semibold">{getTypeLabel(selectedType)}</h3>
              </div>
              <div className="divide-y">
                {leaderboard.map((item, idx) => {
                  const isTopThree = idx < 3;
                  const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                  return (
                    <div
                      key={item.userId || idx}
                      className={`p-4 flex items-center gap-4 ${
                        item.isMe
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : isTopThree
                          ? 'bg-yellow-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-shrink-0 w-12 text-center">
                        {medalEmoji ? (
                          <span className="text-2xl">{medalEmoji}</span>
                        ) : (
                          <span className="text-lg font-bold text-slate-600">
                            {item.rank || idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {item.name || `用户${item.userId?.slice(-4) || idx}`}
                          </span>
                          {item.isMe && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">我</span>
                          )}
                        </div>
                        {item.totalQuestions && (
                          <div className="text-sm text-slate-600 mt-1">
                            答题数: {item.totalQuestions} | 正确率: {item.accuracy?.toFixed(1) || 0}%
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {formatScore(item.score || 0, selectedType)}
                        </div>
                        <div className="text-xs text-slate-500">{getScoreLabel(selectedType)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="bg-slate-50 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-3">我的排名</h3>
              {(() => {
                const myRank = leaderboard.findIndex((item) => item.isMe);
                if (myRank === -1) {
                  return <div className="text-slate-600">你还没有上榜，继续努力吧！</div>;
                }
                const myData = leaderboard[myRank];
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">第 {myRank + 1} 名</div>
                      <div className="text-sm text-slate-600 mt-1">{getTypeLabel(selectedType)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        {formatScore(myData.score || 0, selectedType)}
                      </div>
                      <div className="text-xs text-slate-500">{getScoreLabel(selectedType)}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

