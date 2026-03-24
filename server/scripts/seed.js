import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../src/db.js';
import GraphNode from '../src/models/GraphNode.js';
import GraphLink from '../src/models/GraphLink.js';
import Question from '../src/models/Question.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function run(){
  await connectDB();
  const nodes = JSON.parse(fs.readFileSync(path.join(__dirname,'../seeds/nodes.json'),'utf-8'));
  const links = JSON.parse(fs.readFileSync(path.join(__dirname,'../seeds/links.json'),'utf-8'));
  const qs = JSON.parse(fs.readFileSync(path.join(__dirname,'../seeds/questions.json'),'utf-8'));
  if ((await GraphNode.countDocuments()) === 0) { await GraphNode.insertMany(nodes); console.log('Seeded nodes', nodes.length); }
  if ((await GraphLink.countDocuments()) === 0) { await GraphLink.insertMany(links); console.log('Seeded links', links.length); }
  if ((await Question.countDocuments()) === 0) { await Question.insertMany(qs); console.log('Seeded questions', qs.length); }
  console.log('✅ Seed done'); process.exit(0);
}
run().catch(e=>{ console.error(e); process.exit(1); });
