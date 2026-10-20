import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQuestions, generateNoteSummary, getWrongReport } from '../../api/v3/ai';
import { getExamPrediction, getForgettingCurve } from '../../api/v3/enhancedAnalytics';
import MarkdownPreview from '../MarkdownPreview';
import { batchCreateQuestions } from '../../api/v3/questions';
import { getRecommendedQuestions } from '../../api/v3/recommendations';
import api from '../../api/api.js';

function todayPlus(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function questionIdOf(question) {
  return String(question?._id || question?.id || '');
}

export function TodayPanel({ onClose }) {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [curveRes, recommended] = await Promise.all([
          getForgettingCurve(5).catch(() => null),
          getRecommendedQuestions({ strategy: 'weak_points', limit: 5, includeReasons: false }).catch(() => []),
        ]);
        if (cancelled) return;
        const curve = Array.isArray(curveRes?.data) ? curveRes.data : [];
        setTopics(curve.filter((item) => item.suggestReviewToday !== false).slice(0, 3));
        setQuestions(Array.isArray(recommended) ? recommended : []);
      } catch (err) {
        if (!cancelled) setError(err.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ids = questions.map(questionIdOf).filter(Boolean);

  function start() {
    if (!ids.length) return;
    onClose?.();
    navigate('/quiz', { state: { practiceQuestionIds: ids, practiceSource: 'ai' } });
  }

  if (loading) return <p className="text-sm">正在整理今天该练的内容…</p>;

  return (
    <div className="space-y-3 text-sm">
      <p style={{ color: 'var(--color-text-secondary)' }}>
        根据遗忘曲线和错题薄弱点选出，可直接开练。
      </p>
      {error && <div className="text-rose-600">{error}</div>}
      {topics.length > 0 && (
        <div className="space-y-1">
          <div className="font-medium">建议复习</div>
          {topics.map((item) => (
            <div key={item.knowledgeNodeId} style={{ color: 'var(--color-text-secondary)' }}>
              已隔 {item.daysSinceLastPractice ?? '—'} 天 · 近期正确率 {item.recentAccuracy ?? '—'}%
            </div>
          ))}
        </div>
      )}
      {questions.length > 0 && (
        <div className="space-y-1">
          <div className="font-medium">今天的题</div>
          {questions.map((q) => (
            <div key={questionIdOf(q)} className="rounded-lg p-2" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              {String(q.content || '题目').replace(/\s+/g, ' ').slice(0, 72)}
            </div>
          ))}
        </div>
      )}
      {ids.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)' }}>还没有足够的错题或复习记录。先去做几道题，明天这里就会有今日练习。</p>
      )}
      {ids.length > 0 && (
        <button type="button" className="btn btn-primary w-full" onClick={start}>
          开始今日 {ids.length} 题
        </button>
      )}
    </div>
  );
}

export function GeneratePanel({ onClose }) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);

  async function generate() {
    if (!topic.trim()) {
      setError('先写一个知识点或主题');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await generateQuestions({
        subjectName: topic.trim(),
        knowledgePoint: topic.trim(),
        count: Number(count) || 3,
        difficulty: 3,
        questionType: 'single',
        bloom: 'apply',
        review: true,
      });
      setQuestions(result?.questions || []);
    } catch (err) {
      setError(err.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  async function practice() {
    setBusy(true);
    setError('');
    try {
      const saved = await batchCreateQuestions({
        questions: questions.map((q) => ({
          ...q,
          source: 'ai',
          autoGenerateQid: true,
          tags: ['ai-generated'],
        })),
      });
      const ids = saved?.ids || [];
      if (!ids.length) {
        setError('没有写入成功的题目');
        return;
      }
      onClose?.();
      navigate('/quiz', { state: { practiceQuestionIds: ids, practiceSource: 'ai' } });
    } catch (err) {
      setError(err.message || '无法开始练习');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p style={{ color: 'var(--color-text-secondary)' }}>按知识点生成单选题，可直接练。</p>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="例如：进程调度"
        className="w-full px-3 py-2 border rounded-lg"
      />
      <label className="flex items-center gap-2">
        数量
        <input
          type="number"
          min={1}
          max={8}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="w-16 px-2 py-1 border rounded-lg"
        />
      </label>
      {error && <div className="text-rose-600">{error}</div>}
      <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={generate}>
        {busy ? '处理中…' : '生成题目'}
      </button>
      {questions.map((q, index) => (
        <div key={index} className="rounded-lg p-2" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          {q.content}
        </div>
      ))}
      {questions.length > 0 && (
        <button type="button" className="btn w-full" disabled={busy} onClick={practice}>
          保存并练习这 {questions.length} 题
        </button>
      )}
    </div>
  );
}

export function PlansPanel({ onClose }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [name, setName] = useState('');
  const [days, setDays] = useState(7);
  const [dailyTarget, setDailyTarget] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get('/v3/study-plans?limit=8');
    const list = res.data?.data?.items || res.data?.items || [];
    setPlans(Array.isArray(list) ? list : []);
  }

  useEffect(() => {
    load().catch(() => setPlans([]));
  }, []);

  async function create() {
    if (!name.trim()) {
      setError('先写计划名称');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/v3/study-plans', {
        name: name.trim(),
        type: 'daily',
        startDate: todayPlus(0),
        endDate: todayPlus(Number(days) || 7),
        dailyTarget: Number(dailyTarget) || 10,
      });
      setName('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || '创建失败');
    } finally {
      setBusy(false);
    }
  }

  const activePlans = plans.filter((plan) => !plan.status || plan.status === 'active');

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">今天的任务</span>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => {
            onClose?.();
            navigate('/study-plans');
          }}
        >
          打开计划页
        </button>
      </div>
      {activePlans.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)' }}>今天还没有进行中的计划。</p>
      )}
      {activePlans.slice(0, 5).map((plan) => (
        <div key={plan._id} className="rounded-lg p-2 space-y-2" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div>
            <div className="font-medium">今天：{plan.name}</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              做 {plan.dailyTarget || 10} 题
              {plan.goalText ? ` · ${plan.goalText}` : ''}
              {plan.endDate ? ` · 至 ${String(plan.endDate).slice(0, 10)}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary w-full text-xs !py-1.5"
            onClick={() => {
              onClose?.();
              navigate('/quiz', { state: { practiceCount: plan.dailyTarget || 10, practiceSource: 'plan' } });
            }}
          >
            去做今天的 {plan.dailyTarget || 10} 题
          </button>
        </div>
      ))}
      <div className="pt-1 space-y-2">
        <div className="font-medium">制定一个计划</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：图论一周巩固"
          className="w-full px-3 py-2 border rounded-lg"
        />
        <div className="flex gap-2">
          <label className="flex-1">
            天数
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="mt-1 w-full px-2 py-1 border rounded-lg"
            />
          </label>
          <label className="flex-1">
            每日题数
            <input
              type="number"
              min={1}
              max={50}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(e.target.value)}
              className="mt-1 w-full px-2 py-1 border rounded-lg"
            />
          </label>
        </div>
        {error && <div className="text-rose-600">{error}</div>}
        <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={create}>
          {busy ? '保存中…' : '创建计划'}
        </button>
      </div>
    </div>
  );
}

export function WrongReportPanel() {
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setBusy(true);
    setError('');
    try {
      setReport(await getWrongReport('week'));
    } catch (err) {
      setError(err.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p style={{ color: 'var(--color-text-secondary)' }}>
        汇总最近 7 天的错题，给出薄弱点和复习建议。
      </p>
      <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={load}>
        {busy ? '生成中…' : '生成本周错题报告'}
      </button>
      {error && <div className="text-rose-600">{error}</div>}
      {report && (
        <div className="space-y-2">
          <div className="font-medium">本周错题 {report.wrongCount || 0} 道</div>
          <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <MarkdownPreview text={report.report || '暂无足够错题。'} />
          </div>
        </div>
      )}
    </div>
  );
}

export function PredictPanel({ onClose }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getExamPrediction(30, 10);
        if (cancelled) return;
        setPlan(res?.data?.nodes ? res.data : res);
      } catch (err) {
        if (!cancelled) setError(err.message || '生成失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nodes = Array.isArray(plan?.nodes) ? plan.nodes : [];

  function start() {
    onClose?.();
    navigate('/quiz', {
      state: {
        predictionPlan: {
          nodes: nodes.map((node) => node.knowledgeNodeId).filter(Boolean),
          totalQuestions: plan?.targetQuestionCount || 10,
        },
      },
    });
  }

  if (loading) return <p className="text-sm">正在根据近期错题整理预测卷…</p>;

  return (
    <div className="space-y-3 text-sm">
      <p style={{ color: 'var(--color-text-secondary)' }}>
        按近 30 天的薄弱知识点组一份预测卷。
      </p>
      {error && <div className="text-rose-600">{error}</div>}
      {nodes.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)' }}>
          近期练习还看不出薄弱点。先去做几道题，再来生成预测卷。
        </p>
      )}
      {nodes.length > 0 && (
        <>
          <div className="font-medium">约 {plan.targetQuestionCount || 10} 题，覆盖这些知识点</div>
          {nodes.slice(0, 6).map((node) => (
            <div key={node.knowledgeNodeId} className="rounded-lg p-2" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="font-medium">{node.knowledgeNodeId}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                {node.plannedCount ? `${node.plannedCount} 题 · ` : ''}
                {node.reason || `正确率 ${node.accuracy ?? '—'}%`}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-primary w-full" onClick={start}>
            开始预测卷
          </button>
        </>
      )}
    </div>
  );
}

export function NoteSummaryPanel({ noteContent }) {
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const text = String(noteContent || '').trim();

  async function summarize() {
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      const data = await generateNoteSummary(text);
      setSummary(data?.summary || '');
    } catch (err) {
      setError(err.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  if (!text) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        先在笔记页打开一篇笔记，或停在正在编辑的那篇，再来生成摘要。
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p style={{ color: 'var(--color-text-secondary)' }}>
        根据当前打开的笔记生成一段简短摘要。
      </p>
      <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={summarize}>
        {busy ? '生成中…' : '生成摘要'}
      </button>
      {error && <div className="text-rose-600">{error}</div>}
      {summary && (
        <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          {summary}
        </div>
      )}
    </div>
  );
}
