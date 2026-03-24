/**
 * GraphTutor V3.0 - 文件上传工具
 * 
 * 功能：统一处理文件上传，确保上传目录存在
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');

/**
 * 确保上传目录存在
 */
export async function ensureUploadDir(subDir = '') {
  const uploadDir = subDir 
    ? path.join(UPLOAD_BASE_DIR, subDir)
    : UPLOAD_BASE_DIR;
  
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    return uploadDir;
  } catch (error) {
    console.error('创建上传目录失败:', error);
    throw error;
  }
}

/**
 * 获取上传文件的URL
 */
export function getUploadUrl(filename, subDir = '') {
  const basePath = subDir ? `/uploads/${subDir}` : '/uploads';
  return `${basePath}/${filename}`;
}

/**
 * 删除上传的文件
 */
export async function deleteUploadFile(filename, subDir = '') {
  try {
    const uploadDir = await ensureUploadDir(subDir);
    const filePath = path.join(uploadDir, filename);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
}

