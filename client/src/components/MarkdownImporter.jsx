/**
 * GraphTutor V3.0 - Markdown导入组件
 * 
 * 功能：从Markdown文件导入笔记
 */

import { useState } from 'react';
import { 
  importMarkdownFile, 
  importMultipleMarkdownFiles,
  validateImportedNotes,
} from '../utils/markdownImporter';
import { createNote } from '../api/v3/notes';
import { batchCreateQuestions } from '../api/v3/questions';
import { toast } from '../utils/toast';
import { LoadingSpinner, Badge, ProgressBar } from './common';

export default function MarkdownImporter({ 
  onImportComplete,
  defaultBankId = null,
  defaultKnowledgeNodeId = null,
}) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importedNotes, setImportedNotes] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setImporting(true);
      setProgress(0);
      setImportedNotes([]);
      setValidationResult(null);
      setImportResult(null);

      // 导入文件
      const notes = await importMultipleMarkdownFiles(files);
      setImportedNotes(notes);

      // 验证笔记
      const validation = validateImportedNotes(notes);
      setValidationResult(validation);

      if (validation.valid.length === 0) {
        toast.warning('没有有效的笔记可以导入');
        setImporting(false);
        return;
      }

      setProgress(50);
    } catch (err) {
      console.error('导入失败:', err);
      toast.error('导入失败: ' + err.message);
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.valid.length === 0) {
      toast.warning('没有有效的笔记可以导入');
      return;
    }

    try {
      setImporting(true);
      setProgress(50);

      const results = {
        success: [],
        failed: [],
      };

      // 批量导入笔记
      for (let i = 0; i < validationResult.valid.length; i++) {
        const note = validationResult.valid[i];
        try {
          const noteData = {
            ...note,
            knowledgeNodeId: note.knowledgeNodeId || defaultKnowledgeNodeId,
          };

          await createNote(noteData);
          results.success.push(note);
          setProgress(50 + (i / validationResult.valid.length) * 50);
        } catch (err) {
          console.error(`导入笔记 "${note.title}" 失败:`, err);
          results.failed.push({
            note,
            error: err.message || '导入失败',
          });
        }
      }

      setProgress(100);
      setImportResult(results);

      if (results.success.length > 0) {
        toast.success(`成功导入 ${results.success.length} 篇笔记`);
      }
      if (results.failed.length > 0) {
        toast.warning(`${results.failed.length} 篇笔记导入失败`);
      }

      if (onImportComplete) {
        onImportComplete(results);
      }
    } catch (err) {
      console.error('批量导入失败:', err);
      toast.error('批量导入失败: ' + err.message);
    } finally {
      setImporting(false);
      setTimeout(() => {
        setProgress(0);
      }, 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
      <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100">
        📥 导入Markdown笔记
      </h3>

      <div className="space-y-4">
        {/* 文件选择 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            选择Markdown文件
          </label>
          <input
            type="file"
            accept=".md,.markdown,text/markdown"
            multiple
            onChange={handleFileSelect}
            disabled={importing}
            className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
          />
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            支持单个或多个Markdown文件，支持Front Matter格式
          </div>
        </div>

        {/* 进度条 */}
        {importing && progress > 0 && (
          <div>
            <ProgressBar value={progress} label={`导入进度: ${Math.round(progress)}%`} />
          </div>
        )}

        {/* 预览导入的笔记 */}
        {importedNotes.length > 0 && validationResult && (
          <div className="border dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                导入预览
              </h4>
              <div className="flex gap-2">
                <Badge variant="success">
                  有效: {validationResult.valid.length}
                </Badge>
                {validationResult.invalid.length > 0 && (
                  <Badge variant="danger">
                    无效: {validationResult.invalid.length}
                  </Badge>
                )}
              </div>
            </div>

            {/* 有效的笔记 */}
            {validationResult.valid.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  有效笔记 ({validationResult.valid.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {validationResult.valid.map((note, index) => (
                    <div
                      key={index}
                      className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={note.type === 'question' ? 'primary' : 'success'}>
                          {note.type === 'question' ? '题目' : '知识点'}
                        </Badge>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {note.title}
                        </span>
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {note.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无效的笔记 */}
            {validationResult.invalid.length > 0 && (
              <div>
                <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  无效笔记 ({validationResult.invalid.length})
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {validationResult.invalid.map((item, index) => (
                    <div
                      key={index}
                      className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
                    >
                      <div className="font-medium text-red-900 dark:text-red-300">
                        {item.note.title || `笔记 ${item.index + 1}`}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-400 mt-1">
                        {item.errors.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 导入按钮 */}
            {validationResult.valid.length > 0 && !importResult && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? (
                  <LoadingSpinner size="sm" text="导入中..." className="text-white" />
                ) : (
                  `导入 ${validationResult.valid.length} 篇笔记`
                )}
              </button>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  导入完成
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400">
                  成功: {importResult.success.length} 篇
                  {importResult.failed.length > 0 && (
                    <> | 失败: {importResult.failed.length} 篇</>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <h4 className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">
            📖 使用说明
          </h4>
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p>1. 支持标准Markdown格式文件</p>
            <p>2. 支持Front Matter格式（YAML）来设置笔记属性：</p>
            <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-x-auto">
{`---
type: knowledge
tags: 数学, 公式
isPublic: false
knowledgeNodeId: math-formula
---

# 笔记标题

笔记内容...`}
            </pre>
            <p className="mt-2">3. 如果没有Front Matter，将使用文件名作为标题</p>
            <p>4. 支持批量导入多个文件</p>
          </div>
        </div>
      </div>
    </div>
  );
}

