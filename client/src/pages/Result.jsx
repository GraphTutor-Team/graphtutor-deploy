// Result.jsx
// 结果分析页面：接收 Exam / Quiz 传入的统计数据，展示详细结果列表。
// 如果没有 state（用户直接打开 /result），则提示先去做一次考试/练习。

import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { formatAnswerDisplay, formatCorrectAnswerDisplay } from "../utils/questionScoring";
import QuizResultInsights from "../components/QuizResultInsights";
import { useAIContext } from "../context/AIContext";
import { chat, getTodaySet } from "../api/v3/ai";
import { getExamPrediction } from "../api/v3/enhancedAnalytics";

function StatCard({ label, value, suffix, hint }) {
  const display =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
      ? value
      : String(value);

  return (
    <div className="card flex flex-col gap-2">
      <div className="text-sm font-bold text-slate-900">
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900 flex items-baseline gap-1">
        <span>{display}</span>
        {suffix && (
          <span className="text-base font-semibold text-slate-700">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <div className="text-sm font-medium text-slate-700">
          {hint}
        </div>
      )}
    </div>
  );
}

function StatusTag({ isCorrect, isEmpty }) {
  if (isEmpty) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
        未作答
      </span>
    );
  }
  if (isCorrect) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
        回答正确
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">
      回答错误
    </span>
  );
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAIContext } = useAIContext();
  const incoming = location.state || {};

  const stats = incoming.stats || null;
  const questions = incoming.questions || [];
  const answers = incoming.answers || [];
  const source = incoming.source || "exam";

  const [filterMode, setFilterMode] = useState("all"); // all | wrong | empty | correct
  const [recap, setRecap] = useState("");
  const [recapIds, setRecapIds] = useState([]);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapError, setRecapError] = useState("");
  const [predictBusy, setPredictBusy] = useState(false);

  const hasData = !!stats && Array.isArray(questions) && questions.length > 0;

  // 如果 Exam 没有把 perQuestion 塞进 stats，就在这里补一遍（支持多种题型）
  const perQuestion = useMemo(() => {
    if (stats && Array.isArray(stats.perQuestion) && stats.perQuestion.length) {
      return stats.perQuestion;
    }
    
    // 简单计算（如果 stats 中没有 perQuestion，使用基本逻辑）
    return questions.map((q, idx) => {
      const questionType = q.type || 'single';
      let correctIndex, userIndex, isCorrect, isEmpty;
      
      if (questionType === 'single' || questionType === 'judge') {
        correctIndex = q.answerIndex ?? q.answer ?? 0;
        userIndex = answers[idx];
        isCorrect = typeof correctIndex === 'number' && typeof userIndex === 'number' && correctIndex === userIndex;
        isEmpty = userIndex == null;
      } else if (questionType === 'multiple') {
        correctIndex = Array.isArray(q.answer) ? q.answer : (Array.isArray(q.answerIndices) ? q.answerIndices : []);
        userIndex = Array.isArray(answers[idx]) ? answers[idx] : [];
        const correctSorted = [...correctIndex].sort((a, b) => a - b);
        const userSorted = [...userIndex].sort((a, b) => a - b);
        isCorrect = correctSorted.length === userSorted.length &&
          correctSorted.every((ans, idx) => ans === userSorted[idx]);
        isEmpty = !Array.isArray(userIndex) || userIndex.length === 0;
      } else if (questionType === 'fill') {
        correctIndex = q.blankAnswers || q.answer || [];
        userIndex = Array.isArray(answers[idx]) ? answers[idx] : [];
        isEmpty = !Array.isArray(userIndex) || userIndex.length === 0 || userIndex.every(a => !a || !a.trim());
        // 填空题：所有空白都正确才算正确
        if (!isEmpty && Array.isArray(correctIndex) && Array.isArray(userIndex)) {
          const normalizedCorrect = correctIndex.map(a => String(a).trim().toLowerCase());
          const normalizedUser = userIndex.map(a => String(a).trim().toLowerCase());
          isCorrect = normalizedCorrect.length === normalizedUser.length &&
            normalizedCorrect.every((ans, idx) => ans === normalizedUser[idx]);
        } else {
          isCorrect = false;
        }
      } else if (questionType === 'short') {
        correctIndex = q.answer || '';
        userIndex = typeof answers[idx] === 'string' ? answers[idx] : '';
        isEmpty = !userIndex || !userIndex.trim();
        // 简答题：简单文本匹配（可以后续改进）
        isCorrect = !isEmpty && String(correctIndex).trim().toLowerCase() === String(userIndex).trim().toLowerCase();
      } else {
        correctIndex = q.answerIndex ?? q.answer ?? 0;
        userIndex = answers[idx];
        isCorrect = correctIndex === userIndex;
        isEmpty = userIndex == null;
      }
      
      return {
        index: idx,
        correctIndex,
        userIndex,
        isCorrect,
        isEmpty,
        questionId: q._id || q.id || idx,
        knowledgeNodeId: q.knowledgeNodeId || null,
        questionType,
      };
    });
  }, [stats, questions, answers]);

  const total = stats?.total ?? questions.length ?? 0;
  const correct = stats?.correct ?? perQuestion.filter((x) => x.isCorrect).length;
  const empty = stats?.empty ?? perQuestion.filter((x) => x.isEmpty).length;
  const wrong = stats?.wrong ?? (total - correct - empty);
  const accuracy =
    stats?.accuracy ?? (total > 0 ? correct / total : null);
  const durationSec = stats?.durationSec ?? null;

  const sessionBrief = useMemo(() => {
    if (!hasData) return "";
    const wrongItems = perQuestion.filter((item) => !item.isCorrect).slice(0, 8);
    const lines = wrongItems.map((item) => {
      const q = questions[item.index];
      const stem = String(q?.content || "").replace(/\s+/g, " ").slice(0, 80);
      return `- ${item.isEmpty ? "未答" : "答错"}：${stem}`;
    });
    return `本次${source === "exam" ? "考试" : "练习"}：共 ${total} 题，对 ${correct}，错 ${wrong}，未答 ${empty}。\n错题摘要：\n${lines.join("\n") || "没有错题"}`;
  }, [hasData, perQuestion, questions, source, total, correct, wrong, empty]);

  const wrongIds = useMemo(
    () =>
      perQuestion
        .filter((item) => !item.isCorrect && !item.isEmpty && item.questionId)
        .map((item) => String(item.questionId))
        .filter((id) => /^[a-f0-9]{24}$/i.test(id))
        .slice(0, 200),
    [perQuestion]
  );

  const wrongNodeIds = useMemo(() => {
    const seen = new Set();
    const ids = [];
    perQuestion.forEach((item) => {
      if (item.isCorrect) return;
      const nodeId = questions[item.index]?.knowledgeNodeId;
      if (!nodeId) return;
      const key = String(nodeId);
      if (seen.has(key)) return;
      seen.add(key);
      ids.push(key);
    });
    return ids.slice(0, 8);
  }, [perQuestion, questions]);

  useEffect(() => {
    if (!hasData) {
      setAIContext({ pageType: "other", mode: "browse", brief: "", questionId: null });
      return undefined;
    }
    setAIContext({
      pageType: "result",
      mode: "review_session",
      brief: sessionBrief,
      questionId: null,
      knowledgeNodeId: null,
      wrongQuestionIds: wrongIds,
    });
    return () =>
      setAIContext({
        pageType: "other",
        mode: "browse",
        brief: "",
        questionId: null,
        wrongQuestionIds: [],
      });
  }, [hasData, sessionBrief, wrongIds, setAIContext]);

  async function startSessionPrediction() {
    if (!wrongNodeIds.length || predictBusy) return;
    setPredictBusy(true);
    const nodes = [...wrongNodeIds];
    const labels = new Map();
    try {
      const res = await getExamPrediction(30, 10);
      const plan = res?.data?.nodes ? res.data : res;
      (plan?.nodes || []).forEach((node) => {
        const id = node?.knowledgeNodeId ? String(node.knowledgeNodeId) : "";
        if (!id) return;
        if (node.name) labels.set(id, node.name);
        if (!nodes.includes(id) && nodes.length < 8) nodes.push(id);
      });
    } catch {
      // 本周预测暂时取不到时，仍用这次答错的知识点组卷
    } finally {
      setPredictBusy(false);
    }
    navigate("/quiz", {
      state: {
        predictionPlan: {
          nodes,
          nodeLabels: nodes.map((id) => labels.get(id) || id),
          totalQuestions: Math.min(20, Math.max(6, nodes.length * 2)),
        },
        practiceSource: "ai",
      },
    });
  }

  function practiceThisSession() {
    if (!wrongIds.length) return;
    navigate("/quiz", { state: { practiceQuestionIds: wrongIds, practiceSource: "review" } });
  }

  async function generateRecap() {
    if (!sessionBrief || recapLoading) return;
    setRecapLoading(true);
    setRecapError("");
    try {
      let nodeLine = "";
      if (wrongIds.length) {
        try {
          const today = await getTodaySet(8, wrongIds);
          const names = (today?.weakNodes || [])
            .map((node) => node.name || node.knowledgeNodeId)
            .filter(Boolean);
          if (names.length) nodeLine = `相关知识点：${names.join("、")}。`;
        } catch {
          nodeLine = "";
        }
      }
      const data = await chat(
        [{ role: "user", content: `${nodeLine}请用三句话说明这次答错的原因，并指出先看哪个知识点。不要输出题号。` }],
        {
          pageType: "result",
          mode: "review_session",
          brief: sessionBrief,
          wrongQuestionIds: wrongIds,
        }
      );
      setRecap(data?.content || "");
      setRecapIds([]);
    } catch (err) {
      setRecapError(err.message || "复盘生成失败");
    } finally {
      setRecapLoading(false);
    }
  }

  function formatTime(sec) {
    if (!sec && sec !== 0) return "—";
    const s = Number(sec) || 0;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, "0")}:${r
      .toString()
      .padStart(2, "0")}`;
  }

  const filteredItems = useMemo(() => {
    if (!perQuestion.length) return [];
    return perQuestion.filter((item) => {
      if (filterMode === "wrong") return !item.isCorrect && !item.isEmpty;
      if (filterMode === "empty") return item.isEmpty;
      if (filterMode === "correct") return item.isCorrect && !item.isEmpty;
      return true;
    });
  }, [perQuestion, filterMode]);

  if (!hasData) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="暂无结果"
          subtitle="还没有接收到本次考试/练习的结果，请先完成一次考试或练习再查看此页面。"
        />
        <div className="card text-sm space-y-2">
          <p>
            你可以先前往
            <Link
              to="/exam"
              className="link mx-1"
            >
              考试模式
            </Link>
            或
            <Link
              to="/quiz"
              className="link mx-1"
            >
              练习模式
            </Link>
            ，完成一轮作答后，在结果页点击“查看详细结果”跳转到本页面。
          </p>
          <p>
            本页面设计用于答辩截屏和学习分析展示，将呈现每道题的作答情况、正确答案和解析等信息。
          </p>
        </div>
      </div>
    );
  }

  const score =
    typeof accuracy === "number" ? Math.round(accuracy * 100) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={source === "exam" ? "考试结果分析" : "练习结果分析"}
        subtitle="查看本次作答的整体表现、每道题的正确/错误情况以及对应的知识点，方便总结与复盘。"
      />

      {/* 总览卡片 */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="本次得分（正确率）"
          value={score}
          suffix={score != null ? "分 / 100 分" : ""}
          hint="根据正确率计算，仅供参考，不作为真实考试分数。"
        />
        <StatCard
          label="答对题数"
          value={correct}
          suffix={` / ${total}`}
          hint="回答正确的题目数量。"
        />
        <StatCard
          label="答错题数 / 未答题数"
          value={`${wrong} / ${empty}`}
          hint="错误题 + 未作答题，建议重点查看并加入错题本。"
        />
        <StatCard
          label="作答用时"
          value={formatTime(durationSec)}
          suffix=""
          hint="从开始到交卷的总耗时。"
        />
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900">AI 复盘</div>
            <div className="text-sm text-slate-600 mt-1">
              {wrongIds.length
                ? "这次答错的题可以马上再练。复盘用来看错因，不练也可以先生成。"
                : "这次没有答错的题。"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {wrongIds.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={practiceThisSession}
              >
                {`接着练这 ${wrongIds.length} 道错题`}
              </button>
            )}
            {wrongNodeIds.length > 0 && (
              <button type="button" className="btn" onClick={startSessionPrediction} disabled={predictBusy}>
                {predictBusy ? "组卷中…" : "按这次和本周薄弱点出预测卷"}
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={generateRecap}
              disabled={recapLoading}
            >
              {recapLoading ? "生成中…" : "生成复盘"}
            </button>
          </div>
        </div>
        {recapError && <div className="text-sm text-rose-600">{recapError}</div>}
        {recap && <div className="text-sm text-slate-700 whitespace-pre-wrap">{recap}</div>}
        {recapIds.length > 0 && (
          <button
            type="button"
            className="btn"
            onClick={() =>
              navigate("/quiz", {
                state: { practiceQuestionIds: recapIds, practiceSource: "ai" },
              })
            }
          >
            练习推荐的 {recapIds.length} 题
          </button>
        )}
      </section>

      {/* 过滤工具条 */}
      <section className="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-base font-bold text-slate-900">
            题目列表
          </div>
          <div className="text-sm font-semibold text-slate-700 mt-1">
            共 {total} 题，当前显示{" "}
            {filteredItems.length} 题（过滤条件：{filterMode}）。
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={
              "px-3 py-1 rounded-full border transition-all " +
              (filterMode === "all"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")
            }
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("wrong")}
            className={
              "px-3 py-1 rounded-full border " +
              (filterMode === "wrong"
                ? "border-rose-500 bg-rose-50 text-rose-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50")
            }
          >
            只看错题
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("empty")}
            className={
              "px-3 py-1 rounded-full border " +
              (filterMode === "empty"
                ? "border-slate-500 bg-slate-50 text-slate-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50")
            }
          >
            只看未作答
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("correct")}
            className={
              "px-3 py-1 rounded-full border " +
              (filterMode === "correct"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50")
            }
          >
            只看答对
          </button>
        </div>
      </section>

      {/* 题目详情列表（适合 PPT 截图） */}
      <section className="space-y-3">
        {filteredItems.map((item) => {
          const q = questions[item.index];
          const opts = q.options || [];
          const correctIndex =
            typeof q.correctIndex === "number"
              ? q.correctIndex
              : item.correctIndex ?? 0;
          const userIndex = item.userIndex;

          return (
            <div
              key={q._id || q.id || item.index}
              className="card space-y-2"
            >
              {/* 行头：题号 + 状态 + 知识点 */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-slate-700">
                    第 {item.index + 1} 题
                  </span>
                  <StatusTag
                    isCorrect={item.isCorrect}
                    isEmpty={item.isEmpty}
                  />
                </div>
                <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>
                    知识点：
                    <span className="font-mono">
                      {item.knowledgeNodeId || q.knowledgeNodeId || "—"}
                    </span>
                  </span>
                  {q.difficulty && (
                    <span>难度：{q.difficulty}</span>
                  )}
                </div>
              </div>

              {/* 题干 */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-base font-semibold text-slate-900 whitespace-pre-line flex-1">
                  {q.content}
                </div>
                {q.type && (
                  <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                    q.type === 'single' ? 'bg-blue-100 text-blue-700' :
                    q.type === 'multiple' ? 'bg-slate-100 text-slate-700' :
                    q.type === 'judge' ? 'bg-green-100 text-green-700' :
                    q.type === 'fill' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {q.type === 'single' ? '单选题' :
                     q.type === 'multiple' ? '多选题' :
                     q.type === 'judge' ? '判断题' :
                     q.type === 'fill' ? '填空题' :
                     '简答题'}
                  </span>
                )}
              </div>

              {/* 根据题型显示答案 */}
              {(q.type === 'single' || q.type === 'multiple' || q.type === 'judge') && opts.length > 0 ? (
                // 单选题、多选题、判断题：显示选项列表
                <ul className="mt-1 space-y-1 text-sm">
                  {opts.map((opt, idx) => {
                    const isCorrect = q.type === 'multiple'
                      ? (Array.isArray(correctIndex) && correctIndex.includes(idx))
                      : (idx === correctIndex || idx === (q.answerIndex ?? q.answer));
                    const isUser = q.type === 'multiple'
                      ? (Array.isArray(userIndex) && userIndex.includes(idx))
                      : (userIndex === idx);

                    let rowClass =
                      "flex items-start gap-2 rounded-xl px-2 py-1";
                    if (isCorrect && isUser) {
                      rowClass +=
                        " bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-bold";
                    } else if (isCorrect) {
                      rowClass +=
                        " bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-semibold";
                    } else if (isUser && !item.isCorrect) {
                      rowClass +=
                        " bg-red-50 border-2 border-red-300 text-red-900 font-semibold";
                    }

                    return (
                      <li key={idx} className={rowClass}>
                        <span className="mt-0.5 font-mono text-xs w-5">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <div className="flex-1">
                          <div>{opt}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 space-x-1">
                            {isCorrect && (
                              <span>✅ 正确答案</span>
                            )}
                            {isUser && !item.isEmpty && (
                              <span>
                                {item.isCorrect ? "🎉 你的选择" : "❌ 你的选择"}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : q.type === 'fill' ? (
                // 填空题：显示空白答案对比
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-slate-50 rounded-lg border-2 border-emerald-300">
                    <div className="text-sm font-semibold text-emerald-900 mb-2">✅ 正确答案：</div>
                    <div className="text-sm text-slate-900">
                      {formatCorrectAnswerDisplay(q)}
                    </div>
                  </div>
                  {!item.isEmpty && (
                    <div className={`p-3 rounded-lg border-2 ${
                      item.isCorrect 
                        ? 'bg-emerald-50 border-emerald-300' 
                        : 'bg-red-50 border-red-300'
                    }`}>
                      <div className={`text-sm font-semibold mb-2 ${
                        item.isCorrect ? 'text-emerald-900' : 'text-red-900'
                      }`}>
                        {item.isCorrect ? '🎉 你的答案（正确）' : '❌ 你的答案（错误）'}：
                      </div>
                      <div className={`text-sm ${
                        item.isCorrect ? 'text-emerald-900' : 'text-red-900'
                      }`}>
                        {formatAnswerDisplay(q, userIndex)}
                      </div>
                    </div>
                  )}
                </div>
              ) : q.type === 'short' ? (
                // 简答题：显示参考答案和用户答案对比
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-slate-50 rounded-lg border-2 border-emerald-300">
                    <div className="text-sm font-semibold text-emerald-900 mb-2">✅ 参考答案：</div>
                    <div className="text-sm text-slate-900 whitespace-pre-wrap">
                      {formatCorrectAnswerDisplay(q)}
                    </div>
                  </div>
                  {!item.isEmpty && (
                    <div className={`p-3 rounded-lg border-2 ${
                      item.isCorrect 
                        ? 'bg-emerald-50 border-emerald-300' 
                        : 'bg-red-50 border-red-300'
                    }`}>
                      <div className={`text-sm font-semibold mb-2 ${
                        item.isCorrect ? 'text-emerald-900' : 'text-red-900'
                      }`}>
                        {item.isCorrect ? '🎉 你的答案（正确）' : '❌ 你的答案（错误）'}：
                      </div>
                      <div className={`text-sm whitespace-pre-wrap ${
                        item.isCorrect ? 'text-emerald-900' : 'text-red-900'
                      }`}>
                        {formatAnswerDisplay(q, userIndex)}
                      </div>
                      {typeof item.score === 'number' && item.score < 1 && (
                        <div className="text-xs text-slate-600 mt-2">
                          相似度评分：{(item.score * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // 默认显示选项（向后兼容）
                opts.length > 0 && (
                  <ul className="mt-1 space-y-1 text-sm">
                    {opts.map((opt, idx) => {
                      const isCorrect = idx === correctIndex;
                      const isUser = userIndex === idx;
                      let rowClass = "flex items-start gap-2 rounded-xl px-2 py-1";
                      if (isCorrect && isUser) {
                        rowClass += " bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-bold";
                      } else if (isCorrect) {
                        rowClass += " bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-semibold";
                      } else if (isUser && !item.isCorrect) {
                        rowClass += " bg-red-50 border-2 border-red-300 text-red-900 font-semibold";
                      }
                      return (
                        <li key={idx} className={rowClass}>
                          <span className="mt-0.5 font-mono text-xs w-5">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <div className="flex-1">
                            <div>{opt}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 space-x-1">
                              {isCorrect && <span>✅ 正确答案</span>}
                              {isUser && !item.isEmpty && (
                                <span>
                                  {item.isCorrect ? "🎉 你的选择" : "❌ 你的选择"}
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}

              {/* 解析 */}
              {q.explanation || q.explain ? (
                <div className="mt-2">
                  <div className="text-sm font-semibold text-slate-700 mb-2">
                    解析
                  </div>
                  <div className="text-base font-medium text-slate-900 whitespace-pre-line">
                    {q.explanation || q.explain}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {/* 学习洞察和建议 */}
      {hasData && (
        <QuizResultInsights stats={stats} questions={questions} answers={answers} />
      )}

      {/* 底部操作按钮 */}
      <section className="flex flex-wrap justify-end gap-2 text-xs mt-2">
        <Link
          to={source === "exam" ? "/exam" : "/quiz"}
          className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          返回{source === "exam" ? "考试" : "练习"}页面
        </Link>
        <Link
          to="/review"
          className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          去错题本
        </Link>
      </section>
    </div>
  );
}
