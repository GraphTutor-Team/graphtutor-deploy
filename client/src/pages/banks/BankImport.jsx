/**
 * GraphTutor V3.0 - 题库导入页面
 * 
 * 功能：批量导入题库（支持JSON、CSV、Excel格式）
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createBank } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';
import { importFromJSON, importFromCSV, importFromExcel } from '../../utils/export';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';

export default function BankImport() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [importConfig, setImportConfig] = useState({
    defaultSubjectCode: '',
    defaultIsPublic: true,
  });

  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const subjectsData = await getSubjectTree().catch(() => []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('加载选项数据失败:', err);
    }
  };

  const convertCSVToBanks = (csvData) => {
    if (!csvData || csvData.length === 0) return [];
    
    const headers = Object.keys(csvData[0] || {});
    
    return csvData.map((row) => {
      const bank = {
        name: row['题库名称'] || row['name'] || '',
        key: row['题库标识'] || row['key'] || undefined,
        subjectCode: row['学科代码'] || row['subjectCode'] || '',
        description: row['描述'] || row['description'] || '',
        isPublic: row['是否公开'] !== 'false' && row['isPublic'] !== 'false',
      };

      // 解析难度范围
      const difficultyRangeStr = row['难度范围'] || row['difficultyRange'] || '1,2,3,4,5';
      if (difficultyRangeStr) {
        bank.settings = {
          difficultyRange: difficultyRangeStr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 5),
        };
      }

      // 解析支持题型
      const questionTypesStr = row['支持题型'] || row['questionTypes'] || 'single';
      if (questionTypesStr) {
        bank.settings = bank.settings || {};
        bank.settings.questionTypes = questionTypesStr.split(',').map(t => t.trim()).filter(t => t);
      }

      // 解析启用AI
      const aiEnabledStr = row['启用AI'] || row['aiEnabled'] || 'false';
      if (bank.settings) {
        bank.settings.aiEnabled = aiEnabledStr === 'true';
      }

      return bank;
    });
  };

  const convertExcelToBanks = (excelData) => {
    // Excel数据格式与CSV类似，直接复用CSV转换逻辑
    return convertCSVToBanks(excelData);
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setPreview(null);

    try {
      setLoading(true);
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();

      let data;
      if (fileExtension === 'json') {
        data = await importFromJSON(selectedFile);
      } else if (fileExtension === 'csv') {
        const csvData = await importFromCSV(selectedFile);
        // 转换CSV到题库格式
        data = { banks: convertCSVToBanks(csvData) };
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const excelData = await importFromExcel(selectedFile);
        // 转换Excel到题库格式
        data = { banks: convertExcelToBanks(excelData) };
      } else {
        throw new Error('不支持的文件格式，请使用JSON、CSV或Excel文件');
      }

      // 验证数据格式
      const banks = Array.isArray(data.banks) ? data.banks : Array.isArray(data) ? data : [];
      
      if (banks.length === 0) {
        throw new Error('文件中没有找到题库数据');
      }

      // 验证题库格式
      const validBanks = [];
      const invalidBanks = [];

      banks.forEach((bank, index) => {
        if (validateBank(bank)) {
          validBanks.push({
            ...bank,
            subjectCode: bank.subjectCode || importConfig.defaultSubjectCode || '',
            isPublic: bank.isPublic !== undefined ? bank.isPublic : importConfig.defaultIsPublic,
          });
        } else {
          invalidBanks.push({ index: index + 1, bank });
        }
      });

      setPreview({
        total: banks.length,
        valid: validBanks.length,
        invalid: invalidBanks.length,
        invalidBanks,
        sample: validBanks.slice(0, 3),
      });
    } catch (err) {
      setError(err.message || '文件解析失败');
      toast.error(err.message || '文件解析失败');
    } finally {
      setLoading(false);
    }
  };

  const validateBank = (bank) => {
    if (!bank.name || !bank.name.trim()) return false;
    return true;
  };

  const handleImport = async () => {
    if (!preview || preview.valid === 0) {
      toast.warning('没有有效的题库可以导入');
      return;
    }

    try {
      setImporting(true);
      setError('');

      const fileExtension = file.name.split('.').pop().toLowerCase();
      let data;
      if (fileExtension === 'json') {
        data = await importFromJSON(file);
      } else if (fileExtension === 'csv') {
        const csvData = await importFromCSV(file);
        data = { banks: convertCSVToBanks(csvData) };
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const excelData = await importFromExcel(file);
        data = { banks: convertExcelToBanks(excelData) };
      }
      
      const banks = Array.isArray(data.banks) ? data.banks : Array.isArray(data) ? data : [];
      
      const validBanks = banks
        .filter(validateBank)
        .map((bank) => ({
          ...bank,
          subjectCode: bank.subjectCode || importConfig.defaultSubjectCode || '',
          isPublic: bank.isPublic !== undefined ? bank.isPublic : importConfig.defaultIsPublic,
        }));

      // 逐个创建题库
      let successCount = 0;
      let failCount = 0;

      for (const bank of validBanks) {
        try {
          await createBank(bank);
          successCount++;
        } catch (err) {
          console.error('导入题库失败:', bank.name, err);
          failCount++;
        }
      }

      toast.success(`成功导入 ${successCount} 个题库${failCount > 0 ? `，失败 ${failCount} 个` : ''}`);
      navigate('/banks');
    } catch (err) {
      const message = err.message || '导入失败';
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = (format) => {
    const url = `/api/v3/templates/banks/${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-template.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`正在下载${format.toUpperCase()}模板...`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">批量导入题库</h1>
            <p className="text-slate-600">支持JSON、CSV、Excel格式文件</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDownloadTemplate('json')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              title="JSON格式，适合程序化导入"
            >
              📥 JSON
            </button>
            <button
              onClick={() => handleDownloadTemplate('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
              title="CSV格式，适合Excel编辑"
            >
              📥 CSV
            </button>
            <button
              onClick={() => handleDownloadTemplate('xlsx')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm transition-colors"
              title="Excel格式，包含示例和使用说明"
            >
              📥 Excel
            </button>
            <button
              onClick={() => handleDownloadTemplate('docx')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
              title="Word格式，包含格式说明"
            >
              📥 Word
            </button>
          </div>
        </div>
        
        {/* 使用提示 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-semibold text-blue-900 mb-2">📋 使用说明：</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>题库名称是必填字段</li>
            <li>题库标识（key）可选，如不填写会自动生成</li>
            <li>学科代码可选，用于关联学科分类</li>
            <li>支持设置难度范围和支持的题型</li>
            <li>可以启用AI生成题目功能</li>
          </ul>
          <p className="text-xs text-blue-700 mt-2">
            💡 提示：请先下载模板文件，按照模板格式填写题库数据后再导入
          </p>
        </div>
      </div>

      {/* 文件选择 */}
      <div className="bg-white p-6 rounded-lg border mb-6">
        <h2 className="text-lg font-bold mb-4">选择文件</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              上传文件
            </label>
            <input
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={loading || importing}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="text-xs text-slate-500 mt-2">
              支持格式：JSON、CSV、Excel（UTF-8编码）
            </div>
          </div>

          {loading && <Loading text="解析文件中..." />}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>
          )}
        </div>
      </div>

      {/* 导入配置 */}
      {preview && (
        <div className="bg-white p-6 rounded-lg border mb-6">
          <h2 className="text-lg font-bold mb-4">导入配置</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                默认学科
              </label>
              <select
                value={importConfig.defaultSubjectCode}
                onChange={(e) =>
                  setImportConfig({ ...importConfig, defaultSubjectCode: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">不设置</option>
                {subjects.map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                默认公开性
              </label>
              <select
                value={importConfig.defaultIsPublic ? 'true' : 'false'}
                onChange={(e) =>
                  setImportConfig({ ...importConfig, defaultIsPublic: e.target.value === 'true' })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">公开</option>
                <option value="false">私有</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 预览 */}
      {preview && (
        <div className="bg-white p-6 rounded-lg border mb-6">
          <h2 className="text-lg font-bold mb-4">导入预览</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{preview.total}</div>
                <div className="text-sm text-slate-600">总题库数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{preview.valid}</div>
                <div className="text-sm text-slate-600">有效题库</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{preview.invalid}</div>
                <div className="text-sm text-slate-600">无效题库</div>
              </div>
            </div>

            {preview.sample && preview.sample.length > 0 && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">示例题库：</div>
                <div className="space-y-2">
                  {preview.sample.map((bank, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded text-sm">
                      {bank.name} {bank.key && `(${bank.key})`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.invalid > 0 && (
              <div>
                <div className="text-sm font-medium text-red-700 mb-2">无效题库：</div>
                <div className="text-xs text-red-600">
                  第 {preview.invalidBanks.map((ib) => ib.index).join(', ')} 个题库格式不正确
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleImport}
          disabled={!preview || preview.valid === 0 || importing}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? '导入中...' : `导入 ${preview?.valid || 0} 个题库`}
        </button>
        <button
          onClick={() => navigate('/banks')}
          className="px-6 py-2 border rounded-lg hover:bg-slate-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}
