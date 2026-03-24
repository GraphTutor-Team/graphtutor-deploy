/**
 * GraphTutor V3.0 - 管理后台首页
 * 
 * 作用：管理员后台入口页面，提供系统统计、数据导出和各个管理功能的导航链接
 * 关联页面：
 *   - components/SystemStats.jsx (系统统计组件)
 *   - pages/admin/UserManagement.jsx (用户管理)
 *   - pages/admin/OperationLogs.jsx (操作日志)
 *   - pages/admin/Reports.jsx (统计报表)
 *   - pages/admin/RoleApplicationManagement.jsx (角色申请管理)
 * 技术栈：
 *   - React组件
 *   - React Router (Link导航)
 *   - 数据导出功能
 *   - 卡片布局
 */

import BackBar from '../components/BackBar';
import HelpHint from '../components/HelpHint.jsx';
import Skeleton from '../components/Skeleton.jsx';
import Empty from '../components/Empty.jsx';
import Toolbar from '../components/Toolbar.jsx';
import { Link } from "react-router-dom";
import { downloadFile, toast, jsonReq, API_BASE } from '../utils/download';
import SystemStats from './admin/components/SystemStats';

async function tryJson(url){ try{ return await jsonReq(url); }catch{ return null; } }

export default function Admin(){
  async function onExport(){
    try{
      // 使用 jsonReq 以自动添加认证头
      const token = localStorage.getItem('gt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const r = await fetch(`${API_BASE}/admin/export/all`, { headers });
      if(!r.ok) throw new Error('导出失败');
      const text = await r.text();
      downloadFile('graphtutor-export-all.json', text);
      toast('导出完成');
    }catch(e){ toast('导出失败：' + e.message); }
  }
  async function onImport(){
    const i = document.createElement('input'); i.type='file'; i.accept='.json,application/json';
    i.onchange = async ()=>{
      const text = await i.files[0].text();
      try{
        // 优先 /api/admin/import
        try{
          await jsonReq(`${API_BASE}/admin/import`, { method:'POST', headers:{'Content-Type':'application/json'}, body:text });
        }catch{
          // 回退拆分导入
          let ok = false;
          try{ await jsonReq(`${API_BASE}/graph/import`, { method:'POST', headers:{'Content-Type':'application/json'}, body:text }); ok = true; }catch{}
          try{ await jsonReq(`${API_BASE}/questions/import`, { method:'POST', headers:{'Content-Type':'application/json'}, body:text }); ok = true; }catch{}
          if(!ok) throw new Error('后端未实现导入接口');
        }
        toast('导入完成');
      }catch(e){ toast('导入失败：' + e.message); }
    };
    i.click();
  }
  async function onWipe(){
    if(!confirm('危险：清空全部数据（题库/知识点/会话/记录）？')) return;
    try{ await jsonReq(`${API_BASE}/admin/wipe`, { method:'POST' }); toast('已请求清空'); }
    catch(e){ toast('后端未实现 /api/admin/wipe'); }
  }
  async function onReindex(){
    try{ await jsonReq(`${API_BASE}/admin/reindex`, { method:'POST' }); toast('已请求重建索引'); }
    catch{ toast('后端未实现 /api/admin/reindex'); }
  }
  async function onStats(){
    // 优先服务端统计
    const s = await tryJson(`${API_BASE}/admin/stats`);
    if (s){ downloadFile('stats.json', JSON.stringify(s, null, 2)); toast('已下载 stats.json'); return; }
    // 客户端近似统计
    const [graph, qs, recs] = await Promise.all([
      tryJson(`${API_BASE}/graph/nodes`).then(x=>Array.isArray(x)?x:(x?.nodes||[])),
      tryJson(`${API_BASE}/questions?limit=1&skip=0&count=1`),
      tryJson(`${API_BASE}/records?limit=2000`),
    ]);
    const approx = {
      nodes: graph.length,
      questions: typeof qs==='object' && typeof qs.total==='number' ? qs.total : (qs?.items?.length||0),
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
        {/* 系统统计仪表板 */}
        <SystemStats />

        <div className="grid md:grid-cols-2 gap-4">
        {/* 数据备份 */}
        <div className="card space-y-3">
          <div className="font-semibold">数据备份</div>
          <Toolbar>
            <button className="btn btn-primary" onClick={onExport}>导出全部数据</button>
            <button className="btn" onClick={onStats}>统计汇总</button>
          </Toolbar>
          <HelpHint>
            下载一份包含题库、知识点、会话与作答记录的完整 JSON 存档；
            统计可走服务端或客户端近似。
          </HelpHint>
        </div>

        {/* 数据恢复 */}
        <div className="card space-y-3">
          <div className="font-semibold">数据恢复</div>
          <Toolbar>
            <button className="btn" onClick={onImport}>导入备份（JSON）</button>
            <button className="btn" onClick={onReindex}>重建索引</button>
          </Toolbar>
          <HelpHint>
            优先 <code>/api/admin/import</code>；
            否则回退到 <code>/graph/import</code> 与 <code>/questions/import</code>。
          </HelpHint>
        </div>

        {/* 用户与权限管理（新加） */}
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

        {/* 危险操作 */}
        <div className="card space-y-3 md:col-span-2">
          <div className="font-semibold text-red-600">危险操作</div>
          <button className="btn btn-danger" onClick={onWipe}>清空全部数据</button>
          <HelpHint>
            需要后端实现 <code>POST /api/admin/wipe</code>；未实现则提示，不会误删。
          </HelpHint>
        </div>
        </div>
      </div>
    </div>
  );
}
