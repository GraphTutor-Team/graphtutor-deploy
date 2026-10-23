/**
 * GraphTutor V3.0 - 测验会话页面
 * 
 * 功能：支持会话管理的练习模式，可以保存进度、恢复会话
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useAIContext } from '../context/AIContext';
import { buildQuestionBrief } from '../utils/aiBrief';
import { listQuestions } from '../api/questions';
import { startSession, getSession, submitAnswer, finishSession, listSessions } from '../api/quizzes';
import { STORAGE_KEYS } from '../constants/index.js';
import { toast } from '../utils/toast';
import { getBanks } from '../api/v3/questionBanks';
import { getSubjectTree } from '../api/v3/subjects';
import { runJavaCode } from '../api/coding';

export default function QuizSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth() || {};
  const { setAIContext } = useAIContext();
  const userId = user?._id || user?.id || user?.userId || '';
  const autoResumeTried = useRef(false);

  const [size, setSize] = useState(10);
  const [difficulty, setDifficulty] = useState('');
  const [node, setNode] = useState('');
  const [bankId, setBankId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');

  const [sid, setSid] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.QUIZ_SESSION_ID) || '';
    } catch {
      return '';
    }
  });
  const [qs, setQs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState('idle'); // idle | ongoing | finished
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [runOutput, setRunOutput] = useState('');
  const [runBusy, setRunBusy] = useState(false);

  const cur = qs[idx];

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    setRunOutput('');
  }, [idx]);

  useEffect(() => {
    if (status !== 'ongoing' || !cur) {
      setAIContext({ questionId: null, knowledgeNodeId: null, brief: '', mode: 'browse' });
      return undefined;
    }
    const qid = cur.id || cur._id || null;
    setAIContext({
      pageType: 'quiz',
      mode: 'practice',
      questionId: qid,
      knowledgeNodeId: cur.knowledgeNodeId ?? cur.knowledgeNode ?? null,
      brief: buildQuestionBrief(cur, qid ? answers[qid] : undefined),
    });
    return () => setAIContext({ questionId: null, knowledgeNodeId: null, brief: '', mode: 'browse' });
  }, [status, idx, cur, answers, setAIContext]);

  const loadOptions = async () => {
    try {
      const [banksData, subjectsData] = await Promise.all([
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
        getSubjectTree().catch(() => []),
      ]);
      setBanks(banksData.data || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('加载选项失败:', err);
    }
  };

  async function start() {
    if (!userId) {
      setError('请先登录后再开始会话');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // 尝试使用后端会话API
      const r = await startSession({ userId, size, difficulty, node, bankId, subjectCode });
      setSid(r.id);
      try {
        localStorage.setItem(STORAGE_KEYS.QUIZ_SESSION_ID, r.id);
      } catch (e) {
        console.warn('保存会话ID失败:', e);
      }
      setStatus('ongoing');
      const s = await getSession(r.id);
      setQs(s.questions || []);
      setIdx(0);
      setAnswers({});
      toast.success('会话已开始');
    } catch (err) {
      // 后端会话失败，使用本地模式
      try {
        const params = { skip: 0, limit: size };
        if (node) params.node = node;
        if (difficulty) params.difficulty = difficulty;

        const data = await listQuestions(params);
        const items = (data.items || data.data || []).map(x => ({
          id: x.id || x._id,
          knowledgeNodeId: x.knowledgeNodeId,
          content: x.content,
          options: x.options || [],
          difficulty: x.difficulty,
          correctIndex: x.correctIndex ?? x.answerIndex ?? 0,
          type: x.type || 'single',
          answer: x.answer,
          codingMeta: x.codingMeta || null,
          explain: x.explain || '',
        }));

        if (items.length === 0) {
          setError('当前配置下没有可用题目，请调整筛选条件');
          return;
        }

        let ordered = items;
        try {
          const { getTodaySet } = await import('../api/v3/ai');
          const today = await getTodaySet(Math.min(20, Math.max(1, Number(size) || 10)));
          const ids = (today?.practiceQuestionIds || []).map(String).filter(Boolean);
          if (ids.length) {
            const api = (await import('../api/api')).default;
            const res = await api.get('/questions', { params: { ids: ids.join(',') } });
            const raw = res.data?.items || res.data?.data || [];
            const byId = new Map((Array.isArray(raw) ? raw : []).map((question) => [String(question._id || question.id), question]));
            const recent = ids.map((id) => byId.get(id)).filter((question) => {
              if (!question) return false;
              if (node && String(question.knowledgeNodeId || '') !== String(node)) return false;
              if (difficulty && Number(question.difficulty) !== Number(difficulty)) return false;
              if (bankId) {
                const value = question.bankId?._id || question.bankId || '';
                if (String(value) !== String(bankId)) return false;
              }
              if (subjectCode && question.subjectCode && String(question.subjectCode) !== String(subjectCode)) return false;
              return true;
            }).map((x) => ({
              id: x.id || x._id,
              knowledgeNodeId: x.knowledgeNodeId,
              content: x.content,
              options: x.options || [],
              difficulty: x.difficulty,
              correctIndex: x.correctIndex ?? x.answerIndex ?? 0,
              type: x.type || 'single',
              answer: x.answer,
              codingMeta: x.codingMeta || null,
              explain: x.explain || '',
            }));
            const seen = new Set(recent.map((question) => String(question.id)));
            ordered = [...recent, ...items.filter((question) => !seen.has(String(question.id)))].slice(0, size);
          }
        } catch {
          ordered = items;
        }

        setSid('local');
        try {
          localStorage.removeItem(STORAGE_KEYS.QUIZ_SESSION_ID);
        } catch (e) {
          console.warn('清除会话ID失败:', e);
        }
        setQs(ordered);
        setStatus('ongoing');
        setIdx(0);
        setAnswers({});
        toast.success('进入本地题库模式（无会话记录）');
      } catch (e2) {
        console.error('加载题目失败:', e2);
        setError('无法开始：无后端会话且题库不可用');
        toast.error('无法开始会话');
      }
    } finally {
      setBusy(false);
    }
  }

  async function applySession(s, id) {
    setSid(id);
    try {
      localStorage.setItem(STORAGE_KEYS.QUIZ_SESSION_ID, id);
    } catch (e) {
      console.warn('保存会话ID失败:', e);
    }
    setQs(s.questions || []);
    const map = {};
    (s.answers || []).forEach((a) => {
      map[a.questionId] = a.userAnswer ?? a.answerIndex;
    });
    setAnswers(map);
    setStatus('ongoing');
  }

  async function resume(preferredSessionId) {
    if (!userId) {
      setError('请先登录后再继续会话');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (preferredSessionId && preferredSessionId !== 'local') {
        const s = await getSession(preferredSessionId);
        if (s && s.status === 'ongoing') {
          await applySession(s, preferredSessionId);
          toast.success('已恢复会话');
          setBusy(false);
          return;
        }
      }

      // 1) 如果本地有 sid，直接拉取
      let local = '';
      try {
        local = localStorage.getItem(STORAGE_KEYS.QUIZ_SESSION_ID) || '';
      } catch (e) {
        console.warn('读取会话ID失败:', e);
      }
      if (local && local !== 'local') {
        const s = await getSession(local);
        if (s && s.status === 'ongoing') {
          await applySession(s, local);
          toast.success('已恢复会话');
          setBusy(false);
          return;
        }
      }
      // 2) 查服务器最近的 ongoing
      const list = await listSessions({ userId, status: 'ongoing' });
      if (list.length) {
        const id = list[0]._id || list[0].id;
        const s = await getSession(id);
        await applySession(s, id);
        toast.success('已恢复最近会话');
      } else {
        toast.warning('没有未完成的会话');
      }
    } catch (err) {
      console.error('恢复会话失败:', err);
      setError('恢复失败');
      toast.error('恢复会话失败');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!userId || autoResumeTried.current) return;
    const sessionId = searchParams.get('sessionId');
    const shouldResume = searchParams.get('resume') === '1' || !!sessionId;
    if (!shouldResume) return;
    autoResumeTried.current = true;
    resume(sessionId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userId]);

  async function choose(i) {
    if (!cur) return;
    
    // 根据题型处理答案
    let newAnswer;
    if (cur.type === 'multiple') {
      // 多选题：切换选中状态
      const currentAnswers = Array.isArray(answers[cur.id]) ? answers[cur.id] : [];
      const isSelected = currentAnswers.includes(i);
      newAnswer = isSelected
        ? currentAnswers.filter(idx => idx !== i)
        : [...currentAnswers, i].sort((a, b) => a - b);
    } else {
      // 单选题、判断题：直接设置
      newAnswer = i;
    }
    
    setAnswers(a => ({ ...a, [cur.id]: newAnswer }));
    
    if (sid && sid !== 'local') {
      try {
        await submitAnswer({ 
          sessionId: sid, 
          questionId: cur.id, 
          answerIndex: newAnswer 
        });
      } catch (err) {
        console.warn('提交答案失败:', err);
      }
    }
  }

  // 填空题答案更新
  function handleFillAnswerChange(blankIndex, value) {
    if (!cur) return;
    const currentAnswers = Array.isArray(answers[cur.id]) ? answers[cur.id] : [];
    const newAnswers = [...currentAnswers];
    newAnswers[blankIndex] = value;
    setAnswers(a => ({ ...a, [cur.id]: newAnswers }));
  }

  // 简答题答案更新
  function handleShortAnswerChange(value) {
    if (!cur) return;
    setAnswers(a => ({ ...a, [cur.id]: value }));
  }

  // 编程题答案更新
  function handleCodingAnswerChange(value) {
    if (!cur) return;
    setAnswers(a => ({ ...a, [cur.id]: value }));
  }

  async function persistCurrentAnswer(explicitValue) {
    if (!cur || !sid || sid === 'local') return;
    const value = explicitValue !== undefined ? explicitValue : answers[cur.id];
    if (value == null || value === '') return;
    try {
      await submitAnswer({
        sessionId: sid,
        questionId: cur.id,
        userAnswer: value,
        answerIndex: typeof value === 'number' ? value : undefined,
        userId,
      });
    } catch (err) {
      console.warn('提交答案失败:', err);
    }
  }

  async function handleRunCode() {
    if (!cur || cur.type !== 'coding') return;
    const code = getCodingStarter(cur);
    if (!code.trim()) {
      toast.warning('请先输入代码');
      return;
    }
    setRunBusy(true);
    setRunOutput('');
    try {
      const res = await runJavaCode({ code });
      const data = res.data || res;
      if (data.disabled) {
        setRunOutput(data.message || '代码运行未启用');
        toast.info('服务器未开启代码运行，请对照参考实现判分');
        return;
      }
      const text = [
        data.compiled === false ? '[编译失败]' : '[运行结果]',
        data.stdout ? `输出:\n${data.stdout}` : '',
        data.stderr ? `错误:\n${data.stderr}` : '',
        data.exitCode != null ? `退出码: ${data.exitCode}` : '',
      ].filter(Boolean).join('\n\n');
      setRunOutput(text || '无输出');
    } catch (err) {
      setRunOutput(err.message || '运行失败');
      toast.error('代码运行失败');
    } finally {
      setRunBusy(false);
    }
  }

  const getCodingStarter = useCallback((question) => {
    if (!question) return '';
    if (typeof answers[question.id] === 'string' && answers[question.id].length > 0) {
      return answers[question.id];
    }
    return question.codingMeta?.starterCode || '// 在此编写 Java 代码\n';
  }, [answers]);

  async function finish() {
    if (sid && sid !== 'local') {
      try {
        const r = await finishSession(sid);
        toast.success(`已提交：${r.correct}/${r.total}（${r.acc}%）`);
        try {
          const { syncFriendChallengesAfterPractice } = await import('../utils/syncFriendChallenges');
          await syncFriendChallengesAfterPractice({ silent: true });
        } catch (_) {}
      } catch (err) {
        console.error('完成会话失败:', err);
        toast.error('提交失败');
      }
    } else {
      // 本地模式：使用统一的判分工具计算成绩
      import('../utils/questionScoring').then(({ batchCheckAnswers }) => {
        const answersObj = {};
        qs.forEach(q => {
          answersObj[q.id] = answers[q.id];
        });
        const result = batchCheckAnswers(qs, answersObj);
        const acc = Math.round(result.accuracy * 100);
        toast.success(`本地模式：${result.correct}/${result.total}（${acc}%）`);
      }).catch(() => {
        // 降级方案：简单计算
        const correct = qs.filter(q => {
          const userAnswer = answers[q.id];
          return userAnswer === q.correctIndex;
        }).length;
        const total = qs.length;
        const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
        toast.success(`本地模式：${correct}/${total}（${acc}%）`);
      });
    }
    setStatus('finished');
    try {
      localStorage.removeItem(STORAGE_KEYS.QUIZ_SESSION_ID);
    } catch (e) {
      console.warn('清除会话ID失败:', e);
    }
  }

  function reset() {
    setStatus('idle');
    setQs([]);
    setAnswers({});
    setIdx(0);
    setSid('');
    setError('');
    try {
      localStorage.removeItem(STORAGE_KEYS.QUIZ_SESSION_ID);
    } catch (e) {
      console.warn('清除会话ID失败:', e);
    }
  }

  const progress = useMemo(() => {
    const done = Object.keys(answers).length;
    const total = qs.length;
    const pct = total ? Math.round(done * 100 / total) : 0;
    return { done, total, pct };
  }, [answers, qs]);

  const canPrev = idx > 0;
  const canNext = idx < qs.length - 1;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="测验会话"
        subtitle="新会话先做本周错过的题，再补同知识点的新题。进度可以保存，下次接着做。"
      />

      {status === 'idle' && (
        <div className="card p-6 space-y-4 dark:bg-slate-800 dark:border-slate-700">
          <h2 className="text-lg font-bold mb-4">会话配置</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label">题量</label>
              <input
                className="input w-full"
                type="number"
                min="1"
                max="200"
                value={size}
                onChange={e => setSize(Number(e.target.value) || 10)}
              />
            </div>
            <div className="space-y-2">
              <label className="label">难度（可选）</label>
              <select
                className="select w-full"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
              >
                <option value="">不限</option>
                <option value="1">1 - 容易</option>
                <option value="2">2 - 较易</option>
                <option value="3">3 - 中等</option>
                <option value="4">4 - 较难</option>
                <option value="5">5 - 困难</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">知识点ID（可选）</label>
              <input
                className="input w-full"
                placeholder="例如：os.process.basic"
                value={node}
                onChange={e => setNode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="label">题库（可选）</label>
              <select
                className="select w-full"
                value={bankId}
                onChange={e => setBankId(e.target.value)}
              >
                <option value="">全部题库</option>
                {banks.map(bank => (
                  <option key={bank._id} value={bank._id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="label">学科（可选）</label>
              <div className="relative">
                <select
                  className="select w-full"
                  value={subjectCode}
                  onChange={e => setSubjectCode(e.target.value)}
                >
                  <option value="">全部学科</option>
                  {(() => {
                    // 扁平化树形结构用于下拉选择
                    const flattenSubjects = (subjects, result = []) => {
                      subjects.forEach((subject) => {
                        result.push(subject);
                        if (subject.children && subject.children.length > 0) {
                          flattenSubjects(subject.children, result);
                        }
                      });
                      return result;
                    };
                    return flattenSubjects(subjects).map((subject) => {
                      const indent = '  '.repeat((subject.level || 1) - 1);
                      return (
                        <option key={subject.code} value={subject.code}>
                          {indent}{subject.icon || '📚'} {subject.name}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error text-sm">{error}</div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              className="btn btn-primary"
              onClick={start}
              disabled={busy}
            >
              {busy ? '准备中...' : '开始新会话'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => resume()}
              disabled={busy}
            >
              恢复会话
            </button>
          </div>
        </div>
      )}

      {status === 'ongoing' && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
          {/* 题目区域 */}
          <div className="card p-6 space-y-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                第 {idx + 1} / {qs.length} 题
              </h2>
              <div className="text-sm text-slate-600">
                进度：{progress.done}/{progress.total} ({progress.pct}%)
              </div>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress.pct}%` }}
              ></div>
            </div>

            {cur ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-base font-medium text-slate-900 leading-relaxed flex-1">
                    {cur.content}
                  </div>
                  {cur.type && (
                    <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                      cur.type === 'single' ? 'bg-blue-100 text-blue-700' :
                      cur.type === 'multiple' ? 'bg-slate-100 text-slate-700' :
                      cur.type === 'judge' ? 'bg-green-100 text-green-700' :
                      cur.type === 'fill' ? 'bg-orange-100 text-orange-700' :
                      cur.type === 'coding' ? 'bg-slate-800 text-white' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {cur.type === 'single' ? '单选题' :
                       cur.type === 'multiple' ? '多选题' :
                       cur.type === 'judge' ? '判断题' :
                       cur.type === 'fill' ? '填空题' :
                       cur.type === 'coding' ? '编程题' :
                       '简答题'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {cur.type === 'coding' ? (
                    <div className="space-y-3">
                      {cur.codingMeta?.hint && (
                        <div className="text-sm text-slate-600 bg-slate-50 border rounded-lg px-3 py-2">
                          提示：{cur.codingMeta.hint}
                        </div>
                      )}
                      <textarea
                        value={getCodingStarter(cur)}
                        onChange={(e) => handleCodingAnswerChange(e.target.value)}
                        onBlur={(e) => persistCurrentAnswer(e.target.value)}
                        rows={16}
                        spellCheck={false}
                        placeholder="在此编写 Java 代码"
                        className="w-full px-4 py-3 border rounded-lg font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-950 text-green-100"
                      />
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={handleRunCode}
                          disabled={runBusy}
                        >
                          {runBusy ? '运行中…' : '运行代码'}
                        </button>
                        <p className="text-xs text-slate-500">
                          需服务器安装 JDK 并设置 ENABLE_CODE_RUN=true
                        </p>
                      </div>
                      {runOutput && (
                        <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                          {runOutput}
                        </pre>
                      )}
                      <p className="text-xs text-slate-500">
                        提交后将按代码相似度与参考实现对照判分（≥92% 视为通过）。
                      </p>
                    </div>
                  ) : cur.type === 'fill' ? (
                    // 填空题
                    <div className="space-y-3">
                      {(cur.blankAnswers || Array(cur.blanks || 1).fill('')).map((_, blankIndex) => (
                        <div key={blankIndex} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 w-20">
                            空白 {blankIndex + 1}:
                          </span>
                          <input
                            type="text"
                            value={Array.isArray(answers[cur.id]) ? (answers[cur.id][blankIndex] || '') : ''}
                            onChange={(e) => handleFillAnswerChange(blankIndex, e.target.value)}
                            placeholder={`请输入第 ${blankIndex + 1} 个空白的答案`}
                            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  ) : cur.type === 'short' ? (
                    // 简答题
                    <div>
                      <textarea
                        value={typeof answers[cur.id] === 'string' ? answers[cur.id] : ''}
                        onChange={(e) => handleShortAnswerChange(e.target.value)}
                        rows={6}
                        placeholder="请输入您的答案"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (cur.options || []).length > 0 ? (
                    // 单选题、多选题、判断题
                    (cur.options || []).map((opt, i) => {
                      const isSelected = cur.type === 'multiple'
                        ? Array.isArray(answers[cur.id]) && answers[cur.id].includes(i)
                        : answers[cur.id] === i;
                      
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => choose(i)}
                          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium flex items-center gap-3 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50 text-slate-900'
                          }`}
                        >
                          {cur.type === 'multiple' ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // 由父组件处理
                              className="w-4 h-4"
                              readOnly
                            />
                          ) : (
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => {}} // 由父组件处理
                              className="w-4 h-4"
                              readOnly
                            />
                          )}
                          <span className="font-bold">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-500">
                      此题未配置选项。
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm"
                      onClick={() => setIdx(i => Math.max(0, i - 1))}
                      disabled={!canPrev}
                    >
                      上一题
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={async () => {
                        await persistCurrentAnswer();
                        setIdx(i => Math.min(qs.length - 1, i + 1));
                      }}
                      disabled={!canNext}
                    >
                      下一题
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={reset}
                    >
                      重新开始
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        await persistCurrentAnswer();
                        finish();
                      }}
                    >
                      完成并提交
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                暂无题目
              </div>
            )}
          </div>

          {/* 答题卡 */}
          <div className="card p-6 dark:bg-slate-800 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4">答题卡</h3>
            {qs.length === 0 ? (
              <div className="text-sm text-slate-500">还没有题目</div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {qs.map((q, i) => {
                  const answered = answers[q.id] != null && answers[q.id] !== '';
                  const isCurrent = i === idx;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center border-2 transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : answered
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'finished' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm text-center space-y-4">
          <h2 className="text-2xl font-bold text-green-600">会话已完成</h2>
          <p className="text-slate-600">
            已完成 {qs.length} 道题目，答对 {qs.filter(q => answers[q.id] === q.correctIndex).length} 道
          </p>
          <div className="flex justify-center gap-2">
            <button
              className="btn btn-primary"
              onClick={reset}
            >
              开始新会话
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/result')}
            >
              查看详细结果
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
