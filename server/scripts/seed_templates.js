// server/scripts/seed_templates.js
import 'dotenv/config';
import mongoose from 'mongoose';
import Template from '../src/models/Template.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/graphtutor';

const data = [
  {
    id: 'tpl-js-const-01',
    knowledgeNodeId: 'js-var',
    difficulty: 1,
    pattern: '在 {kw} 场景中，JS 声明常量的关键字是？',
    optionsTpl: ['let', 'const', 'var', 'static'],
    answerIndex: 1,
    paramsPool: { kw: ['以下', '下列', '通常的'] }
  },
  {
    id: 'tpl-html-tag-01',
    knowledgeNodeId: 'html-basics',
    difficulty: 1,
    pattern: '用于超链接的 HTML 标签是？',
    optionsTpl: ['<a>', '<link>', '<href>', '<url>'],
    answerIndex: 0
  },
  {
    id: 'tpl-css-select-01',
    knowledgeNodeId: 'css-selector',
    difficulty: 2,
    pattern: '选择 class 为 {cls} 的元素应使用的 CSS 选择器是？',
    optionsTpl: ['#{cls}', '.{cls}', '{cls}', '*.{cls}'],
    answerIndex: 1,
    paramsPool: { cls: ['title', 'main', 'desc'] }
  }
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Mongo connected');
  for (const t of data) {
    await Template.updateOne({ id: t.id }, { $set: t }, { upsert: true });
    console.log('seed template:', t.id);
  }
  await mongoose.disconnect();
  console.log('✅ Done');
}

main().catch(e => { console.error(e); process.exit(1); });
