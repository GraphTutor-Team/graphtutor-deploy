/**
 * GraphTutor V3.0 - 图标库安装脚本
 * 
 * 自动安装温馨可爱的图标库
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const clientDir = join(rootDir, 'client');

console.log('🎨 开始安装温馨可爱的图标库...\n');

try {
  // 安装 Tabler Icons (推荐 - 2000+ 图标，风格现代温馨)
  console.log('📦 正在安装 @tabler/icons-react...');
  execSync('npm install @tabler/icons-react', {
    cwd: clientDir,
    stdio: 'inherit'
  });
  console.log('✅ @tabler/icons-react 安装成功！\n');

  // 安装 Lucide Icons (备选 - 1000+ 图标，风格简洁可爱)
  console.log('📦 正在安装 lucide-react...');
  execSync('npm install lucide-react', {
    cwd: clientDir,
    stdio: 'inherit'
  });
  console.log('✅ lucide-react 安装成功！\n');

  console.log('🎉 图标库安装完成！');
  console.log('\n📝 使用方式：');
  console.log('   import { IconBook, IconNotes } from \'@tabler/icons-react\';');
  console.log('   或');
  console.log('   import { BookOpen, FileText } from \'lucide-react\';');
  console.log('\n💡 提示：已创建的 Icon 组件可以直接使用这些图标库！');

} catch (error) {
  console.error('❌ 安装失败:', error.message);
  process.exit(1);
}

