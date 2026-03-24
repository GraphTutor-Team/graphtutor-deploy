// client/src/pages/AIGenerator.jsx
// AI 出题页面：选择科目 + provider，生成题目并可写入题库

import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import {
  getAIProviders,
  generateBank,
  generateQuestionsWithAI,
} from '../api/ai';
import { toast } from '../utils/toast';

export default function AIGenerator() {
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('local-fallback');

  const [subject, setSubject] = useState('操作系统-进程与线程');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState(1);
  const [upsert, setUpsert] = useState(false);

  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);

  async function loadProviders() {
    try {
      const r = await getAIProviders();
      setProviders(r.providers || []);
      if (r.providers?.length && !r.providers.find((p) => p.id === providerId)) {
        setProviderId(r.providers[0].id);
      }
    } catch (e) {
      console.error('getAIProviders error:', e);
      toast.error(e.message || '加载 AI provider 失败');
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  async function handleGenerate() {
    setBusy(true);
    try {
      const res = await generateQuestionsWithAI({
        subject,
        count,
        difficulty,
        provider: providerId,
        upsert: false,
      });
      setItems(res.items || []);
      toast.success(`本次生成 ${res.items?.length || 0} 道题（未写入题库）`);
    } catch (e) {
      console.error('generate AI questions error:', e);
      toast.error(e.message || 'AI 出题失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateBank() {
    setBusy(true);
    try {
      const res = await generateBank({
        subject,
        count,
        difficulty,
        provider: providerId,
        upsert: true,
      });
      setItems(res.items || []);
      toast.info(
        `已生成并写入题库：${res.upserted || res.items?.length || 0} 道题`
      );
    } catch (e) {
      console.error('generate bank error:', e);
      toast.info(e.message || 'AI 出题并写入题库失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI 出题助手"
        desc="选择科目与大模型，一键生成可用于练习与题库的单选题。"
        backTo="/home"
        help={
          <div className="space-y-1 text-sm">
            <p>· 建议先选“只生成不入库”预览质量，再写入题库。</p>
            <p>· provider 可以选择本地伪 AI、OpenAI、通义千问等。</p>
          </div>
        }
      />

      {/* 配置区 */}
      <SectionCard title="出题配置">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1">
            <span className="label">科目 / 知识点：</span>
            <input
              className="input flex-1 min-w-[220px]"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例如：操作系统-进程与线程"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="label">题目数量：</span>
            <input
              type="number"
              className="input w-24"
              value={count}
              min={1}
              max={20}
              onChange={(e) =>
                setCount(Math.max(1, Math.min(20, Number(e.target.value || 1))))
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="label">难度（1~5）：</span>
            <input
              type="number"
              className="input w-24"
              value={difficulty}
              min={1}
              max={5}
              onChange={(e) =>
                setDifficulty(
                  Math.max(1, Math.min(5, Number(e.target.value || 1)))
                )
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="label">Provider：</span>
            <select
              className="input w-56"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（{p.model}）
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 items-center">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={upsert}
              onChange={(e) => setUpsert(e.target.checked)}
            />
            <span>同时写入题库（upsert）</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              onClick={handleGenerate}
              disabled={busy}
            >
              {busy ? '生成中…' : '只生成，不入库'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleGenerateBank}
              disabled={busy}
            >
              {busy ? '生成中…' : '生成并写入题库'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* 结果展示区 */}
      <SectionCard title={`本次生成结果（${items.length} 道）`}>
        <div className="space-y-3 max-h-[480px] overflow-auto pr-1">
          {items.map((q, idx) => (
            <div
              key={q.id || idx}
              className="card text-sm space-y-2"
            >
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>
                  第 {idx + 1} 题 · 难度 {q.difficulty || difficulty}
                </span>
                <span>{q.knowledgeNodeId || '未标注知识点'}</span>
              </div>
              <div className="font-semibold text-base mb-2">{q.content}</div>
              <ol className="list-decimal list-inside space-y-2">
                {(q.options || []).map((o, i) => (
                  <li
                    key={i}
                    className={
                      i === (q.correctIndex ?? 0)
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-900 font-medium'
                    }
                  >
                    {o}
                  </li>
                ))}
              </ol>
              {q.explain && (
                <div className="text-sm font-medium text-slate-700 mt-2">
                  解析：{q.explain}
                </div>
              )}
            </div>
          ))}
          {!items.length && (
            <div className="text-sm font-semibold text-slate-700">
              暂无生成结果，先在上方设置参数再点击"生成"。
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
