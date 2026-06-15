/**
 * @deprecated 请使用 seed-user-demo.js（一键导入全部演示数据）
 * 本脚本保留兼容，仅导入好友 + 笔记模块。
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = {
  ...process.env,
  SEED_SECTIONS: 'social',
  SEED_SKIP_DEMO_CONTENT: process.env.SEED_SKIP_DEMO_CONTENT || '1',
};

const r = spawnSync(process.execPath, ['scripts/seed-user-demo.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env,
});

process.exit(r.status ?? 1);
