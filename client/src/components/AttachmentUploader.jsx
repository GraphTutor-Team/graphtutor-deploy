/**
 * GraphTutor V3.0 - 附件上传组件
 * 
 * 功能：支持附件上传和管理
 */

import { useState, useRef, useEffect } from 'react';
import api from '../api/api';
import { toast } from '../utils/toast';

export default function AttachmentUploader({ onUpload, maxAttachments = 5, value = [] }) {
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState(Array.isArray(value) ? value : []);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setAttachments(Array.isArray(value) ? value : []);
  }, [value]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (attachments.length + files.length > maxAttachments) {
      toast.error(`最多只能上传 ${maxAttachments} 个附件`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        // 检查文件大小（10MB）
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} 文件大小超过10MB`);
        }

        const formData = new FormData();
        formData.append('attachment', file);

        const res = await api.post('/v3/notes/upload/attachment', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return {
          ...res.data.data,
          originalName: file.name,
        };
      });

      const results = await Promise.all(uploadPromises);
      const newAttachments = [...attachments, ...results];
      
      setAttachments(newAttachments);
      
      if (onUpload) {
        onUpload(newAttachments);
      }

      toast.success(`成功上传 ${results.length} 个附件`);
    } catch (err) {
      console.error('上传附件失败:', err);
      toast.error(err.response?.data?.message || '上传附件失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    if (onUpload) {
      onUpload(newAttachments);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || attachments.length >= maxAttachments}
          className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '📎 上传附件'}
        </button>
        <span className="text-xs text-slate-500">
          {attachments.length} / {maxAttachments}
        </span>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-slate-50 rounded border"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {attachment.originalName || attachment.filename}
                </div>
                <div className="text-xs text-slate-500">
                  {formatFileSize(attachment.size || 0)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={attachment.url.startsWith('/') ? `${window.location.origin}${attachment.url}` : attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-xs text-blue-600 hover:underline"
                >
                  查看
                </a>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

