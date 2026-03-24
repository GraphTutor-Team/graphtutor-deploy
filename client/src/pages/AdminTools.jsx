import BackBar from '../components/BackBar';
import { toast } from '../utils/toast';

export default function AdminTools(){
  async function exportAll(){
    const r = await fetch('/api/admin/export/all');
    if (!r.ok){ toast.error('导出失败'); return; }
    const blob = await r.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'graphtutor-export-all.json'; a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <BackBar title="管理工具（导出备份）" />
      <div className="card space-y-3">
        <div className="text-sm text-slate-500">一键导出题库、知识点、会话与作答记录。</div>
        <button className="btn btn-primary" onClick={exportAll}>导出全部数据（JSON）</button>
      </div>
    </div>
  );
}
