/**
 * GraphTutor V3.0 - 练习模式页面
 * 
 * 作用：提供题目练习功能，支持单选题、多选题、判断题等，本地判分并记录答题结果
 * 关联页面：
 *   - pages/Result.jsx (答题结果页面)
 *   - api/api.js (题目和答题记录API)
 *   - api/v3/subjects.js (学科数据)
 *   - context/AuthContext.jsx (用户认证)
 * 技术栈：
 *   - React Hooks (useState, useEffect)
 *   - React Router (useNavigate)
 *   - 本地判分逻辑
 *   - 答题记录提交
 *   - 题目选项渲染
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useLearningData } from "../context/LearningDataContext";
import { getSubjectTree } from "../api/v3/subjects";

function OptionItem({ index, text, selected, onSelect, multiple = false }) {
  const label = String.fromCharCode(65 + index); // A/B/C/D...
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 mb-2 font-medium flex items-center gap-3 " +
        (selected
          ? "border-blue-500 bg-blue-50 text-blue-900"
          : "border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50 text-slate-900")
      }
    >
      {multiple ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}} // 由父组件处理
          className="w-4 h-4"
          readOnly
        />
      ) : (
        <input
          type="radio"
          checked={selected}
          onChange={() => {}} // 由父组件处理
          className="w-4 h-4"
          readOnly
        />
      )}
      <span className="font-bold text-slate-900">
        {label}.
      </span>
      <span className="font-medium flex-1">{text}</span>
    </button>
  );
}

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth() || {};
  const { invalidateLearningData } = useLearningData();
  const [loading, setLoading] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> userAnswer
  const [err, setErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [questionCount, setQuestionCount] = useState(50); // 可配置的题目数量
  const [subjectCode, setSubjectCode] = useState(""); // 学科筛选
  const [subjects, setSubjects] = useState([]); // 学科列表
  const [bankId, setBankId] = useState(""); // 题库筛选
  const [banks, setBanks] = useState([]); // 题库列表
  const groupPracticeQuestionIds = location.state?.groupPracticeQuestionIds; // 群组共同练习固定题号
  const predictionPlan = location.state?.predictionPlan || null; // Phase 2.6 考前预测计划：{ nodes: string[], totalQuestions }
  // Phase 2.3 动态难度：根据近期正确率与作答时间调整下一题难度
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [visitedOrder, setVisitedOrder] = useState([]); // 已做题目索引顺序
  const [recentResults, setRecentResults] = useState([]); // 最近 N 题 { correct, timeMs }
  const [currentTargetDifficulty, setCurrentTargetDifficulty] = useState(3);
  const questionStartTimeRef = useRef(Date.now());

  // 加载学科列表和题库列表
  useEffect(() => {
    async function loadSubjects() {
      try {
        const tree = await getSubjectTree();
        setSubjects(tree);
      } catch (e) {
        console.error("load subjects failed:", e);
      }
    }
    async function loadBanks() {
      try {
        const { getBanks } = await import('../api/v3/questionBanks');
        const result = await getBanks({ limit: 100 });
        setBanks(result.data || []);
      } catch (e) {
        console.error("load banks failed:", e);
        setBanks([]);
      }
    }
    loadSubjects();
    loadBanks();
  }, []);

  // 从题库拉一批题（或按群组共同练习的固定题号拉题）
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const params = {};
        if (groupPracticeQuestionIds?.length) {
          params.ids = groupPracticeQuestionIds.slice(0, 200).join(',');
        } else if (predictionPlan?.nodes?.length) {
          // 预测卷模式：按高风险知识点抽题
          params.limit = predictionPlan.totalQuestions || questionCount;
          params.random = 'true';
          // 简化：目前只支持单知识点 or 多知识点随机混合
          // 后端 questions.js 支持 knowledgeNodeId 通过 node 查询
          // 这里先只传第一个知识点，避免接口大改；后续可扩展为多次请求合并
          params.node = predictionPlan.nodes[0];
        } else {
          params.limit = adaptiveMode ? Math.max(questionCount, 80) : questionCount;
          params.random = 'true';
          if (subjectCode) params.subjectCode = subjectCode;
          if (bankId) params.bankId = bankId;
        }
        const res = await api.get("/questions", { params });
        const data = res.data || {};
        const items = data.items || data.data || data || [];
        const list = Array.isArray(items) ? items : [];
        const ordered = groupPracticeQuestionIds?.length ? list : (() => {
          const shuffled = [...list];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        })();
        if (!cancelled) {
          setQuestions(ordered);
          setAnswers({});
          setFinished(false);
          setScore(null);
          setVisitedOrder([]);
          setRecentResults([]);
          setCurrentTargetDifficulty(3);
          if (adaptiveMode && ordered.length > 0) {
            const usedSet = new Set();
            const firstIdx = ordered.map((q, i) => ({ i, d: typeof q.difficulty === 'number' ? q.difficulty : 1 }))
              .filter(({ i }) => !usedSet.has(i))
              .map(({ i, d }) => ({ i, dist: Math.abs(d - 3) }))
              .sort((a, b) => a.dist - b.dist);
            const minD = firstIdx[0]?.dist ?? 0;
            const candidates = firstIdx.filter((x) => x.dist === minD).map((x) => x.i);
            setIdx(candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : 0);
          } else {
            setIdx(0);
          }
        }
      } catch (e) {
        console.error("load questions failed:", e);
        if (!cancelled) setErr("获取题目失败。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const handleReload = () => { if (!cancelled) load(); };
    window.addEventListener('reload-questions', handleReload);
    return () => {
      cancelled = true;
      window.removeEventListener('reload-questions', handleReload);
    };
  }, [groupPracticeQuestionIds?.join(','), questionCount, subjectCode, bankId, adaptiveMode]);

  const current = questions[idx] || null;
  const total = questions.length;

  // 每次切题时记录开始时间（用于自适应难度的作答时间）
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [idx]);

  function normalizeOptions(q) {
    if (!q) return [];
    if (Array.isArray(q.options)) return q.options;
    if (Array.isArray(q.choices)) return q.choices;
    return [];
  }

  function normalizeAnswer(q) {
    if (!q) return null;
    // 支持 index / 字母 / 文本 等几种常见写法
    const ans = q.answer ?? q.correctAnswer ?? q.correct ?? null;
    if (ans == null) return null;

    const opts = normalizeOptions(q);
    if (typeof ans === "number") return ans;
    if (typeof ans === "string") {
      const trimmed = ans.trim();
      // "A" / "B"...
      if (/^[A-Z]$/i.test(trimmed)) {
        return trimmed.toUpperCase().charCodeAt(0) - 65;
      }
      // 如果能在选项数组里找到完全相等的文本，就用该 index
      const i = opts.findIndex((o) => String(o).trim() === trimmed);
      if (i >= 0) return i;
    }
    return null;
  }

  function handleSelect(optionIndex) {
    if (!current) return;
    const qid = current._id || current.id || idx;
    
    if (current.type === 'multiple') {
      // 多选题：切换选中状态
      setAnswers((prev) => {
        const currentAnswers = prev[qid] || [];
        const isSelected = Array.isArray(currentAnswers) && currentAnswers.includes(optionIndex);
        const newAnswers = isSelected
          ? currentAnswers.filter(i => i !== optionIndex)
          : [...(Array.isArray(currentAnswers) ? currentAnswers : []), optionIndex].sort((a, b) => a - b);
        return {
          ...prev,
          [qid]: newAnswers,
        };
      });
    } else {
      // 单选题、判断题：直接设置
      setAnswers((prev) => ({
        ...prev,
        [qid]: optionIndex,
      }));
    }
  }

  function goPrev() {
    setSubmitErr("");
    if (idx > 0) setIdx((i) => i - 1);
  }

  /** 从题目池中按目标难度选取下一题索引（Phase 2.3） */
  function pickNextByDifficulty(questions, usedSet, targetDifficulty) {
    const remaining = questions
      .map((q, i) => ({ i, d: typeof q.difficulty === 'number' ? q.difficulty : 1 }))
      .filter(({ i }) => !usedSet.has(i));
    if (remaining.length === 0) return null;
    const withDist = remaining.map(({ i, d }) => ({ i, dist: Math.abs(d - targetDifficulty) }));
    const minD = Math.min(...withDist.map((x) => x.dist));
    const candidates = withDist.filter((x) => x.dist === minD).map((x) => x.i);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  async function goNext() {
    setSubmitErr("");
    if (adaptiveMode && questions.length > 0) {
      const q = questions[idx];
      const qid = q._id || q.id || idx;
      const userAnswer = answers[qid];
      const { checkAnswer } = await import("../utils/questionScoring");
      const { isCorrect } = checkAnswer(q, userAnswer);
      const timeMs = Date.now() - questionStartTimeRef.current;
      const nextRecent = [...recentResults.slice(-4), { correct: isCorrect, timeMs }];
      setRecentResults(nextRecent);
      const rate = nextRecent.length ? nextRecent.filter((r) => r.correct).length / nextRecent.length : 0.5;
      const withTime = nextRecent.filter((r) => r.timeMs != null && r.timeMs > 0);
      const avgTimeMs = withTime.length ? withTime.reduce((s, r) => s + r.timeMs, 0) / withTime.length : 30000;
      // 正确率高且作答快 -> 提难度；正确率低或作答过慢 -> 降难度
      let newTarget = currentTargetDifficulty;
      if (rate >= 0.8 && avgTimeMs < 20000) newTarget = Math.min(5, currentTargetDifficulty + 1);
      else if (rate <= 0.4 || avgTimeMs > 60000) newTarget = Math.max(1, currentTargetDifficulty - 1);
      setCurrentTargetDifficulty(newTarget);
      const nextVisited = [...visitedOrder, idx];
      setVisitedOrder(nextVisited);
      const usedSet = new Set(nextVisited);
      const nextIdx = pickNextByDifficulty(questions, usedSet, newTarget);
      if (nextIdx === null) {
        const order = nextVisited;
        const qList = order.map((i) => questions[i]);
        const { batchCheckAnswers } = await import("../utils/questionScoring");
        const result = batchCheckAnswers(qList, answers);
        setScore(Math.round(result.accuracy * 100));
        setFinished(true);
        submitRecordsForOrder(qList, order);
        return;
      }
      setIdx(nextIdx);
      return;
    }
    if (idx < total - 1) setIdx((i) => i + 1);
  }

  /** 按题目顺序构建记录并提交（自适应模式与交卷共用） */
  async function submitRecordsForOrder(orderedQuestions) {
    if (!orderedQuestions?.length || !isAuthenticated || !user) return;
    const userId = user._id || user.id || user.userId;
    if (!userId) return;
    const { batchCheckAnswers } = await import("../utils/questionScoring");
    const result = batchCheckAnswers(orderedQuestions, answers);
    const recordsPayload = [];
    orderedQuestions.forEach((q, index) => {
      const qid = q._id || q.id || index;
      const questionId = q._id ? (typeof q._id === "string" ? q._id : String(q._id)) : (q.id || String(index));
      const userAnswer = answers[qid];
      const detail = result.details[index];
      let answerData = {};
      if (q.type === "multiple") {
        answerData = { answerIndex: Array.isArray(userAnswer) ? userAnswer : null, correctIndex: Array.isArray(q.answer) ? q.answer : (Array.isArray(q.answerIndices) ? q.answerIndices : null) };
      } else if (q.type === "fill") {
        answerData = { answerIndex: Array.isArray(userAnswer) ? userAnswer : null, correctIndex: Array.isArray(q.blankAnswers) ? q.blankAnswers : (Array.isArray(q.answer) ? q.answer : null) };
      } else if (q.type === "short") {
        answerData = { answerIndex: typeof userAnswer === "string" ? userAnswer : null, correctIndex: typeof q.answer === "string" ? q.answer : null };
      } else {
        answerData = { answerIndex: typeof userAnswer === "number" ? userAnswer : null, correctIndex: typeof (q.answerIndex ?? q.answer) === "number" ? (q.answerIndex ?? q.answer) : null };
      }
      recordsPayload.push({ questionId, questionContent: q.content || "", knowledgeNodeId: q.knowledgeNodeId || null, ...answerData, isCorrect: detail.isCorrect, score: detail.score, mode: "quiz" });
    });
    const batchPayload = {
      userId: String(userId),
      records: recordsPayload.filter((r) => r.questionId).map((r) => ({
        questionId: String(r.questionId),
        knowledgeNodeId: r.knowledgeNodeId || null,
        answerIndex: r.answerIndex,
        correctIndex: r.correctIndex,
        isCorrect: Boolean(r.isCorrect),
        score: typeof r.score === "number" ? r.score : (r.isCorrect ? 1 : 0),
      })),
    };
    if (batchPayload.records.length === 0) return;
    try {
      await api.post("/records/batch", batchPayload);
      invalidateLearningData();
    } catch (e) {
      console.warn("批量提交记录失败:", e);
    }
  }

  async function handleSubmit() {
    if (!questions.length) return;
    setLoadingSubmit(true);
    setSubmitErr("");
    try {
      const { batchCheckAnswers } = await import("../utils/questionScoring");
      const qList = adaptiveMode ? [...visitedOrder, idx].map((i) => questions[i]) : questions;
      const result = batchCheckAnswers(qList, answers);

      const recordsPayload = [];

      qList.forEach((q, index) => {
        const qid = q._id || q.id || index;
        const questionId = q._id ? (typeof q._id === 'string' ? q._id : String(q._id)) : (q.id || String(index));
        const userAnswer = answers[qid];
        const detail = result.details[index];
        
        // 根据题型构造不同的记录格式
        let answerData = {};
        if (q.type === 'multiple') {
          answerData = {
            answerIndex: Array.isArray(userAnswer) ? userAnswer : null,
            correctIndex: Array.isArray(q.answer) ? q.answer : (Array.isArray(q.answerIndices) ? q.answerIndices : null),
          };
        } else if (q.type === 'fill') {
          answerData = {
            answerIndex: Array.isArray(userAnswer) ? userAnswer : null,
            correctIndex: Array.isArray(q.blankAnswers) ? q.blankAnswers : (Array.isArray(q.answer) ? q.answer : null),
          };
        } else if (q.type === 'short') {
          answerData = {
            answerIndex: typeof userAnswer === 'string' ? userAnswer : null,
            correctIndex: typeof q.answer === 'string' ? q.answer : null,
          };
        } else {
          // 单选题、判断题
          answerData = {
            answerIndex: typeof userAnswer === 'number' ? userAnswer : null,
            correctIndex: typeof (q.answerIndex ?? q.answer) === 'number' ? (q.answerIndex ?? q.answer) : null,
          };
        }
        
        recordsPayload.push({
          questionId,
          questionContent: q.content || "",
          knowledgeNodeId: q.knowledgeNodeId || null,
          ...answerData,
          isCorrect: detail.isCorrect,
          score: detail.score,
          mode: "quiz",
        });
      });

      const localScore = Math.round(result.accuracy * 100);
      setScore(localScore);
      setFinished(true);

      // 尝试提交到 /api/records/batch（批量提交）
      if (isAuthenticated && user) {
        const userId = user._id || user.id || user.userId;
        if (!userId) {
          setSubmitErr("无法获取用户ID，记录未保存。");
          return;
        }

        try {
          // 使用正确的API路径和格式
          const batchPayload = {
            userId: String(userId), // 确保是字符串
            records: recordsPayload
              .filter(r => r.questionId) // 过滤掉无效的questionId
              .map(r => {
                // 根据题型处理答案数据
                return {
                  questionId: String(r.questionId),
                  knowledgeNodeId: r.knowledgeNodeId || null,
                  answerIndex: r.answerIndex, // 可能是 number、array 或 string
                  correctIndex: r.correctIndex, // 可能是 number、array 或 string
                  isCorrect: Boolean(r.isCorrect),
                  score: typeof r.score === 'number' ? r.score : (r.isCorrect ? 1 : 0),
                };
              })
          };

          if (batchPayload.records.length === 0) {
            setSubmitErr("没有有效的记录可提交。");
            return;
          }

          const response = await api.post("/records/batch", batchPayload);
          console.log("批量提交成功:", response.data);
          invalidateLearningData();
        } catch (eBatch) {
          console.warn("/records/batch 失败，尝试逐条提交:", eBatch);
          console.warn("错误详情:", eBatch.response?.data || eBatch.message);
          
          try {
            // 逐条提交作为降级方案
            let successCount = 0;
            let failCount = 0;
            
            for (const item of recordsPayload) {
              if (!item.questionId) {
                failCount++;
                continue;
              }
              
              try {
                const payload = {
                  userId: String(userId),
                  questionId: String(item.questionId),
                  knowledgeNodeId: item.knowledgeNodeId || null,
                  answerIndex: item.answerIndex, // 可能是 number、array 或 string
                  correctIndex: item.correctIndex, // 可能是 number、array 或 string
                  isCorrect: Boolean(item.isCorrect),
                  score: typeof item.score === 'number' ? item.score : (item.isCorrect ? 1 : 0),
                };
                
                await api.post("/records", payload);
                successCount++;
              } catch (eSingle) {
                const errorMsg = eSingle.response?.data?.error || eSingle.response?.data?.message || eSingle.message;
                console.warn("单条记录提交失败:", {
                  questionId: item.questionId,
                  answerIndex: item.userAnswerIndex,
                  error: errorMsg,
                  fullError: eSingle.response?.data
                });
                failCount++;
              }
            }
            
            if (failCount > 0) {
              setSubmitErr(`部分记录提交失败（${successCount}/${recordsPayload.length}）。`);
            } else if (successCount > 0) {
              // 全部成功，不显示错误
              console.log(`成功提交 ${successCount} 条记录`);
              invalidateLearningData();
            }
          } catch (eSingle) {
            console.error("逐条提交记录失败:", eSingle);
            setSubmitErr("作答记录提交失败（不影响本地评分）。");
          }
        }
      } else {
        setSubmitErr("未登录：本地已评分，但不会保存到服务器。");
      }
    } catch (e) {
      console.error("submit quiz failed:", e);
      setSubmitErr("提交失败。");
    } finally {
      setLoadingSubmit(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={groupPracticeQuestionIds?.length ? "共同练习" : "练习模式"}
        subtitle={groupPracticeQuestionIds?.length
          ? "群组共同练习，错题会自动进入错题本。"
          : "选择题库与题目数量后开始练习；错题会自动进入错题本，便于复习。"}
      />

      <section className="card border-b-0 rounded-b-none pb-3">
        {groupPracticeQuestionIds?.length > 0 && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">共同练习（共 {groupPracticeQuestionIds.length} 题）</p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">题目数量：</span>
            <input
              type="number"
              min="1"
              max="200"
              value={questionCount}
              onChange={(e) => {
                const count = Math.max(1, Math.min(200, Number(e.target.value) || 50));
                setQuestionCount(count);
              }}
              className="w-20 input text-sm"
              disabled={loading || finished || !!groupPracticeQuestionIds?.length}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0">学科：</span>
            <select
              className="select text-sm flex-1 min-w-[120px] max-w-full"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              disabled={loading || finished || !!groupPracticeQuestionIds?.length}
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
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 shrink-0">题库：</span>
            <select
              className="select text-sm flex-1 min-w-[120px] max-w-full"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              disabled={loading || finished || !!groupPracticeQuestionIds?.length}
            >
              <option value="">全部题库</option>
              {banks.map((bank) => (
                <option key={bank._id} value={bank._id}>
                  {bank.name} ({bank.questionCount || 0} 题)
                </option>
              ))}
            </select>
          </div>
          {!groupPracticeQuestionIds?.length && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adaptiveMode}
                onChange={(e) => setAdaptiveMode(e.target.checked)}
                disabled={loading || finished || questions.length > 0}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">自适应难度</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">（按正确率与作答时间调整）</span>
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              setQuestions([]);
              setAnswers({});
              setIdx(0);
              setFinished(false);
              setScore(null);
              setErr("");
              // 触发重新加载
              const event = new Event('reload-questions');
              window.dispatchEvent(event);
            }}
            className="btn btn-ghost text-xs"
            disabled={loading || !!groupPracticeQuestionIds?.length}
          >
            重新加载
          </button>
          {user ? (
            <div className="badge badge-primary text-sm font-semibold">当前用户：{user.email}</div>
          ) : (
            <div className="alert alert-warning text-sm font-medium py-2">
              未登录：可以练习，但作答记录不会保存。
            </div>
          )}
          {err && (
            <div className="alert alert-error text-sm font-medium py-2">
              {err}
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="text-sm font-semibold text-slate-700">正在加载题目...</div>
      ) : !current ? (
        <div className="text-xs text-slate-600">暂无题目。</div>
      ) : (
        <>
          <section className="card space-y-4">
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-3">
              <div className="badge badge-primary font-bold">
                {adaptiveMode ? `第 ${visitedOrder.length + 1} / ${total} 题` : `第 ${idx + 1} / ${total} 题`}
                {adaptiveMode && <span className="ml-1 text-xs opacity-90">(自适应)</span>}
              </div>
              {finished && score != null && (
                <div className="text-lg font-bold text-slate-900">当前得分：{score} 分</div>
              )}
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-slate-50 rounded-lg px-4 py-3 whitespace-pre-wrap text-slate-900 border-2 border-slate-200 font-medium flex-1">
                {current.content || "（无题干）"}
              </div>
              {current.type && (
                <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                  current.type === 'single' ? 'bg-blue-100 text-blue-700' :
                  current.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                  current.type === 'judge' ? 'bg-green-100 text-green-700' :
                  current.type === 'fill' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {current.type === 'single' ? '单选题' :
                   current.type === 'multiple' ? '多选题' :
                   current.type === 'judge' ? '判断题' :
                   current.type === 'fill' ? '填空题' :
                   '简答题'}
                </span>
              )}
            </div>

            <div className="mt-2">
              {current.type === 'fill' ? (
                // 填空题
                <div className="space-y-3">
                  {(current.blankAnswers || Array(current.blanks || 1).fill('')).map((_, blankIndex) => (
                    <div key={blankIndex} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 w-20">
                        空白 {blankIndex + 1}:
                      </span>
                      <input
                        type="text"
                        value={answers[current._id || current.id || idx]?.[blankIndex] || ''}
                        onChange={(e) => {
                          const qid = current._id || current.id || idx;
                          setAnswers((prev) => {
                            const currentAnswers = prev[qid] || [];
                            const newAnswers = [...currentAnswers];
                            newAnswers[blankIndex] = e.target.value;
                            return {
                              ...prev,
                              [qid]: newAnswers,
                            };
                          });
                        }}
                        placeholder={`请输入第 ${blankIndex + 1} 个空白的答案`}
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              ) : current.type === 'short' ? (
                // 简答题
                <div>
                  <textarea
                    value={answers[current._id || current.id || idx] || ''}
                    onChange={(e) => {
                      const qid = current._id || current.id || idx;
                      setAnswers((prev) => ({
                        ...prev,
                        [qid]: e.target.value,
                      }));
                    }}
                    rows={6}
                    placeholder="请输入您的答案"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : normalizeOptions(current).length === 0 ? (
                <div className="text-[11px] text-slate-500">
                  此题未配置选项。
                </div>
              ) : (
                normalizeOptions(current).map((opt, i) => {
                  const qid = current._id || current.id || idx;
                  const isSelected = current.type === 'multiple'
                    ? Array.isArray(answers[qid]) && answers[qid].includes(i)
                    : answers[qid] === i;
                  
                  return (
                    <OptionItem
                      key={i}
                      index={i}
                      text={opt}
                      selected={isSelected}
                      onSelect={() => handleSelect(i)}
                      multiple={current.type === 'multiple'}
                    />
                  );
                })
              )}
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={idx === 0}
                className="btn btn-ghost"
              >
                上一题
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={idx === total - 1}
                className="btn btn-ghost"
              >
                下一题
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {submitErr && (
                <div className="alert alert-error text-sm font-medium py-2">
                  {submitErr}
                </div>
              )}
              {finished && score != null ? (
                <button
                  type="button"
                  className="btn btn-primary min-h-[44px] touch-manipulation"
                  onClick={async () => {
                    // 使用统一的判分工具构造统计数据
                    const { batchCheckAnswers } = await import('../utils/questionScoring');
                    const result = batchCheckAnswers(questions, answers);
                    const perQuestion = result.details.map((detail, index) => {
                      const q = questions[index];
                      return {
                        index: detail.index,
                        correctIndex: detail.details?.correctAnswer ?? detail.details?.correctAnswers ?? null,
                        userIndex: answers[q._id || q.id || index],
                        isCorrect: detail.isCorrect,
                        isEmpty: detail.isEmpty,
                        score: detail.score,
                        questionId: detail.questionId,
                        knowledgeNodeId: q.knowledgeNodeId || null,
                        questionType: q.type || 'single',
                      };
                    });
                    const correct = result.correct;
                    const empty = result.empty;
                    const wrong = result.wrong;
                    const accuracy = result.accuracy;
                    
                    navigate('/result', {
                      state: {
                        stats: {
                          total,
                          correct,
                          wrong,
                          empty,
                          accuracy,
                          durationSec: null, // Quiz模式没有计时
                          perQuestion,
                        },
                        questions,
                        answers: questions.map((q) => answers[q._id || q.id || questions.indexOf(q)]),
                        source: 'quiz'
                      }
                    });
                  }}
                >
                  查看详细结果
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!total || loadingSubmit}
                  className="btn btn-primary min-h-[44px] touch-manipulation"
                >
                  {loadingSubmit ? "提交中..." : "提交并统计分数"}
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
