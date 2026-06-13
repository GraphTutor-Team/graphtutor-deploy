/**
 * 本地 Java 代码编译运行（开发/练习用，需 ENABLE_CODE_RUN=true）
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const MAX_CODE_LENGTH = 20000;
const RUN_TIMEOUT_MS = 8000;

const BLOCKED_PATTERNS = [
  /Runtime\s*\.\s*getRuntime/i,
  /ProcessBuilder/i,
  /System\s*\.\s*exit/i,
  /java\.io\.File/i,
  /java\.net\./i,
  /java\.nio\.file/i,
  /javax\.script/i,
];

function extractPublicClassName(code) {
  const match = String(code).match(/public\s+class\s+(\w+)/);
  return match?.[1] || 'Solution';
}

function sanitizeJavaCode(code) {
  const text = String(code || '').trim();
  if (!text) throw new Error('代码不能为空');
  if (text.length > MAX_CODE_LENGTH) throw new Error('代码过长');
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error('代码包含不允许的操作（文件/网络/进程）');
    }
  }
  return text;
}

async function runCommand(cmd, args, cwd, timeoutMs = RUN_TIMEOUT_MS) {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 1024 * 512,
      windowsHide: true,
    });
    return { stdout: stdout || '', stderr: stderr || '', exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      exitCode: typeof err.code === 'number' ? err.code : 1,
    };
  }
}

export function isCodeRunEnabled() {
  return String(process.env.ENABLE_CODE_RUN || '').toLowerCase() === 'true';
}

export async function runJavaCode({ code, stdin = '' }) {
  if (!isCodeRunEnabled()) {
    return {
      ok: false,
      disabled: true,
      message: '代码运行未启用，请在 server/.env 设置 ENABLE_CODE_RUN=true',
    };
  }

  const safeCode = sanitizeJavaCode(code);
  const className = extractPublicClassName(safeCode);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gt-java-'));

  try {
    const filePath = path.join(workDir, `${className}.java`);
    await fs.writeFile(filePath, safeCode, 'utf-8');

    const compile = await runCommand('javac', [filePath], workDir, RUN_TIMEOUT_MS);
    if (compile.exitCode !== 0) {
      return {
        ok: false,
        compiled: false,
        stdout: compile.stdout,
        stderr: compile.stderr,
        exitCode: compile.exitCode,
      };
    }

    const runArgs = ['-cp', workDir, className];
    const run = stdin
      ? await (async () => {
          const { spawn } = await import('child_process');
          return new Promise((resolve) => {
            const child = spawn('java', runArgs, {
              cwd: workDir,
              windowsHide: true,
            });
            let stdout = '';
            let stderr = '';
            const timer = setTimeout(() => {
              child.kill();
              resolve({ stdout, stderr: `${stderr}\n执行超时`, exitCode: 124 });
            }, RUN_TIMEOUT_MS);
            child.stdout.on('data', (d) => {
              stdout += d.toString();
            });
            child.stderr.on('data', (d) => {
              stderr += d.toString();
            });
            child.on('close', (code) => {
              clearTimeout(timer);
              resolve({ stdout, stderr, exitCode: code ?? 0 });
            });
            child.stdin.write(stdin);
            child.stdin.end();
          });
        })()
      : await runCommand('java', runArgs, workDir, RUN_TIMEOUT_MS);

    return {
      ok: run.exitCode === 0,
      compiled: true,
      stdout: run.stdout,
      stderr: run.stderr,
      exitCode: run.exitCode,
      className,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
