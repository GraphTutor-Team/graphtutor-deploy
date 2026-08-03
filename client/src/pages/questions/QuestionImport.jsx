/**
 * GraphTutor V3.0 - 题目导入页面
 * 
 * 功能：批量导入题目（支持JSON和CSV格式）
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { batchCreateQuestions } from '../../api/v3/questions';
import { getBanks } from '../../api/v3/questionBanks';
import { getSubjectTree } from '../../api/v3/subjects';
import { importFromJSON, importFromCSV } from '../../utils/export';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';

export default function QuestionImport() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [importConfig, setImportConfig] = useState({
    defaultSubjectCode: '',
    defaultBankId: '',
    defaultDifficulty: 3,
    autoGenerateQid: true,
    skipErrors: true,
  });

  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [banksData, subjectsData] = await Promise.all([
        getBanks({ limit: 100 }).catch(() => ({ data: [] })),
        getSubjectTree().catch(() => []),
      ]);
      setBanks(banksData.data || []);
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error('加载选项数据失败:', err);
    }
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
        data = await importFromCSV(selectedFile);
        // CSV需要转换为题目格式
        data = convertCSVToQuestions(data);
      } else {
        throw new Error('不支持的文件格式，请使用JSON或CSV文件');
      }

      // 验证数据格式
      const questions = Array.isArray(data.questions) ? data.questions : Array.isArray(data) ? data : [];
      
      if (questions.length === 0) {
        throw new Error('文件中没有找到题目数据');
      }

      // 验证题目格式
      const validQuestions = [];
      const invalidQuestions = [];

      questions.forEach((q, index) => {
        if (validateQuestion(q)) {
          validQuestions.push({
            ...q,
            subjectCode: q.subjectCode || importConfig.defaultSubjectCode || '',
            bankId: q.bankId || importConfig.defaultBankId || '',
            difficulty: q.difficulty || importConfig.defaultDifficulty,
            autoGenerateQid: importConfig.autoGenerateQid,
          });
        } else {
          invalidQuestions.push({ index: index + 1, question: q });
        }
      });

      setPreview({
        total: questions.length,
        valid: validQuestions.length,
        invalid: invalidQuestions.length,
        invalidQuestions,
        sample: validQuestions.slice(0, 3),
      });
    } catch (err) {
      setError(err.message || '文件解析失败');
      toast.error(err.message || '文件解析失败');
    } finally {
      setLoading(false);
    }
  };

  const validateQuestion = (q) => {
    if (!q.content || !q.content.trim()) return false;
    
    const type = q.type || 'single';
    
    // 选择题和判断题需要选项
    if (['single', 'multiple', 'judge'].includes(type)) {
      if (!Array.isArray(q.options) || q.options.length < 2) return false;
      
      // 单选题和判断题：answer 应该是数字
      if (type === 'single' || type === 'judge') {
        const answer = q.answer !== undefined ? q.answer : q.answerIndex;
        if (typeof answer !== 'number' || answer < 0 || answer >= q.options.length) {
          return false;
        }
      }
      
      // 多选题：answer 应该是数组
      if (type === 'multiple') {
        if (!Array.isArray(q.answer) || q.answer.length === 0) return false;
      }
    }
    
    // 填空题需要空位和答案
    if (type === 'fill') {
      if (!q.blanks || q.blanks < 1) return false;
      if (!Array.isArray(q.blankAnswers) || q.blankAnswers.length !== q.blanks) {
        return false;
      }
    }
    
    // 简答题需要参考答案
    if (type === 'short') {
      if (!q.answer || typeof q.answer !== 'string' || !q.answer.trim()) {
        return false;
      }
    }
    
    return true;
  };

  const convertCSVToQuestions = (csvData) => {
    if (!csvData || csvData.length === 0) return [];
    
    return csvData.map((row) => {
      // 获取题型，默认为单选题
      const type = (row['题型'] || row['type'] || 'single').toLowerCase().trim();
      
      const question = {
        type: type,
        content: row['题干'] || row['题目'] || row['内容'] || '',
        difficulty: parseInt(row['难度']) || importConfig.defaultDifficulty,
        subjectCode: row['学科代码'] || row['学科'] || importConfig.defaultSubjectCode || '',
        knowledgeNodeId: row['知识点ID'] || row['知识点'] || '',
        tags: row['标签'] ? row['标签'].split(';').filter((t) => t.trim()) : [],
        explain: row['解析'] || row['解释'] || '',
      };

      // 处理选择题和判断题
      if (['single', 'multiple', 'judge'].includes(type)) {
        const options = [];
        // 支持选项A-E或选项1-5
        for (let i = 0; i < 5; i++) {
          const optA = row[`选项${String.fromCharCode(65 + i)}`] || '';
          const optN = row[`选项${i + 1}`] || '';
          const opt = optA || optN;
          if (opt.trim()) {
            options.push(opt.trim());
          }
        }
        question.options = options;

        // 处理答案
        const answerStr = (row['正确答案'] || row['答案'] || '').toString().trim();
        
        if (type === 'multiple') {
          // 多选题：答案可能是 "0,2" 或 "A,C" 格式
          if (answerStr.includes(',')) {
            question.answer = answerStr.split(',').map(a => {
              const trimmed = a.trim();
              // 支持字母格式（A-E）
              if (/^[A-E]$/i.test(trimmed)) {
                return trimmed.toUpperCase().charCodeAt(0) - 65;
              }
              // 支持数字格式（0-4）
              const num = parseInt(trimmed);
              if (!isNaN(num) && num >= 0 && num < options.length) {
                return num;
              }
              return null;
            }).filter(a => a !== null);
          } else if (answerStr) {
            // 单个答案，转换为数组
            let answerIndex = 0;
            if (/^[A-E]$/i.test(answerStr)) {
              answerIndex = answerStr.toUpperCase().charCodeAt(0) - 65;
            } else {
              answerIndex = parseInt(answerStr) || 0;
            }
            question.answer = [Math.max(0, Math.min(answerIndex, options.length - 1))];
          } else {
            question.answer = [];
          }
        } else {
          // 单选题和判断题
          let answerIndex = 0;
          if (answerStr) {
            if (/^[A-E]$/i.test(answerStr)) {
              answerIndex = answerStr.toUpperCase().charCodeAt(0) - 65;
            } else {
              answerIndex = parseInt(answerStr) || 0;
            }
          }
          answerIndex = Math.max(0, Math.min(answerIndex, options.length - 1));
          question.answer = answerIndex;
          question.answerIndex = answerIndex; // 向后兼容
        }
      }

      // 处理填空题
      if (type === 'fill') {
        const blanksStr = row['空位数量'] || row['blanks'] || '1';
        question.blanks = parseInt(blanksStr) || 1;
        
        const blankAnswersStr = row['空位答案'] || row['blankAnswers'] || '';
        if (blankAnswersStr) {
          question.blankAnswers = blankAnswersStr.split(';').map(a => a.trim()).filter(a => a);
        } else {
          // 如果没有提供答案，创建空数组
          question.blankAnswers = new Array(question.blanks).fill('');
        }
        
        // 确保答案数量与空位数量一致
        if (question.blankAnswers.length !== question.blanks) {
          // 如果答案数量不足，用空字符串填充
          while (question.blankAnswers.length < question.blanks) {
            question.blankAnswers.push('');
          }
          // 如果答案数量过多，截断
          question.blankAnswers = question.blankAnswers.slice(0, question.blanks);
        }
        
        question.answer = question.blankAnswers;
      }

      // 处理简答题
      if (type === 'short') {
        question.answer = row['正确答案'] || row['答案'] || row['参考答案'] || '';
      }

      return question;
    });
  };

  const handleImport = async () => {
    // 验证学科是否已选择
    if (!importConfig.defaultSubjectCode || !importConfig.defaultSubjectCode.trim()) {
      setError('请先选择默认学科，所有导入的题目必须归属于某个学科');
      toast.error('请先选择默认学科');
      return;
    }
    if (!preview || preview.valid === 0) {
      toast.warning('没有有效的题目可以导入');
      return;
    }

    try {
      setImporting(true);
      setError('');

      // 获取所有有效题目
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let data;
      if (fileExtension === 'json') {
        data = await importFromJSON(file);
      } else {
        data = await importFromCSV(file);
        data = convertCSVToQuestions(data);
      }

      const questions = Array.isArray(data.questions) ? data.questions : Array.isArray(data) ? data : [];
      const validQuestions = questions
        .filter(validateQuestion)
        .map((q) => {
          const question = {
            ...q,
            type: q.type || 'single', // 默认单选题
            subjectCode: q.subjectCode || importConfig.defaultSubjectCode || '',
            bankId: q.bankId || importConfig.defaultBankId || '',
            difficulty: q.difficulty || importConfig.defaultDifficulty,
            autoGenerateQid: importConfig.autoGenerateQid,
          };
          
          // 确保 answer 字段存在（向后兼容）
          if (['single', 'judge'].includes(question.type)) {
            if (question.answer === undefined && question.answerIndex !== undefined) {
              question.answer = question.answerIndex;
            }
          }
          
          return question;
        });

      // 批量创建
      const result = await batchCreateQuestions({
        questions: validQuestions,
        bankId: importConfig.defaultBankId || undefined,
      });

      const successCount = result.successCount || result.created || validQuestions.length;
      toast.success(`成功导入 ${successCount} 道题目${result.errors > 0 ? `，${result.errors} 道题目导入失败` : ''}`);
      navigate('/questions');
    } catch (err) {
      const message = err.message || '导入失败';
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = (format) => {
    const url = `/api/v3/templates/questions/${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `question-template.${format}`;
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
            <h1 className="text-2xl font-bold mb-2">批量导入题目</h1>
            <p className="text-slate-600">支持JSON和CSV格式文件，支持多种题型</p>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              title="Word格式，包含格式说明"
            >
              📥 Word
            </button>
          </div>
        </div>
        
        {/* 题型说明 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-semibold text-blue-900 mb-2">📋 支持的题型：</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
            <div>
              <strong>单选题 (single)</strong>：从多个选项中选择一个正确答案
            </div>
            <div>
              <strong>多选题 (multiple)</strong>：从多个选项中选择多个正确答案
            </div>
            <div>
              <strong>填空题 (fill)</strong>：在空白处填入正确答案，需要指定空位数量和答案
            </div>
            <div>
              <strong>简答题 (short)</strong>：简要回答题目，需要提供参考答案
            </div>
            <div>
              <strong>判断题 (judge)</strong>：判断题目描述是否正确（通常选项为"正确"/"错误"）
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            💡 提示：请先下载模板文件，按照模板格式填写题目数据后再导入
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
              accept=".json,.csv"
              onChange={handleFileSelect}
              disabled={loading || importing}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="text-xs text-slate-500 mt-2">
              支持格式：JSON、CSV（UTF-8编码）
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
                默认学科 <span className="text-red-500">*</span>
              </label>
              <select
                value={importConfig.defaultSubjectCode}
                onChange={(e) =>
                  setImportConfig({ ...importConfig, defaultSubjectCode: e.target.value })
                }
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择学科（必选）</option>
                {subjects.map((subject) => {
                  const indent = '  '.repeat((subject.level || 1) - 1);
                  return (
                    <option key={subject.code} value={subject.code}>
                      {indent}{subject.icon || '📚'} {subject.name} ({subject.code})
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-slate-500 mt-1">
                💡 所有导入的题目将默认归属到此学科。如果题目数据中包含学科代码，将优先使用题目数据中的学科。
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                默认题库
              </label>
              <select
                value={importConfig.defaultBankId}
                onChange={(e) =>
                  setImportConfig({ ...importConfig, defaultBankId: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">不设置</option>
                {banks.map((bank) => (
                  <option key={bank._id} value={bank._id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                默认难度
              </label>
              <select
                value={importConfig.defaultDifficulty}
                onChange={(e) =>
                  setImportConfig({ ...importConfig, defaultDifficulty: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 - 非常基础</option>
                <option value="2">2 - 基础理解</option>
                <option value="3">3 - 一般/中等</option>
                <option value="4">4 - 偏难</option>
                <option value="5">5 - 很难/挑战题</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={importConfig.autoGenerateQid}
                  onChange={(e) =>
                    setImportConfig({ ...importConfig, autoGenerateQid: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">自动生成题目ID</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={importConfig.skipErrors}
                  onChange={(e) =>
                    setImportConfig({ ...importConfig, skipErrors: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">跳过错误题目</span>
              </label>
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
                <div className="text-sm text-slate-600">总题目数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{preview.valid}</div>
                <div className="text-sm text-slate-600">有效题目</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{preview.invalid}</div>
                <div className="text-sm text-slate-600">无效题目</div>
              </div>
            </div>

            {preview.sample && preview.sample.length > 0 && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">示例题目：</div>
                <div className="space-y-2">
                  {preview.sample.map((q, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded text-sm">
                      {q.content}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.invalid > 0 && (
              <div>
                <div className="text-sm font-medium text-red-700 mb-2">无效题目：</div>
                <div className="text-xs text-red-600">
                  第 {preview.invalidQuestions.map((iq) => iq.index).join(', ')} 题格式不正确
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
          {importing ? '导入中...' : `导入 ${preview?.valid || 0} 道题目`}
        </button>
        <button
          onClick={() => navigate('/questions')}
          className="px-6 py-2 border rounded-lg hover:bg-slate-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}

