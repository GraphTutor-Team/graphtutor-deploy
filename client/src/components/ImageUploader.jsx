/**
 * GraphTutor V3.0 - 图片上传组件
 * 
 * 功能：支持图片上传和预览
 */

import { useState, useRef } from 'react';
import api from '../api/api';
import { toast } from '../utils/toast';

export default function ImageUploader({ onUpload, maxImages = 10 }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 检查数量限制
    if (previewUrls.length + files.length > maxImages) {
      toast.error(`最多只能上传 ${maxImages} 张图片`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} 不是图片文件`);
        }

        // 检查文件大小（5MB）
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} 文件大小超过5MB`);
        }

        const formData = new FormData();
        formData.append('image', file);

        const res = await api.post('/v3/notes/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return res.data.data;
      });

      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.url);
      
      setPreviewUrls([...previewUrls, ...newUrls]);
      
      if (onUpload) {
        onUpload([...previewUrls, ...newUrls]);
      }

      toast.success(`成功上传 ${results.length} 张图片`);
    } catch (err) {
      console.error('上传图片失败:', err);
      toast.error(err.response?.data?.message || '上传图片失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index) => {
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(newUrls);
    if (onUpload) {
      onUpload(newUrls);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || previewUrls.length >= maxImages}
          className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '📷 上传图片'}
        </button>
        <span className="text-xs text-slate-500">
          {previewUrls.length} / {maxImages}
        </span>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url.startsWith('/') ? `${window.location.origin}${url}` : url}
                alt={`预览 ${index + 1}`}
                className="w-full h-24 object-cover rounded border"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999"%3E图片%3C/text%3E%3C/svg%3E';
                }}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

