/**
 * GraphTutor V3.0 - 管理后台首页
 *
 * 作用：管理员后台入口，系统统计、全量备份导入导出、管理功能导航
 */

import BackBar from '../components/BackBar';
import HelpHint from '../components/HelpHint.jsx';
import Toolbar from '../components/Toolbar.jsx';
import { Link } from 'react-router-dom';
import { downloadFile, toast, jsonReq, API_BASE } from '../utils/download';
import SystemStats from './admin/components/SystemStats';

async function tryJson(url) {
  try {
    return await jsonReq(url);
  } catch {
    return null;
  }
}

export default function Admin() {
  async function onExportAll() {
    try {
      toast('正在导出全量备份…');
      const backup = await jsonReq(`${API_BASE}/admin/export/all`);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(`graphtutor_backup_${date}.json`, JSON.stringify(backup, null, 2));
      const meta = backup?.meta || {};
      const trunc = meta.recordsTruncated ? '（作答已截断）' : '';
      toast(
        `已导出：学科 ${meta.subjectCount || 0} / 知识点 ${meta.nodeCount || 0} / 题库 ${meta.bankCount || 0} / 题目 ${meta.questionCount || 0} / 作答 ${meta.recordCount || 0}${trunc}`
      );
    } catch (e) {
      toast('导出失败：' + (e.message || '未知错误'));
    }
  }

  async function onImport() {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = '.json,application/json';
    i.onchange = async () => {
      try {
        const text = await i.files[0].text();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch {
          throw new Error('JSON 格式无效');
        }
        toast('正在导入…');
        const res = await jsonReq(`${API_BASE}/admin/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = res?.data || res || {};
        const s = data.subjects || {};
        const n = data.knowledgeNodes || {};
        const b = data.banks || {};
        const q = data.questions || {};
        const r = data.records || {};
        toast(
          `导入完成：学科 +${s.created || 0}/改${s.updated || 0}，知识点 ${n.upserted || 0}，题库 +${b.created || 0}/改${b.updated || 0}，题目 +${q.created || 0}/改${q.updated || 0}，作答 +${r.created || 0}/跳过${r.skipped || 0}`
        );
      } catch (e) {
        toast('导入失败：' + (e.message || '未知错误'));
      }
    };
    i.click();
  }

  async function onStats() {
    const s = await tryJson(`${API_BASE}/admin/stats`);
    if (s) {
      downloadFile('stats.json', JSON.stringify(s, null, 2));
      toast('已下载 stats.json');
      return;
    }
    const [graph, qs, recs] = await Promise.all([
      tryJson(`${API_BASE}/graph/nodes`).then((x) => (Array.isArray(x) ? x : x?.nodes || [])),
      tryJson(`${API_BASE}/questions?limit=1&skip=0&count=1`),
      tryJson(`${API_BASE}/records?limit=2000`),
    ]);
    const approx = {
      nodes: graph.length,
      questions:
        typeof qs === 'object' && typeof qs.total === 'number'
          ? qs.total
          : qs?.items?.length || 0,
      records: Array.isArray(recs) ? recs.length : 0,
      generatedAt: new Date().toISOString(),
    };
    downloadFile('stats.approx.json', JSON.stringify(approx, null, 2));
    toast('已下载 stats.approx.json');
  }

  return (
    <div>
      <BackBar title="管理后台" />

      <div className="space-y-4">
        <SystemStats />

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-3">
            <div className="font-semibold">数据备份</div>
            <Toolbar>
              <button type="button" className="btn btn-primary" onClick={onExportAll}>
                全量导出
              </button>
              <button type="button" className="btn" onClick={onStats}>
                统计汇总
              </button>
            </Toolbar>
            <HelpHint>
              全量导出包含：学科、知识点、题库及题目、作答记录（按用户邮箱 + 题目 qid 映射；不含密码）。单次最多约 10 万条作答。统计汇总仅下载计数。
            </HelpHint>
          </div>

          <div className="card space-y-3">
            <div className="font-semibold">数据恢复</div>
            <Toolbar>
              <button type="button" className="btn" onClick={onImport}>
                导入备份（JSON）
              </button>
            </Toolbar>
            <HelpHint>
              选择全量备份 JSON，按学科 → 知识点 → 题库/题目 → 作答记录顺序合并导入。内容按 code / key / qid 更新；作答依赖目标库已有同邮箱用户，按用户+题目+时间去重。
            </HelpHint>
          </div>

          <div className="card space-y-3 md:col-span-2">
            <div className="font-semibold">用户与权限</div>
            <Toolbar>
              <Link className="btn" to="/admin/users">
                用户管理（角色分配）
              </Link>
              <Link className="btn" to="/admin/operation-logs">
                操作日志
              </Link>
              <Link className="btn" to="/admin/reports">
                统计报表
              </Link>
              <Link className="btn" to="/admin/role-applications">
                角色申请审核
              </Link>
              <Link className="btn" to="/profile">
                查看个人信息
              </Link>
            </Toolbar>
            <HelpHint>
              用户管理：直接修改用户角色；角色申请审核：审核用户提交的角色申请。
            </HelpHint>
          </div>
        </div>
      </div>
    </div>
  );
}
