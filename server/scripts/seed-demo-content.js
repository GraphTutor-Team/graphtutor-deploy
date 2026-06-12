/**
 * GraphTutor 演示数据导入
 *
 * 导入学科、官方演示题库、练习题（含 Web 前端 starter 题库映射）
 * 主程序与小程序共用同一 MongoDB，执行一次即可。
 *
 * 用法（项目根目录）：
 *   npm run seed:demo
 *
 * Docker 服务器上：
 *   cd /root/graphtutor-deploy
 *   docker compose exec server node scripts/seed-demo-content.js
 *
 * 环境变量：MONGODB_URI（默认 mongodb://127.0.0.1:27017/graphtutor）
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Subject from "../src/models/Subject.js";
import QuestionBank from "../src/models/QuestionBank.js";
import Question from "../src/models/Question.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/graphtutor";

const WEB_BANK_KEY = "demo-cs-web";
const WEB_SUBJECT = "CS-WEB";

function loadJson(relativePath) {
  const full = path.join(__dirname, "..", relativePath);
  return JSON.parse(fs.readFileSync(full, "utf-8"));
}

function normalizeQuestion(raw, bankId) {
  const type = raw.type || "single";
  const answerIndex = raw.answerIndex;
  let answer = raw.answer;

  if (answer === undefined && answerIndex !== undefined) {
    answer = answerIndex;
  }

  return {
    id: raw.id,
    qid: raw.qid || raw.id,
    subjectCode: raw.subjectCode,
    bankId,
    knowledgeNodeId: raw.knowledgeNodeId || null,
    type,
    difficulty: raw.difficulty ?? 1,
    content: raw.content,
    options: raw.options || [],
    answer,
    answerIndex:
      typeof answerIndex === "number"
        ? answerIndex
        : typeof answer === "number"
          ? answer
          : undefined,
    explain: raw.explain || "",
    tags: raw.tags || ["演示", "demo"],
    source: "bank",
  };
}

function mapStarterToWebQuestions(starterItems) {
  return starterItems.map((item, index) => {
    const seq = String(index + 1).padStart(3, "0");
    const prefix = item.id?.split("-")[0] || "web";
    return {
      ...item,
      qid: `CS-WEB-${seq}`,
      subjectCode: WEB_SUBJECT,
      bankKey: WEB_BANK_KEY,
      type: "single",
      knowledgeNodeId: item.knowledgeNodeId || `web:${prefix}`,
      explain: item.explain || "",
    };
  });
}

async function seedSubjects(subjects) {
  const subjectMap = new Map();
  let created = 0;
  let skipped = 0;

  const sorted = [...subjects].sort((a, b) => a.level - b.level);

  for (const item of sorted) {
    const { parentCode, ...data } = item;
    let parentId = null;

    if (parentCode) {
      parentId =
        subjectMap.get(parentCode) ||
        (await Subject.findOne({ code: parentCode }))?._id ||
        null;
      if (!parentId) {
        console.warn(`  ⚠ 跳过 ${data.code}：找不到父学科 ${parentCode}`);
        continue;
      }
    }

    const existing = await Subject.findOne({ code: data.code });
    if (existing) {
      await Subject.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: data.name,
            level: data.level,
            parentId,
            description: data.description || "",
            color: data.color || "#3B82F6",
            icon: data.icon || "📚",
            order: data.order ?? 0,
            enabled: true,
          },
        }
      );
      subjectMap.set(data.code, existing._id);
      skipped++;
      console.log(`  ↻ 更新学科 ${data.code} - ${data.name}`);
    } else {
      const doc = await Subject.create({ ...data, parentId, enabled: true });
      subjectMap.set(data.code, doc._id);
      created++;
      console.log(`  ✓ 创建学科 ${data.code} - ${data.name}`);
    }
  }

  return { created, skipped, subjectMap };
}

async function seedBanks(banks) {
  const bankMap = new Map();
  let created = 0;
  let updated = 0;

  for (const bank of banks) {
    const existing = await QuestionBank.findOne({ key: bank.key });
    const payload = {
      name: bank.name,
      key: bank.key,
      description: bank.description || "",
      subjectCode: bank.subjectCode,
      isPublic: bank.isPublic !== false,
      isOfficial: bank.isOfficial !== false,
      settings: {
        difficultyRange: [1, 2, 3, 4, 5],
        questionTypes: ["single", "multiple", "judge"],
        aiEnabled: false,
      },
    };

    if (existing) {
      await QuestionBank.updateOne({ _id: existing._id }, { $set: payload });
      bankMap.set(bank.key, existing._id);
      updated++;
      console.log(`  ↻ 更新题库 ${bank.key} - ${bank.name}`);
    } else {
      const doc = await QuestionBank.create({ ...payload, questionCount: 0 });
      bankMap.set(bank.key, doc._id);
      created++;
      console.log(`  ✓ 创建题库 ${bank.key} - ${bank.name}`);
    }
  }

  return { created, updated, bankMap };
}

async function seedQuestions(questions, bankMap) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of questions) {
    const bankKey = raw.bankKey;
    const bankId = bankMap.get(bankKey);
    if (!bankId) {
      console.warn(`  ⚠ 跳过题目 ${raw.id}：题库 ${bankKey} 不存在`);
      skipped++;
      continue;
    }

    const doc = normalizeQuestion(raw, bankId);
    const filter = doc.qid ? { qid: doc.qid } : { id: doc.id };

    const existing = await Question.findOne(filter).lean();
    if (existing) {
      await Question.updateOne({ _id: existing._id }, { $set: doc });
      updated++;
    } else {
      await Question.create(doc);
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

async function refreshBankCounts(bankMap) {
  for (const [key, bankId] of bankMap.entries()) {
    const count = await Question.countDocuments({ bankId });
    await QuestionBank.updateOne({ _id: bankId }, { $set: { questionCount: count } });
    console.log(`  📊 题库 ${key} 题目数：${count}`);
  }
}

async function main() {
  console.log("📦 GraphTutor 演示数据导入\n");
  console.log(`连接 MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);

  await mongoose.connect(MONGODB_URI);

  const demo = loadJson("data/demo-content.json");
  const starter = loadJson("data/starter_question_bank.json");
  const webQuestions = mapStarterToWebQuestions(starter);

  const allQuestions = [...demo.questions, ...webQuestions];

  console.log("\n1️⃣  导入学科…");
  const subjectStats = await seedSubjects(demo.subjects);

  console.log("\n2️⃣  导入演示题库…");
  const bankStats = await seedBanks(demo.banks);

  console.log("\n3️⃣  导入练习题…");
  const qStats = await seedQuestions(allQuestions, bankStats.bankMap);

  console.log("\n4️⃣  更新题库统计…");
  await refreshBankCounts(bankStats.bankMap);

  console.log("\n✅ 完成");
  console.log(`   学科：新建 ${subjectStats.created}，更新 ${subjectStats.skipped}`);
  console.log(`   题库：新建 ${bankStats.created}，更新 ${bankStats.updated}`);
  console.log(
    `   题目：新建 ${qStats.inserted}，更新 ${qStats.updated}，跳过 ${qStats.skipped}`
  );
  console.log(`   合计题目：${allQuestions.length}（含 Web 前端 ${webQuestions.length} 题）`);
  console.log("\n💡 主程序与小程序登录后即可使用推荐练习、题库浏览等功能。");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 导入失败:", err);
  process.exit(1);
});
