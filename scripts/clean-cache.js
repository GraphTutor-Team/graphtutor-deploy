/**
 * 清理 Vite / 构建缓存与产物，减轻磁盘占用、避免陈旧缓存导致加载变慢。
 * 用法: node scripts/clean-cache.js
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const dirs = [
  path.join(root, 'client', 'node_modules', '.vite'),
  path.join(root, 'server', 'node_modules', '.vite'),
  path.join(root, 'client', 'dist'),
];

function rmDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('已清理:', path.relative(root, dir));
      return true;
    }
  } catch (e) {
    console.warn('清理失败:', path.relative(root, dir), e.message);
  }
  return false;
}

let cleaned = 0;
dirs.forEach((d) => {
  if (rmDir(d)) cleaned++;
});
console.log(cleaned ? '\n共清理 ' + cleaned + ' 处，下次启动将重新生成缓存。' : '\n无需清理或目录不存在。');
