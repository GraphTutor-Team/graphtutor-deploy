import { useEffect, useState } from "react";
import BackBar from "../components/BackBar";
import { importQuestionsJSON } from "../api/questions";
import { listBanks, createBank } from "../api/banks";
import { toast } from "../utils/toast";

/**
 * 从 JSON 文件 / 文本导入题库
 * - 支持选择已有题库 / 新建题库（QuestionBank）
 * - 支持统一设置默认难度（1~5）
 * - 自动补全 Question.bankId / difficulty / source
 */
export default function GenFromFile() {
  const [jsonText, setJsonText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [successCount, setSuccessCount] = useState(null);

  // ===== 题库 & 难度相关状态 =====
  const [banks, setBanks] = useState([]); // [{ _id, name, ... }]
  const [bankMode, setBankMode] = useState("existing"); // existing | new
  const [selectedBankId, setSelectedBankId] = useState(""); // 已有题库 _id
  const [newBankName, setNewBankName] = useState(""); // 新题库名称
  const [defaultDifficulty, setDefaultDifficulty] = useState(3); // 默认难度 1~5

  // ===== 初始化：加载现有题库列表 =====
  useEffect(() => {
    async function loadBanks() {
      try {
        const list = await listBanks();
        setBanks(list || []);
      } catch (err) {
        console.error("加载题库列表失败", err);
        toast.error("加载题库列表失败，请检查是否已登录 / 有权限");
      }
    }
    loadBanks();
  }, []);

  // ===== 选择 JSON 文件 =====
  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".json")) {
      toast.error("请上传 .json 文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const txt = String(ev.target?.result || "");
      setJsonText(txt);
      setFile(f);
      setLog("");
      setSuccessCount(null);
    };
    reader.onerror = () => {
      toast.error("读取文件失败");
    };
    reader.readAsText(f, "utf-8");
  }

  // ===== 点击“导入题库” =====
  async function handleImport() {
    if (!jsonText.trim()) {
      toast.error("请先上传或粘贴 JSON 内容");
      return;
    }

    // 解析 JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON 解析失败：", e);
      toast.error("JSON 解析失败，请检查格式是否为数组");
      return;
    }

    if (!Array.isArray(parsed) || !parsed.length) {
      toast.error("JSON 必须是非空数组");
      return;
    }

    setLoading(true);
    setLog("");
    setSuccessCount(null);

    try {
      // === 1. 确定要导入到哪个题库（QuestionBank） ===
      let targetBankId = null;

      if (bankMode === "existing") {
        if (!selectedBankId) {
          toast.error("请选择一个已有题库");
          setLoading(false);
          return;
        }
        targetBankId = selectedBankId;
      } else {
        const name = newBankName.trim();
        if (!name) {
          toast.error("请输入新题库名称");
          setLoading(false);
          return;
        }
        // 先创建题库
        const bank = await createBank({ name });
        targetBankId = bank._id;

        // 更新本地列表 & 状态，方便后续继续用这个题库导入
        setBanks((prev) => [bank, ...(prev || [])]);
        setBankMode("existing");
        setSelectedBankId(bank._id);
        toast.success(`已创建新题库：「${bank.name}」`);
      }

      // === 2. 规范默认难度 ===
      const d0 = Number(defaultDifficulty) || 3;
      const safeDefaultDiff = Math.min(5, Math.max(1, d0));

      // === 3. 逐题补全 bankId / difficulty / source 字段 ===
      const items = parsed.map((raw) => {
        const item = { ...(raw || {}) };

        // 题库：使用 Question.bankId 关联 QuestionBank
        if (!item.bankId && targetBankId) {
          item.bankId = targetBankId;
        }

        // 难度：限定在 1~5 范围内
        const d = Number(item.difficulty);
        if (!Number.isFinite(d) || d < 1 || d > 5) {
          item.difficulty = safeDefaultDiff;
        } else {
          item.difficulty = Math.min(5, Math.max(1, d));
        }

        // 题目来源：如果未指定，则默认为 "bank"（普通题库录入）
        if (!item.source) {
          item.source = "bank";
        }

        return item;
      });

      // === 4. 调用后端导入接口：/api/questions/import/json ===
      const res = await importQuestionsJSON(items);
      const data = res?.data ?? res;
      const count =
        data?.upserted ||
        data?.inserted ||
        data?.count ||
        items.length;

      setSuccessCount(count);
      setLog(JSON.stringify(data, null, 2));
      toast.success(`导入成功：${count} 条题目`);
    } catch (err) {
      console.error("导入失败：", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "导入题库失败，请查看日志";
      setLog(String(msg));
      toast.error("导入失败，请查看右侧日志信息");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setJsonText("");
    setLog("");
    setSuccessCount(null);
    // 题库选择 & 默认难度不清空，方便连续导入到同一题库
  }

  return (
    <div className="relative px-6 py-6 space-y-6">
      <BackBar title="从文件导入题库" />

      {/* 顶部提示 */}
      <div className="alert alert-info">
        <div className="font-bold mb-2 text-base">
          📥 导入说明
        </div>
        <div className="space-y-1 leading-relaxed text-sm font-medium">
          <p>支持从 JSON 文件或粘贴 JSON 文本批量导入题目。</p>
          <p>
            字段示例：
            <code>content</code> /
            <code>options</code> /
            <code>correctIndex</code> /
            <code>difficulty</code> /
            <code>knowledgeNodeId</code>
            等。
          </p>
          <p>
            本页会自动帮你补全
            <code>bankId（所属题库）</code> 与
            <code>difficulty（难度 1~5）</code>，
            未指定<code>source</code> 的题目默认记为 <code>"bank"</code>。
          </p>
        </div>
      </div>

      {/* 主体：左侧设置 + 右侧日志 */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* 左侧：导入设置 */}
        <div className="card space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">
            导入题库设置
          </h2>

          <div className="space-y-4 text-sm">
            {/* 题库选择 */}
            <div className="space-y-1">
              <label className="block text-xs text-slate-500">
                选择导入目标题库（QuestionBank）
              </label>

              <div className="flex flex-wrap gap-3 text-xs">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    className="h-3 w-3"
                    value="existing"
                    checked={bankMode === "existing"}
                    onChange={() => setBankMode("existing")}
                  />
                  <span>使用已有题库</span>
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    className="h-3 w-3"
                    value="new"
                    checked={bankMode === "new"}
                    onChange={() => setBankMode("new")}
                  />
                  <span>新建题库</span>
                </label>
              </div>

              {bankMode === "existing" && (
                <select
                  className="input text-xs md:text-sm"
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                >
                  <option value="">请选择已有题库</option>
                  {banks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name || b.key || b._id}
                    </option>
                  ))}
                </select>
              )}

              {bankMode === "new" && (
                <input
                  className="input text-xs md:text-sm"
                  placeholder="输入新题库名称，例如：操作系统·进程管理"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                />
              )}
            </div>

            {/* 默认难度 */}
            <div className="space-y-1">
              <label className="block text-xs text-slate-500">
                默认难度等级（1 = 非常简单，5 = 非常困难）
              </label>
              <select
                className="block w-full rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-xs md:text-sm"
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(Number(e.target.value))}
              >
                <option value={1}>1 - 非常简单（记忆题）</option>
                <option value={2}>2 - 简单（单概念理解）</option>
                <option value={3}>3 - 中等（2~3 步推理）</option>
                <option value={4}>4 - 困难（综合 / 易混淆点）</option>
                <option value={5}>5 - 非常困难（综合挑战题）</option>
              </select>
            </div>

            {/* 文件上传 */}
            <div className="space-y-1">
              <label className="label text-sm">
                选择 JSON 文件
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm font-medium text-slate-900"
              />
              {file && (
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  已选择：{file.name}
                </p>
              )}
            </div>

            {/* 粘贴 JSON 文本 */}
            <div className="space-y-1">
              <label className="label text-sm">
                或粘贴 JSON 内容（题目数组）
              </label>
              <textarea
                className="input w-full min-h-[220px] text-xs md:text-sm font-mono"
                placeholder='例如：[{"content":"题干","options":["A","B","C"],"correctIndex":1,"difficulty":1}]'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={handleImport}
                className={`
                  inline-flex items-center gap-2
                  px-5 py-2.5 rounded-full text-sm font-medium
                  bg-blue-600 text-white shadow-sm
                  hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md
                  active:translate-y-0 active:shadow-sm
                  transition-all duration-150
                  disabled:opacity-60 disabled:hover:-translate-y-0
                `}
              >
                <span>{loading ? "正在导入…" : "导入题库"}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="
                  inline-flex items-center justify-center
                  px-4 py-2.5 rounded-full text-sm
                  border border-slate-300/80 dark:border-slate-600
                  text-slate-700 dark:text-slate-100
                  hover:bg-slate-50 dark:hover:bg-slate-800/70
                "
              >
                清空
              </button>
            </div>

            {/* 成功提示 */}
            {successCount != null && (
              <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2.5 text-xs text-emerald-700 flex items-center gap-2">
                <span>✅</span>
                <span>导入成功，共 {successCount} 条题目。</span>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：日志 */}
        <div className="card flex flex-col">
          <h2 className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">
            导入日志 / 返回结果
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            展示 /api/questions/import/json 或 /bulk-upsert 返回内容，方便排查问题。
          </p>
          <pre className="flex-1 overflow-auto text-xs bg-slate-950/90 text-slate-100 rounded-xl px-3 py-2 whitespace-pre-wrap border border-slate-200/80 dark:border-slate-700/80">
            {log || "暂无日志"}
          </pre>
        </div>
      </section>
    </div>
  );
}
