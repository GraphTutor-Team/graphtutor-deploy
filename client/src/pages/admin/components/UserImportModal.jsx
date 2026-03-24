/**
 * GraphTutor V3.0 - 用户批量导入模态框组件
 * 
 * 作用：支持批量导入用户，支持CSV和Excel格式，提供数据预览、验证和导入结果展示
 * 关联页面：
 *   - pages/admin/UserManagement.jsx (用户管理页面，使用此组件)
 *   - utils/export.js (CSV/Excel解析工具)
 *   - api/users.js (批量导入API)
 * 技术栈：
 *   - React Hooks (useState)
 *   - 文件上传 (input type="file")
 *   - CSV/Excel解析
 *   - 数据验证
 *   - 模板下载功能
 */

import { useState } from 'react';
import { importFromCSV, importFromExcel } from '../../../utils/export';
import { batchImportUsers } from '../../../api/users';
import { toast } from '../../../utils/toast';
import Skeleton from '../../../components/Skeleton';

export default function UserImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setPreview(null);
    setImportResult(null);

    try {
      setLoading(true);
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();

      let data;
      if (fileExtension === 'csv') {
        data = await importFromCSV(selectedFile);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        data = await importFromExcel(selectedFile);
        // Excel返回的是二维数组，需要转换为对象数组
        if (Array.isArray(data) && data.length > 0) {
          const headers = data[0];
          data = data.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        }
      } else {
        throw new Error('不支持的文件格式，请使用CSV或Excel文件');
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('文件中没有找到用户数据');
      }

      // 验证数据格式
      const validUsers = [];
      const invalidUsers = [];

      data.forEach((user, index) => {
        const email = (user.email || user['邮箱'] || user['Email'] || '').trim();
        const password = (user.password || user['密码'] || user['Password'] || '').trim();
        const name = (user.name || user['姓名'] || user['Name'] || '').trim();
        const role = (user.role || user['角色'] || user['Role'] || 'student').trim().toLowerCase();

        if (!email || !password) {
          invalidUsers.push({
            index: index + 1,
            email: email || '未知',
            reason: '邮箱和密码为必填项',
          });
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          invalidUsers.push({
            index: index + 1,
            email,
            reason: '邮箱格式无效',
          });
          return;
        }

        if (password.length < 6 || password.length > 50) {
          invalidUsers.push({
            index: index + 1,
            email,
            reason: '密码长度必须在6-50位之间',
          });
          return;
        }

        if (role && !['student', 'question_manager', 'admin'].includes(role)) {
          invalidUsers.push({
            index: index + 1,
            email,
            reason: '角色无效（应为student/question_manager/admin）',
          });
          return;
        }

        validUsers.push({
          email,
          password,
          name: name || '',
          role: role || 'student',
        });
      });

      setPreview({
        total: data.length,
        valid: validUsers.length,
        invalid: invalidUsers.length,
        invalidUsers: invalidUsers.slice(0, 10), // 只显示前10个错误
        sample: validUsers.slice(0, 3),
      });
    } catch (err) {
      console.error('文件解析失败:', err);
      setError(err.message || '文件解析失败');
      toast.error(err.message || '文件解析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.valid === 0) {
      toast.error('没有有效的用户可以导入');
      return;
    }

    try {
      setImporting(true);
      setError('');

      // 重新解析文件获取所有有效用户
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let data;
      if (fileExtension === 'csv') {
        data = await importFromCSV(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        data = await importFromExcel(file);
        if (Array.isArray(data) && data.length > 0) {
          const headers = data[0];
          data = data.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        }
      }

      const validUsers = data
        .map(user => {
          const email = (user.email || user['邮箱'] || user['Email'] || '').trim();
          const password = (user.password || user['密码'] || user['Password'] || '').trim();
          const name = (user.name || user['姓名'] || user['Name'] || '').trim();
          const role = (user.role || user['角色'] || user['Role'] || 'student').trim().toLowerCase();

          if (!email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return null;
          }

          return {
            email,
            password,
            name: name || '',
            role: role || 'student',
          };
        })
        .filter(Boolean);

      const result = await batchImportUsers(validUsers);
      setImportResult(result);

      if (result.successCount > 0) {
        toast.success(`成功导入 ${result.successCount} 个用户${result.failedCount > 0 ? `，失败 ${result.failedCount} 个` : ''}`);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('导入失败，请检查数据格式');
      }
    } catch (err) {
      console.error('导入失败:', err);
      setError(err.message || '导入失败');
      toast.error(err.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      ['邮箱', '密码', '姓名', '角色'],
      ['user1@example.com', 'password123', '用户1', 'student'],
      ['user2@example.com', 'password123', '用户2', 'student'],
      ['admin@example.com', 'password123', '管理员', 'admin'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '用户导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">批量导入用户</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 文件选择 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择文件（CSV或Excel）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                disabled={loading || importing}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadTemplate}
              >
                下载模板
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              支持CSV和Excel格式，必填字段：邮箱、密码；可选字段：姓名、角色（student/question_manager/admin）
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 加载状态 */}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* 预览 */}
          {preview && !loading && (
            <div className="card">
              <h3 className="font-semibold mb-3">数据预览</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{preview.total}</div>
                    <div className="text-sm text-blue-600">总计</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{preview.valid}</div>
                    <div className="text-sm text-green-600">有效</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">{preview.invalid}</div>
                    <div className="text-sm text-red-600">无效</div>
                  </div>
                </div>

                {preview.sample.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-2">示例数据（前3条）</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-1 text-left">邮箱</th>
                            <th className="px-2 py-1 text-left">姓名</th>
                            <th className="px-2 py-1 text-left">角色</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.sample.map((user, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1">{user.email}</td>
                              <td className="px-2 py-1">{user.name || '—'}</td>
                              <td className="px-2 py-1">{user.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {preview.invalidUsers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">
                      错误数据（前10条）
                    </h4>
                    <div className="max-h-32 overflow-y-auto">
                      {preview.invalidUsers.map((item, i) => (
                        <div key={i} className="text-xs text-red-600 mb-1">
                          第{item.index}行 - {item.email}: {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 导入结果 */}
          {importResult && (
            <div className="card">
              <h3 className="font-semibold mb-3">导入结果</h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-slate-600">总计：</span>
                  <span className="font-medium">{importResult.total}</span>
                </div>
                <div className="text-sm">
                  <span className="text-green-600">成功：</span>
                  <span className="font-medium text-green-700">{importResult.successCount}</span>
                </div>
                <div className="text-sm">
                  <span className="text-red-600">失败：</span>
                  <span className="font-medium text-red-700">{importResult.failedCount}</span>
                </div>
                {importResult.failed.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-red-600 mb-2">失败详情</h4>
                    <div className="max-h-32 overflow-y-auto text-xs">
                      {importResult.failed.slice(0, 20).map((item, i) => (
                        <div key={i} className="text-red-600 mb-1">
                          {item.email}: {item.reason}
                        </div>
                      ))}
                      {importResult.failed.length > 20 && (
                        <div className="text-slate-500">
                          还有 {importResult.failed.length - 20} 个失败项...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={importing}
            >
              取消
            </button>
            {preview && preview.valid > 0 && !importResult && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? '导入中...' : `导入 ${preview.valid} 个用户`}
              </button>
            )}
            {importResult && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

