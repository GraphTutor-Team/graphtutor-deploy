// tools/changes.mjs
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SNAP = path.join(ROOT, 'snapshots');

function toMap(entries){ const m=new Map(); for(const e of entries) m.set(e.file, e.hash); return m; }

async function loadManifests(args) {
  if (args.length === 2) {
    const [a,b] = args.map(p=>path.resolve(p));
    return [JSON.parse(await fs.readFile(a,'utf8')), JSON.parse(await fs.readFile(b,'utf8'))];
  }
  const files = (await fs.readdir(SNAP)).filter(f=>f.endsWith('-manifest.json')).sort();
  if (files.length < 2) throw new Error('需要至少两个快照或传入两个manifest路径');
  const last = files[files.length-1], prev = files[files.length-2];
  return [
    JSON.parse(await fs.readFile(path.join(SNAP, prev),'utf8')),
    JSON.parse(await fs.readFile(path.join(SNAP, last),'utf8'))
  ];
}

function diff(prev, curr){
  const A = toMap(prev.entries), B = toMap(curr.entries);
  const added=[], removed=[], changed=[];
  for (const [f,h] of B) {
    if (!A.has(f)) added.push(f);
    else if (A.get(f)!==h) changed.push(f);
  }
  for (const f of A.keys()) if (!B.has(f)) removed.push(f);
  return { added, removed, changed };
}

async function writeChangelog(prev, curr, d){
  const header = `\n## ${curr.createdAt}\n- 新增(${d.added.length}): ${d.added.join(', ') || '-'}\n- 修改(${d.changed.length}): ${d.changed.join(', ') || '-'}\n- 删除(${d.removed.length}): ${d.removed.join(', ') || '-'}\n`;
  await fs.appendFile(path.join(ROOT, 'CHANGELOG.md'), header);
  return header;
}

(async ()=>{
  const args = process.argv.slice(2);
  const [prev, curr] = await loadManifests(args);
  const d = diff(prev, curr);
  const report = await writeChangelog(prev, curr, d);
  console.log('🔎 变更摘要:');
  console.log(report);
})().catch(e=>{ console.error(e); process.exit(1); });
