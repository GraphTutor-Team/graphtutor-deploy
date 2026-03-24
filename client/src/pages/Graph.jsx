import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import HelpHint from '../components/HelpHint.jsx';
import { downloadFile, toast, API_BASE, getStoredToken } from '../utils/download';
import { getGraphHeatmap } from '../api/v3/enhancedAnalytics';

async function safeJSON(r) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

const NODES_PAGE_SIZE = 50;

export default function Graph() {
  const [nodes, setNodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [nodePage, setNodePage] = useState(1);
  const [heatmapMap, setHeatmapMap] = useState({}); // Phase 2.4: key -> { masteryPercent, wrongCount, practiceCount }

  async function load() {
    setBusy(true);
    try {
      const token = getStoredToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const r = await fetch(`${API_BASE}/graph/nodes`, { headers });
      if (!r.ok) throw new Error();
      const data = await safeJSON(r);
      setNodes(Array.isArray(data) ? data : data?.nodes || []);
      setNodePage(1);
      if (getStoredToken()) {
        getGraphHeatmap(90).then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            const map = res.data.reduce((acc, n) => { acc[n.key] = n; return acc; }, {});
            setHeatmapMap(map);
          }
        }).catch(() => {});
      } else {
        setHeatmapMap({});
      }
    } catch (err) {
      console.error('加载节点失败:', err);
      toast('加载失败，请检查网络连接或刷新页面重试');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addNode() {
    if (!key.trim()) {
      toast('请输入 key');
      return;
    }
    setBusy(true);
    try {
      const token = getStoredToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const r = await fetch(`${API_BASE}/graph/nodes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: key.trim(), name: name.trim() }),
      });
      if (!r.ok) {
        const error = await safeJSON(r);
        throw new Error(error?.error || '创建失败');
      }
      setKey('');
      setName('');
      toast('节点创建成功');
      await load();
    } catch (err) {
      console.error('创建节点失败:', err);
      toast(err.message || '创建失败，请检查key是否已存在');
    } finally {
      setBusy(false);
    }
  }

  async function removeNode(k) {
    if (!confirm(`删除节点 ${k}？`)) return;
    setBusy(true);
    try {
      const token = getStoredToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      let r = await fetch(
        `${API_BASE}/graph/nodes/${encodeURIComponent(k)}`,
        { method: 'DELETE', headers }
      );
      if (!r.ok) {
        // 兼容旧版接口
        r = await fetch(`${API_BASE}/graph/${encodeURIComponent(k)}`, {
          method: 'DELETE',
          headers,
        });
      }
      if (!r.ok) throw new Error();
      toast('节点删除成功');
      await load();
    } catch (err) {
      console.error('删除节点失败:', err);
      toast('删除失败，请重试');
    } finally {
      setBusy(false);
    }
  }

  async function doExport() {
    setBusy(true);
    try {
      const token = getStoredToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const r = await fetch(`${API_BASE}/graph/export`, { headers });
      if (!r.ok) throw new Error();
      const text = await r.text();
      downloadFile('graph-export.json', text);
      toast('已导出 graph-export.json');
    } catch (err) {
      console.error('导出失败:', err);
      toast('导出失败，请重试');
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const text = await file.text();
      setBusy(true);
      try {
        // 验证JSON格式
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('JSON格式错误，请检查文件内容');
        }
        
        // 验证数据结构
        const nodes = Array.isArray(data.nodes) ? data.nodes : (Array.isArray(data) ? data : []);
        if (nodes.length === 0) {
          throw new Error('文件中没有找到节点数据');
        }
        
        const token = getStoredToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const r = await fetch(`${API_BASE}/graph/import`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nodes }),
        });
        if (!r.ok) {
          const error = await safeJSON(r);
          throw new Error(error?.error || '导入失败');
        }
        toast(`导入成功，共导入 ${nodes.length} 个节点`);
        await load();
      } catch (err) {
        console.error('导入失败:', err);
        toast(err.message || '导入失败，请检查文件格式');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }

  function handleDownloadTemplate(format = 'json') {
    const url = `/api/v3/templates/nodes/${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `node-template.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`正在下载${format.toUpperCase()}模板...`);
  }

  return (
    <div className="space-y-6">
      {/* 顶部页面头 */}
      <PageHeader
        title="知识图谱 · 节点管理"
        desc="维护课程知识点节点，可配合题库、AI 出题使用。建议：先添加节点，再在题目中关联知识点。"
        backTo="/home"
        help={
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p>每个节点有唯一 key，可在题目里作为 knowledgeNodeId 引用</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p>建议先导入一批节点，再在题库里关联相应知识点</p>
            </div>
          </div>
        }
        actions={[
          {
            label: busy ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                刷新中
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新列表
              </div>
            ),
            onClick: load,
            disabled: busy,
          },
        ]}
      />

      {/* 导入 / 导出 工具区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="导入节点"
          desc="从 JSON 文件导入节点数据"
          className="bg-blue-50 dark:bg-blue-900/20"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">导入 JSON 文件</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">支持 graph-export.json 格式</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex gap-1">
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDownloadTemplate('json')}
                    disabled={busy}
                    title="JSON格式"
                  >
                    📥 JSON
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    disabled={busy}
                    title="Excel格式"
                  >
                    📥 Excel
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDownloadTemplate('docx')}
                    disabled={busy}
                    title="Word格式"
                  >
                    📥 Word
                  </button>
                </div>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={doImport} 
                  disabled={busy}
                >
                  选择文件
                </button>
              </div>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 p-2 rounded">
              💡 提示：请先下载模板文件，按照模板格式填写节点数据后再导入
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="导出节点"
          desc="导出所有节点数据为 JSON 文件"
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">导出为 JSON</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">备份或迁移节点数据</p>
              </div>
            </div>
            <button
              className="btn btn-primary bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
              onClick={doExport}
              disabled={busy}
            >
              立即导出
            </button>
          </div>
        </SectionCard>
      </div>
      

      {/* 新增节点区 */}
      <SectionCard 
        title="新增知识点节点"
        desc="创建新的知识点节点，key 为唯一标识符"
        className="bg-blue-50 dark:bg-blue-900/20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Key（唯一标识）
                <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              className="input w-full"
              placeholder="例如：os-thread"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                显示名称
              </div>
            </label>
            <input
              className="input w-full"
              placeholder="例如：进程与线程"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button 
              className="btn btn-primary btn-sm w-full"
              onClick={addNode} 
              disabled={busy}
              style={{ maxWidth: '100px' }}
            >
              {busy ? (
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  创建中...
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新增节点
                </div>
              )}
            </button>
          </div>
        </div>
        
        <HelpHint title="使用提示" type="info">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm">节点 key 一旦用于题目中，尽量不要随意更改</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm">可以先用导入功能批量创建，再在这里微调名称</p>
            </div>
          </div>
        </HelpHint>
      </SectionCard>

      {/* 列表区 */}
      <SectionCard 
        title={
          <div className="flex items-center gap-3">
            <span>节点列表</span>
            <div className="px-3 py-1 bg-slate-100 rounded-full text-sm font-bold border border-slate-300">
              {nodes.length} 个节点
            </div>
            {busy && (
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <div className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
                更新中...
              </div>
            )}
          </div>
        }
      >
        {Object.keys(heatmapMap).length > 0 && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
              <span className="font-medium text-slate-600">掌握度 / 错题（登录用户）：</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> ≥70% 掌握</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> 40–70%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> &lt;40%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300" /> 无数据</span>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
          {nodes.length > NODES_PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 text-sm">
              <span className="text-slate-600">
                共 {nodes.length} 个节点，当前第 {(nodePage - 1) * NODES_PAGE_SIZE + 1}–{Math.min(nodePage * NODES_PAGE_SIZE, nodes.length)} 条
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={nodePage <= 1}
                  onClick={() => setNodePage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={nodePage >= Math.ceil(nodes.length / NODES_PAGE_SIZE)}
                  onClick={() => setNodePage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            </div>
          )}
          <table className="min-w-full">
            <thead className="bg-white border-b-2 border-slate-300">
              <tr>
                <th className="text-left px-6 py-4 font-bold text-slate-900 w-16">#</th>
                <th className="text-left px-6 py-4 font-bold text-slate-900">Key</th>
                <th className="text-left px-6 py-4 font-bold text-slate-900">名称</th>
                <th className="text-left px-6 py-4 font-bold text-slate-900 w-36">掌握度 / 错题</th>
                <th className="text-left px-6 py-4 font-bold text-slate-900 w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {nodes
                .slice((nodePage - 1) * NODES_PAGE_SIZE, nodePage * NODES_PAGE_SIZE)
                .map((x, i) => (
                <tr 
                  key={x.key || i}
                  className="group hover:bg-slate-50 transition-all duration-200 bg-white"
                >
                  <td className="px-6 py-4">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-900 border-2 border-slate-300">
                      {(nodePage - 1) * NODES_PAGE_SIZE + i + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-slate-100 px-3 py-1.5 rounded-lg border-2 border-slate-300 font-mono font-semibold text-slate-900 group-hover:bg-slate-200 transition-colors">
                      {x.key}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">
                      {x.name || <span className="text-slate-600 italic font-medium">未命名</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const h = heatmapMap[x.key];
                      if (!h) return <span className="text-slate-400 text-sm">—</span>;
                      const pct = h.masteryPercent;
                      const bg = pct >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : pct >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : (h.practiceCount > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400');
                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg}`} title="掌握度（正确率%）">
                            {h.practiceCount > 0 ? `${pct}%` : '—'}
                          </span>
                          {h.wrongCount > 0 && (
                            <span className="text-xs text-slate-600 dark:text-slate-400" title="错题本中该知识点题数">
                              错 {h.wrongCount}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="btn btn-danger btn-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white"
                      onClick={() => removeNode(x.key)}
                      disabled={busy}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {!nodes.length && (
                <tr>
                  <td
                    className="px-6 py-12 text-center"
                    colSpan={5}
                  >
                    <div className="flex flex-col items-center justify-center space-y-4 text-slate-400 dark:text-slate-500">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="space-y-2">
                        <p className="font-medium text-lg">暂无节点数据</p>
                        <p className="text-sm">可以通过上方表单新增节点或导入 JSON 文件</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}