import BackBar from '../components/BackBar';
import { Link } from 'react-router-dom';
import { downloadFile, toast, jsonReq, API_BASE } from '../utils/download';

export default function AdminTools() {
  async function exportAll() {
    try {
      toast('正在导出…');
      const backup = await jsonReq(`${API_BASE}/admin/export/all`);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(`graphtutor_backup_${date}.json`, JSON.stringify(backup, null, 2));
      const meta = backup?.meta || {};
      toast(
        `导出完成：题目 ${meta.questionCount || 0} / 作答 ${meta.recordCount || 0}${meta.recordsTruncated ? '（已截断）' : ''}`
      );
    } catch (e) {
      toast('导出失败：' + (e.message || '未知错误'));
    }
  }

  return (
    <div>
      <BackBar title="管理工具（导出备份）" />
      <div className="card space-y-3">
        <div className="text-sm text-slate-500">
          一键导出学科、知识点、题库与题目、作答记录（不含用户密码）。也可在
          <Link className="text-blue-600 mx-1" to="/admin">管理后台</Link>
          使用「全量导出」。
        </div>
        <button type="button" className="btn btn-primary" onClick={exportAll}>
          导出全部内容（JSON）
        </button>
      </div>
    </div>
  );
}
