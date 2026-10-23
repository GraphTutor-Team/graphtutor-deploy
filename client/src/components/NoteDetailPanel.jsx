/**
 * 笔记详情侧栏：Markdown 预览、元信息、快捷操作
 */
import { useState } from 'react';
import api from '../api/api.js';
import { toast } from '../utils/toast';
import MarkdownPreview from './MarkdownPreview';
import Icon from './common/Icon';

const NOTE_TYPE_LABELS = {
  question: '题目笔记',
  knowledge: '知识点笔记',
  general: '通用笔记',
};

export default function NoteDetailPanel({
  note,
  onClose,
  onEdit,
  onDelete,
  onShare,
  onExport,
}) {
  const [current, setCurrent] = useState(note);
  const shown = current?._id === note?._id ? current : note;
  if (!note) return null;

  const typeLabel = NOTE_TYPE_LABELS[note.type] || note.type;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-5 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{typeLabel}</span>
            {note.isPublic && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">公开</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 break-words">{note.title}</h2>
          <p className="text-xs text-slate-500 mt-1">
            更新于 {new Date(note.updatedAt || note.lastEditedAt || note.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700"
          aria-label="关闭预览"
        >
          ×
        </button>
      </div>

      {note.summary && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-900 dark:text-amber-100 border border-amber-100 dark:border-amber-800">
          <span className="font-medium">摘要：</span>{note.summary}
        </div>
      )}

      {(note.questionId || note.knowledgeNodeId) && (
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 space-y-1">
          {note.questionId && <div>关联题目：{note.questionId}</div>}
          {note.knowledgeNodeId && <div>关联知识点：{note.knowledgeNodeId}</div>}
        </div>
      )}

      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {note.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
        {shown.locked ? (
          <div>
            <p>这篇笔记需要 {shown.pricePoints} 积分解锁后才能看正文。现在只能看标题和摘要。</p>
            {shown.summary && <p>{shown.summary}</p>}
            <button
              type="button"
              className="mt-2 text-sm text-blue-600 hover:underline"
              onClick={async () => {
                try {
                  await api.post(`/v3/notes/${shown._id}/purchase`);
                  const res = await api.get(`/v3/notes/${shown._id}`);
                  setCurrent(res.data?.data || shown);
                  toast.success('笔记已解锁');
                } catch (err) {
                  toast.error(err.response?.data?.message || '解锁失败');
                }
              }}
            >
              用积分解锁
            </button>
          </div>
        ) : (
          <MarkdownPreview text={shown.content} />
        )}
      </div>

      {shown.images?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {shown.images.map((url, idx) => (
            <img
              key={url || idx}
              src={typeof url === 'string' && url.startsWith('/') ? `${window.location.origin}${url}` : url}
              alt={`笔记图片 ${idx + 1}`}
              className="w-full rounded border object-cover max-h-40"
            />
          ))}
        </div>
      )}

      {shown.attachments?.length > 0 && (
        <ul className="mb-4 space-y-2 text-sm">
          {shown.attachments.map((file, idx) => (
            <li key={file.url || idx}>
              <a
                href={file.url?.startsWith('/') ? `${window.location.origin}${file.url}` : file.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                📎 {file.originalName || file.filename || '附件'}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-slate-700">
        {!shown.locked && (
          <button type="button" onClick={() => onEdit?.(shown)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
            编辑
          </button>
        )}
        <button type="button" onClick={() => onShare?.(shown._id)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
          分享
        </button>
        {!shown.locked && (
          <button type="button" onClick={() => onExport?.(shown, 'markdown')} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1">
            <Icon name="fileText" size={14} />
            导出
          </button>
        )}
        {!shown.locked && (
          <button type="button" onClick={() => onDelete?.(shown._id)} className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700">
            删除
          </button>
        )}
      </div>
    </div>
  );
}
