// tools/snapshot.mjs
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'snapshots');
const IGNORE = new Set(['node_modules', 'dist', '.git', '.DS_Store', 'snapshots']);

async function walk(dir, acc = []) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    if (IGNORE.has(it.name)) continue;
    const p = path.join(dir, it.name);
    if (it.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
async function sha256(p) {
  const buf = await fs.readFile(p);
  return createHash('sha256').update(buf).digest('hex');
}
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = await walk(ROOT);
  const entries = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    entries.push({ file: rel, hash: await sha256(f) });
  }
  entries.sort((a,b)=>a.file.localeCompare(b.file));
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const manifest = { createdAt: new Date().toISOString(), entries };
  const out = path.join(OUT_DIR, `${stamp}-manifest.json`);
  await fs.writeFile(out, JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'latest.json'), JSON.stringify(manifest, null, 2));
  console.log(`✅ snapshot -> ${path.relative(ROOT, out)}`);
}
main().catch(e => { console.error(e); process.exit(1); });
