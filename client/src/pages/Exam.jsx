// client/src/pages/Exam.jsx
// 考试模式页面：题量选择 + 答题卡 + 评分 + 重新考试 + AI 补题
// ✅ 新增：
// 1）使用说明卡片 + 跳转到题库 / 知识点页面
// 2）从题库 Bank 页面跳转时，自动接收 knowledgeNodeId 并填入配置（useLocation）

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ProgressBar from "../components/ProgressBar";
import TimerBadge from "../components/TimerBadge";
import { useAuth } from "../context/AuthContext";
import { useLearningData } from "../context/LearningDataContext";
import { useAIContext } from "../context/AIContext";
import { buildQuestionBrief } from "../utils/aiBrief";
import { getBanks } from "../api/v3/questionBanks";
import { getSubjectTree } from "../api/v3/subjects";

// 简单随机抽题
function pickRandom(arr, count) {
  if (!Array.isArray(arr)) return [];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export default function Exam() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const { invalidateLearningData } = useLearningData();
  const { setAIContext } = useAIContext();

  // ===== 配置表单状态 =====
  const [knowledgeNodeId, setKnowledgeNodeId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState(20);
  const [useAi, setUseAi] = useState(false);
  const [aiProvider, setAiProvider] = useState("OPENAI");
  const [subject, setSubject] = useState("操作系统基础");
  const [subjectCode, setSubjectCode] = useState(""); // 学科筛选
  const [subjects, setSubjects] = useState([]); // 学科列表
  const [bankId, setBankId] = useState(""); // 题库筛选
  const [banks, setBanks] = useState([]); // 题库列表

  // 标记当前知识点是不是"从题库带过来的"，用于提醒用户
  const [fromBank, setFromBank] = useState(false);

  // ===== 考试数据状态 =====
  const [questions, setQuestions] = useState([]); // 题目数组
  const [answers, setAnswers] = useState([]); // 用户回答
  const [currentIndex, setCurrentIndex] = useState(0);

  // ===== 流程控制 =====
  const [step, setStep] = useState("config"); // config | exam | result
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ===== 计时 =====
  const [startTime, setStartTime] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ===== 统计结果 =====
  const [stats, setStats] = useState(null);
  // stats = { total, correct, wrong, empty, accuracy, durationSec, perQuestion: [...] }

  // ===== 从题库同步知识点列表 =====
  const [nodeOptions, setNodeOptions] = useState([]); // [{ id, count }]
  const [nodesLoading, setNodesLoading] = useState(false);
  const [nodesErr, setNodesErr] = useState("");

  // 加载学科列表
  useEffect(() => {
    async function loadSubjects() {
      try {
        const tree = await getSubjectTree();
        console.log("加载的学科数据:", tree);
        setSubjects(tree || []);
      } catch (e) {
        console.error("load subjects failed:", e);
        setSubjects([]);
      }
    }
    loadSubjects();
  }, []);

  // 计时器
  useEffect(() => {
    if (step !== "exam" || !startTime) return;
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, startTime]);

  const total = questions.length;

  const currentQuestion = useMemo(
    () =>
      total > 0 && currentIndex >= 0 && currentIndex < total
        ? questions[currentIndex]
        : null,
    [questions, currentIndex, total]
  );

  const canPrev = step === "exam" && currentIndex > 0;
  const canNext = step === "exam" && currentIndex < total - 1;

  useEffect(() => {
    if (step !== 'exam' || !currentQuestion) {
      setAIContext({ questionId: null, knowledgeNodeId: null, brief: '', mode: 'browse' });
      return undefined;
    }
    const qid = currentQuestion._id || currentQuestion.id || null;
    setAIContext({
      pageType: 'exam',
      mode: 'practice',
      questionId: qid,
      knowledgeNodeId: currentQuestion.knowledgeNodeId ?? currentQuestion.knowledgeNode ?? null,
      brief: buildQuestionBrief(currentQuestion, answers[currentIndex]),
    });
    return () => setAIContext({ questionId: null, knowledgeNodeId: null, brief: '', mode: 'browse' });
  }, [
    step,
    currentIndex,
    currentQuestion,
    answers,
    setAIContext,
  ]);

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // === 1. 首次加载时，从题库中提取所有出现过的知识点 ID 列表 ===
  useEffect(() => {
    async function loadNodeOptions() {
      setNodesLoading(true);
      setNodesErr("");
      try {
        // 这里取一个比较大的 limit，把题库里前几百/上千题扫一遍
        const res = await fetch("/api/questions?limit=1000");
        if (!res.ok) {
          throw new Error(`获取题库知识点失败（${res.status}）`);
        }
        const json = await res.json();
        const items = json.items || json.data || json || [];

        const map = new Map(); // key: knowledgeNodeId, value: count
        for (const q of items) {
          const kid =
            q.knowledgeNodeId || q.nodeId || q.knowledgeId || q.node || null;
          if (!kid) continue;
          const prev = map.get(kid) || 0;
          map.set(kid, prev + 1);
        }

        const opts = Array.from(map.entries())
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count); // 按题目数量降序

        setNodeOptions(opts);
      } catch (e) {
        console.error(e);
        setNodesErr(e.message || "加载知识点列表失败");
      } finally {
        setNodesLoading(false);
      }
    }

    loadNodeOptions();
  }, []);

  // 加载题库列表
  useEffect(() => {
    async function loadBanks() {
      try {
        const result = await getBanks({ limit: 100 });
        setBanks(result.data || []);
      } catch (e) {
        console.error("load banks failed:", e);
        setBanks([]);
      }
    }
    loadBanks();
  }, []);

  // === 2. 接收来自 Bank 页面跳转或群组作业带来的参数 ===
  useEffect(() => {
    const state = location.state || {};
    const incomingKid = state.knowledgeNodeId;
    const incomingBankId = state.bankId;
    const urlParams = new URLSearchParams(location.search);
    const urlBankId = urlParams.get('bankId');

    if (state.assignmentId && state.groupId) {
      setBankId(state.bankId || '');
      setCount(Math.max(1, Math.min(200, Number(state.questionCount) || 20)));
      setFromBank(true);
      setStep("config");
    }

    if (incomingKid) {
      setKnowledgeNodeId(incomingKid);
      setFromBank(true);
    }

    if (incomingBankId || urlBankId) {
      setBankId(incomingBankId || urlBankId);
      setFromBank(true);
    }

    if (incomingKid || incomingBankId || urlBankId) {
      setStep("config");
    }
  }, [location.state, location.search]);

  // ===== 开始考试：拉题库 + 可选 AI 补题 =====
  async function handleStartExam(e) {
    e?.preventDefault?.();
    setErr("");

    if (!count || count <= 0) {
      setErr("题目数量必须大于 0");
      return;
    }

    setLoading(true);
    try {
      let dataQuestions = [];

      // 1) 先从题库拉题
      const qs = new URLSearchParams();
      qs.set("limit", count);
      if (knowledgeNodeId) qs.set("knowledgeNodeId", knowledgeNodeId);
      if (difficulty) qs.set("difficulty", difficulty);
      if (subjectCode) qs.set("subjectCode", subjectCode);
      if (bankId) qs.set("bankId", bankId);

      const res = await fetch(`/api/questions?${qs.toString()}`);
      if (!res.ok) {
        throw new Error(`获取题库失败（${res.status}）`);
      }
      const json = await res.json();
      const fromDb = json.items || json.data || json || [];

      dataQuestions = fromDb;

      // 2) 题库不足且勾选 AI，就让 AI 补题
      if (useAi && dataQuestions.length < count) {
        const aiNeed = count - dataQuestions.length;

        const aiRes = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            count: aiNeed,
            difficulty: difficulty || 1,
            provider: aiProvider,
          }),
        });

        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          const aiQuestions = aiJson.items || aiJson.data || aiJson || [];
          const normalized = aiQuestions.map((q, idx) => ({
            _id: q._id || `AI_${Date.now()}_${idx}`,
            content: q.content,
            options: q.options || [],
            correctIndex:
              typeof q.correctIndex === "number"
                ? q.correctIndex
                : q.answerIndex ?? 0,
            explanation: q.explanation || q.explain || "",
            isAi: true,
          }));
          dataQuestions = dataQuestions.concat(normalized);
        } else {
          console.warn("AI 出题失败，使用现有题库题目");
        }
      }

      if (!dataQuestions || dataQuestions.length === 0) {
        throw new Error("当前配置下没有可用题目，请检查知识点 / 难度 / 题库是否为空");
      }

      // 3) 随机抽 count 道题
      const picked = pickRandom(dataQuestions, count);
      setQuestions(picked);
      setAnswers(new Array(picked.length).fill(null));
      setCurrentIndex(0);
      setStats(null);
      setStep("exam");
      setStartTime(Date.now());
      setElapsedSec(0);
      setFromBank(false); // 正式开考后，就不再提示“来自题库”
    } catch (e2) {
      console.error(e2);
      setErr(e2.message || "开始考试失败");
    } finally {
      setLoading(false);
    }
  }

  // 选择选项（支持多种题型）
  function handleSelectOption(optionIndex) {
    if (step !== "exam") return;
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setAnswers((prev) => {
      const next = [...prev];
      
      if (currentQuestion.type === 'multiple') {
        // 多选题：切换选中状态
        const currentAnswers = Array.isArray(next[currentIndex]) ? next[currentIndex] : [];
        const isSelected = currentAnswers.includes(optionIndex);
        next[currentIndex] = isSelected
          ? currentAnswers.filter(i => i !== optionIndex)
          : [...currentAnswers, optionIndex].sort((a, b) => a - b);
      } else {
        // 单选题、判断题：直接设置
        next[currentIndex] = optionIndex;
      }
      
      return next;
    });
  }

  // 填空题答案更新
  function handleFillAnswerChange(blankIndex, value) {
    if (step !== "exam") return;
    setAnswers((prev) => {
      const next = [...prev];
      const currentAnswers = Array.isArray(next[currentIndex]) ? next[currentIndex] : [];
      const newAnswers = [...currentAnswers];
      newAnswers[blankIndex] = value;
      next[currentIndex] = newAnswers;
      return next;
    });
  }

  // 简答题答案更新
  function handleShortAnswerChange(value) {
    if (step !== "exam") return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });
  }

  // 答题卡跳题
  function handleGo(i) {
    if (step !== "exam") return;
    if (i < 0 || i >= total) return;
    setCurrentIndex(i);
  }

  // 交卷并统计（支持多种题型）
  async function handleSubmit() {
    if (total === 0) return;

    // 使用统一的判分工具
    const { batchCheckAnswers } = await import('../utils/questionScoring');
    
    // 将 answers 数组转换为对象格式 { questionId: answer }
    const answersObj = {};
    questions.forEach((q, idx) => {
      const questionId = q._id || q.id || idx;
      answersObj[questionId] = answers[idx];
    });

    const result = batchCheckAnswers(questions, answersObj);
    
    const perQuestion = result.details.map((detail, idx) => {
      const q = questions[idx];
      return {
        index: detail.index,
        correctIndex: detail.details?.correctAnswer ?? detail.details?.correctAnswers ?? null,
        userIndex: answers[idx],
        isCorrect: detail.isCorrect,
        isEmpty: detail.isEmpty,
        score: detail.score,
        questionId: q._id || q.id || idx,
        knowledgeNodeId: q.knowledgeNodeId || null,
        questionType: q.type || 'single',
      };
    });

    setStats({
      total: result.total,
      correct: result.correct,
      wrong: result.wrong,
      empty: result.empty,
      accuracy: result.accuracy,
      durationSec: elapsedSec,
      perQuestion,
      averageScore: result.averageScore,
      totalScore: result.totalScore,
    });

    setStep("result");

    // 提交成绩到后端（含群组作业提交）
    const assignmentState = location.state?.assignmentId && location.state?.groupId
      ? { assignmentId: location.state.assignmentId, groupId: location.state.groupId }
      : null;
    submitExamResults(perQuestion, elapsedSec, assignmentState).catch(err => {
      console.error("提交考试结果失败:", err);
    });
  }

  // 提交考试结果到后端（可选：同时提交群组作业）
  async function submitExamResults(perQuestion, durationSec, assignmentInfo) {
    if (!user) {
      console.warn("未登录，不提交考试结果");
      return;
    }

    const userId = user._id || user.id || user.userId;
    if (!userId) {
      console.warn("无法获取用户ID，不提交考试结果");
      return;
    }

    const totalQuestions = perQuestion.length;
    const totalCorrect = perQuestion.filter((q) => q.isCorrect).length;

    try {
      const records = perQuestion.map(q => {
        // 根据题型构造答案数据
        let answerData = {};
        if (q.questionType === 'multiple' || q.questionType === 'fill') {
          answerData = {
            answerIndex: Array.isArray(q.userIndex) ? q.userIndex : null,
            correctIndex: Array.isArray(q.correctIndex) ? q.correctIndex : null,
          };
        } else if (q.questionType === 'short') {
          answerData = {
            answerIndex: typeof q.userIndex === 'string' ? q.userIndex : null,
            correctIndex: typeof q.correctIndex === 'string' ? q.correctIndex : null,
          };
        } else {
          answerData = {
            answerIndex: typeof q.userIndex === 'number' ? q.userIndex : null,
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : null,
          };
        }

        return {
          questionId: q.questionId ? String(q.questionId) : null,
          knowledgeNodeId: q.knowledgeNodeId || null,
          ...answerData,
          isCorrect: Boolean(q.isCorrect),
          score: typeof q.score === 'number' ? q.score : (q.isCorrect ? 1 : 0),
        };
      }).filter(r => r.questionId); // 过滤掉无效的questionId

      if (records.length === 0) {
        console.warn("没有有效的记录可提交");
        return;
      }

      // 使用批量提交API
      const response = await fetch("/api/records/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: String(userId),
          records,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("提交考试结果失败:", errorData);
        // 尝试逐条提交作为降级方案
        let successCount = 0;
        for (const record of records) {
          try {
            await fetch("/api/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: String(userId),
                ...record,
              }),
            });
            successCount++;
          } catch (e) {
            console.warn("单条记录提交失败:", e);
          }
        }
        console.log(`成功提交 ${successCount}/${records.length} 条记录`);
        if (successCount > 0) invalidateLearningData();
      } else {
        const result = await response.json();
        console.log("考试结果提交成功:", result);
        invalidateLearningData();
      }

      try {
        const { syncFriendChallengesAfterPractice } = await import('../utils/syncFriendChallenges');
        await syncFriendChallengesAfterPractice();
      } catch (_) {}

      if (assignmentInfo?.assignmentId && assignmentInfo?.groupId) {
        try {
          const { submitGroupAssignment } = await import('../api/v3/groups');
          await submitGroupAssignment(assignmentInfo.groupId, assignmentInfo.assignmentId, {
            totalQuestions,
            totalCorrect,
          });
          console.log("作业提交成功");
        } catch (e) {
          console.warn("作业提交失败:", e);
        }
      }
    } catch (err) {
      console.error("提交考试结果异常:", err);
    }
  }

  // 重新配置考试
  function handleRestart() {
    setStep("config");
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setStats(null);
    setStartTime(null);
    setElapsedSec(0);
    setErr("");
    // 不清掉 knowledgeNodeId，这样用户可以在原知识点上重新配置题量 / 难度再考一次
  }

  return (
    <div className="page-shell !space-y-4">
      <PageHeader
        title="考试模式"
        subtitle="按知识点 / 难度抽题进行模拟考试，支持答题卡与评分统计。"
      />

      {/* ===== 使用说明卡片（带跳转） ===== */}
      <div className="surface">
        <div className="font-bold flex items-center gap-2 mb-3 text-lg">
          <span className="text-slate-900 dark:text-slate-100">使用说明</span>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <li>
            请先在{" "}
            <Link
              to="/bank"
              className="link"
            >
              题库管理
            </Link>{" "}
            中添加题目，并为每道题设置合适的{" "}
            <span className="font-mono text-sm font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">
              知识点ID
            </span>
            。
          </li>
          <li>
            如果你是从题库点击「去考试」跳转到这里，系统会自动帮你选中对应的知识点
            ID，你只需调整题量 / 难度后点击「开始考试」即可。
          </li>
          <li>
            上方「知识点」支持{" "}
            <span className="font-bold text-slate-900">手动输入</span> 或{" "}
            <span className="font-bold text-slate-900">右侧列表快速选择</span>，列表中的
            ID 是从当前题库中自动汇总出来的。
          </li>
          <li>
            如果勾选「AI 出题」，当题库数量不足时，会自动调用 AI
            补齐试题，不会影响原有题库。
          </li>
          <li>
            考试过程中可使用右侧「答题卡」快速跳题，点击「交卷」后会在右侧看到本次
            成绩统计（总题数、正确 / 错误 / 未答、正确率、用时）。
          </li>
          <li>
            如需维护知识点列表，可前往{" "}
            <Link
              to="/nodes"
              className="link"
            >
              知识点管理
            </Link>{" "}
            或{" "}
            <Link
              to="/graph"
              className="link"
            >
              知识图谱
            </Link>{" "}
            页面进行管理。
          </li>
        </ul>
      </div>

      {/* ===== 考试配置区 ===== */}
      <div className="surface space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            考试配置
          </h2>
          {step === "exam" && (
            <TimerBadge label="已用时" value={formatTime(elapsedSec)} />
          )}
        </div>

        <form
          className="space-y-4"
          onSubmit={handleStartExam}
        >
          {/* 第一行：学科、题库和难度 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 学科 */}
            <div className="flex flex-col gap-2">
              <label className="label">
                学科（可选）
              </label>
              <select
                className="select w-full"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                disabled={step !== "config"}
              >
                <option value="">全部学科</option>
                {subjects.length > 0 ? (
                  (() => {
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
                    const flatList = flattenSubjects(subjects);
                    return flatList.map((subject) => {
                      const indent = '  '.repeat((subject.level || 1) - 1);
                      return (
                        <option key={subject.code} value={subject.code}>
                          {indent}{subject.icon || '📚'} {subject.name}
                        </option>
                      );
                    });
                  })()
                ) : (
                  <option value="" disabled>暂无学科数据</option>
                )}
              </select>
            </div>

            {/* 题库 */}
            <div className="flex flex-col gap-2">
              <label className="label">
                题库（可选）
              </label>
              <select
                className="select w-full"
                value={bankId}
                onChange={(e) => {
                  setBankId(e.target.value);
                  setFromBank(false);
                }}
                disabled={step !== "config"}
              >
                <option value="">全部题库</option>
                {banks.map((bank) => (
                  <option key={bank._id} value={bank._id}>
                    {bank.name} ({bank.questionCount || 0} 题)
                  </option>
                ))}
              </select>
            </div>

            {/* 难度 */}
            <div className="flex flex-col gap-2">
              <label className="label">
                难度（1-5，可选）
              </label>
              <select
                className="select w-full"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={step !== "config"}
              >
                <option value="">不限</option>
                <option value="1">1 - 容易</option>
                <option value="2">2 - 较易</option>
                <option value="3">3 - 中等</option>
                <option value="4">4 - 较难</option>
                <option value="5">5 - 困难</option>
              </select>
            </div>
          </div>
          
          {fromBank && bankId && (
            <div className="alert alert-success text-sm">
              已从题库页面选中题库：{" "}
              <span className="font-semibold">
                {banks.find(b => b._id === bankId)?.name || bankId}
              </span>
              ，你可以直接调整题量 / 难度后开始考试。
            </div>
          )}
          {location.state?.assignmentId && (
            <div className="alert alert-info text-sm">
              作业模式：完成并交卷后将自动提交到群组，老师可查看完成情况。
            </div>
          )}

          {/* 第二行：知识点 */}
          <div className="flex flex-col gap-2">
            <label className="label">
              知识点（可选）
            </label>
            <div className="space-y-2">
              {/* 文本输入：允许用户直接粘贴自己记住的 ID */}
              <input
                type="text"
                className="input w-full"
                placeholder="可手动填写知识点ID，例如：os.process.basic"
                value={knowledgeNodeId}
                onChange={(e) => {
                  setKnowledgeNodeId(e.target.value);
                  setFromBank(false);
                }}
                disabled={step !== "config"}
              />
              {/* 下拉列表：从题库自动汇总出来的知识点 ID */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 whitespace-nowrap">或从列表选择：</span>
                <select
                  className="select flex-1"
                  value={knowledgeNodeId}
                  onChange={(e) => {
                    setKnowledgeNodeId(e.target.value);
                    setFromBank(false);
                  }}
                  disabled={step !== "config"}
                >
                  <option value="">全部知识点</option>
                  {nodeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.id}（{opt.count} 题）
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {fromBank && knowledgeNodeId && (
              <p className="text-sm font-medium alert alert-success mt-2">
                已从题库选中知识点：{" "}
                <span className="font-mono bg-slate-50 px-2 py-1 rounded border-2 border-slate-300 font-semibold">
                  {knowledgeNodeId}
                </span>
                ，你可以直接调整题量 / 难度后开始考试。
              </p>
            )}
            {nodesLoading && (
              <p className="text-xs text-slate-400">
                正在从题库加载知识点列表…
              </p>
            )}
            {nodesErr && (
              <p className="text-xs text-red-500">{nodesErr}</p>
            )}
            {!nodesLoading && !nodesErr && nodeOptions.length === 0 && (
              <p className="text-xs text-slate-400">
                当前题库中还没有带知识点 ID 的题目，建议先在题库中完善。
              </p>
            )}
          </div>

          {/* 第三行：题目数量和AI出题 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 题目数量 */}
            <div className="flex flex-col gap-2">
              <label className="label">
                题目数量
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="input w-full"
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 0)}
                disabled={step !== "config"}
              />
            </div>

            {/* AI 出题开关 */}
            <div className="flex flex-col gap-2">
              <label className="label">
                AI 出题
              </label>
              <div className="flex items-center gap-2 h-10">
                <input
                  id="useAi"
                  type="checkbox"
                  className="toggle"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                  disabled={step !== "config"}
                />
                <label
                  htmlFor="useAi"
                  className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  题库不足时用 AI 补齐
                </label>
              </div>
            </div>
          </div>

          {/* AI 主题 & Provider */}
          {useAi && (
            <>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="label">
                  AI 出题主题
                </label>
                <input
                  className="input w-full"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="例如：操作系统进程管理"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="label">
                  AI 服务提供方
                </label>
                <select
                  className="select w-full"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                >
                  <option value="OPENAI">OpenAI</option>
                  <option value="DEEPSEEK">DeepSeek</option>
                  <option value="OLLAMA">本地模型（Ollama）</option>
                  <option value="LOCAL_FAKE">本地伪 AI</option>
                </select>
              </div>
            </>
          )}

          <div className="md:col-span-4 flex justify-end gap-2 pt-2">
            {step === "exam" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleSubmit}
              >
                交卷并评分
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading
                ? "正在准备试卷..."
                : step === "exam"
                ? "重新开始考试"
                : "开始考试"}
            </button>
          </div>
        </form>

        {err && <div className="alert alert-error text-sm">{err}</div>}
      </div>

      {/* ===== 考试 / 结果区域 ===== */}
      {step !== "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 items-start">
          {/* 左：当前题目 */}
          <div className="surface space-y-4">
            <div className="flex items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                当前题目
              </h3>
              {total > 0 && (
                <div className="badge badge-primary font-bold">
                  第 {currentIndex + 1} / {total} 题
                </div>
              )}
            </div>

            {total > 0 && (
              <ProgressBar value={((currentIndex + 1) / total) * 100} />
            )}

            {currentQuestion ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100 leading-relaxed flex-1">
                    {currentIndex + 1}. {currentQuestion.content}
                  </p>
                  {currentQuestion.type && (
                    <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                      currentQuestion.type === 'single' ? 'bg-blue-100 text-blue-700' :
                      currentQuestion.type === 'multiple' ? 'bg-slate-100 text-slate-700' :
                      currentQuestion.type === 'judge' ? 'bg-green-100 text-green-700' :
                      currentQuestion.type === 'fill' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {currentQuestion.type === 'single' ? '单选题' :
                       currentQuestion.type === 'multiple' ? '多选题' :
                       currentQuestion.type === 'judge' ? '判断题' :
                       currentQuestion.type === 'fill' ? '填空题' :
                       '简答题'}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {currentQuestion.type === 'fill' ? (
                    // 填空题
                    <div className="space-y-3">
                      {(currentQuestion.blankAnswers || Array(currentQuestion.blanks || 1).fill('')).map((_, blankIndex) => (
                        <div key={blankIndex} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 w-20">
                            空白 {blankIndex + 1}:
                          </span>
                          <input
                            type="text"
                            value={Array.isArray(answers[currentIndex]) ? (answers[currentIndex][blankIndex] || '') : ''}
                            onChange={(e) => handleFillAnswerChange(blankIndex, e.target.value)}
                            placeholder={`请输入第 ${blankIndex + 1} 个空白的答案`}
                            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  ) : currentQuestion.type === 'short' ? (
                    // 简答题
                    <div>
                      <textarea
                        value={typeof answers[currentIndex] === 'string' ? answers[currentIndex] : ''}
                        onChange={(e) => handleShortAnswerChange(e.target.value)}
                        rows={6}
                        placeholder="请输入您的答案"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (currentQuestion.options || []).length > 0 ? (
                    // 单选题、多选题、判断题
                    (currentQuestion.options || []).map((opt, idx) => {
                      const isSelected = currentQuestion.type === 'multiple'
                        ? Array.isArray(answers[currentIndex]) && answers[currentIndex].includes(idx)
                        : answers[currentIndex] === idx;
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOption(idx)}
                          className={
                            "w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium flex items-center gap-3 " +
                            (isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-900"
                              : "border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50 text-slate-900")
                          }
                        >
                          {currentQuestion.type === 'multiple' ? (
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
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {String.fromCharCode(65 + idx)}.
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

                <div className="mt-4 flex justify-between items-center gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => canPrev && setCurrentIndex((i) => i - 1)}
                      disabled={!canPrev}
                    >
                      上一题
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => canNext && setCurrentIndex((i) => i + 1)}
                      disabled={!canNext}
                    >
                      下一题
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleRestart}
                    >
                      重新配置
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleSubmit}
                    >
                      交卷
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                暂无题目，请先在上方配置并开始考试。
              </p>
            )}
          </div>

          {/* 右：答题卡 + 成绩卡片 */}
          <div className="space-y-4">
            {/* 答题卡 */}
            <div className="surface">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b-2 border-slate-200 pb-3">
                答题卡
              </h3>
              {total === 0 ? (
                <p className="text-sm text-slate-500">还没有题目。</p>
              ) : (
                <div className="grid grid-cols-8 gap-2">
                  {questions.map((q, idx) => {
                    const answered = q.type === 'multiple' 
                      ? (Array.isArray(answers[idx]) && answers[idx].length > 0)
                      : (q.type === 'fill'
                        ? (Array.isArray(answers[idx]) && answers[idx].some(a => a && a.trim()))
                        : (q.type === 'short'
                          ? (typeof answers[idx] === 'string' && answers[idx].trim())
                          : answers[idx] != null));
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleGo(idx)}
                        className={
                          "w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center border-2 transition-all duration-200 " +
                          (isCurrent
                            ? "border-slate-900 bg-slate-900 text-white"
                            : answered
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50")
                        }
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 结果卡片 */}
            {stats && (
              <div className="surface space-y-3">
                <h3 className="text-lg font-bold text-slate-900 border-b-2 border-slate-200 pb-3">
                  本次考试结果
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">总题数</span>
                    <span className="font-bold text-slate-900 text-lg">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">答对</span>
                    <span className="font-bold text-emerald-700 text-lg">{stats.correct}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">答错</span>
                    <span className="font-bold text-red-700 text-lg">{stats.wrong}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">未答</span>
                    <span className="font-bold text-slate-700 text-lg">{stats.empty}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200">
                    <span className="text-base font-bold text-slate-900">正确率</span>
                    <span className="text-xl font-bold text-slate-900">{(stats.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">用时</span>
                    <span className="font-bold text-slate-900 text-lg">{formatTime(stats.durationSec)}</span>
                  </div>
                </div>
                <div className="pt-3 border-t-2 border-slate-200">
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => {
                      navigate('/result', {
                        state: {
                          stats,
                          questions,
                          answers,
                          source: 'exam'
                        }
                      });
                    }}
                  >
                    查看详细结果
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
