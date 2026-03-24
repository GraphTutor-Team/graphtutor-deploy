// node scripts/seed_questions.js
// Use: MONGODB_URI="mongodb://127.0.0.1:27017/graphtutor" node scripts/seed_questions.js
import { readFile } from 'fs/promises';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

const run = async () => {
  const file = path.resolve(__dirname, '../data/starter_question_bank.json');
  const raw = await readFile(file, 'utf-8');
  const items = JSON.parse(raw);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const col = db.collection('questions');
  await col.createIndex({ id: 1 }, { unique: true });
  let inserted = 0, updated = 0;
  for (const q of items) {
    const res = await col.updateOne({ id: q.id }, { $set: q }, { upsert: true });
    if (res.upsertedCount) inserted++; else if (res.modifiedCount) updated++;
  }
  console.log(`Seed done. inserted=${inserted} updated=${updated}`);
  await client.close();
};
run().catch(e => { console.error('Seed error:', e); process.exit(1); });
