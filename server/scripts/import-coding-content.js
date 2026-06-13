/**
 * 导入编程题：java_submissions.csv + leetcode-master.zip
 *
 * 用法：
 *   npm run seed:import-coding
 *   node server/scripts/import-coding-content.js --csv "path.csv" --leetcode-zip "path.zip"
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Subject from "../src/models/Subject.js";
import QuestionBank from "../src/models/QuestionBank.js";
import Question from "../src/models/Question.js";
import {
  parseJavaSubmissionsCsv,
  parseLeetcodeMasterZip,
  buildJavaLabQuestion,
  buildLeetcodeQuestion,
} from "../src/utils/codingContentParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/graphtutor";

const DEFAULT_CSV =
  process.env.IMPORT_JAVA_CSV ||
  "c:/Users/16119/xwechat_files/wxid_8ujw1mg6b6b622_a5c5/msg/file/2026-06/java_submissions.csv";
const DEFAULT_LEETCODE_ZIP =
  process.env.IMPORT_LEETCODE_ZIP ||
  "c:/Users/16119/xwechat_files/wxid_8ujw1mg6b6b622_a5c5/msg/file/2026-06/leetcode-master.zip";

function parseArgs(argv) {
  const args = { csv: DEFAULT_CSV, leetcodeZip: DEFAULT_LEETCODE_ZIP };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--csv" && argv[i + 1]) {
      args.csv = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--leetcode-zip" && argv[i + 1]) {
      args.leetcodeZip = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function loadJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", relativePath), "utf-8")
  );
}

function resolveInputPath(inputPath, label, fallbackName) {
  const candidates = [
    inputPath,
    path.join(__dirname, "..", "data", "import", path.basename(inputPath)),
    path.join(__dirname, "..", "data", "import", fallbackName),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`找不到 ${label} 文件，请使用 --${label} 指定路径`);
}

async function seedSubjects(subjects) {
  const subjectMap = new Map();

  for (const item of [...subjects].sort((a, b) => a.level - b.level)) {
    const { parentCode, ...data } = item;
    let parentId = null;

    if (parentCode) {
      parentId =
        (await Subject.findOne({ code: parentCode }))?._id || null;
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
    } else {
      const doc = await Subject.create({ ...data, parentId, enabled: true });
      subjectMap.set(data.code, doc._id);
    }
    console.log(`  ✓ 学科 ${data.code} - ${data.name}`);
  }

  return subjectMap;
}

async function seedBanks(banks) {
  const bankMap = new Map();

  for (const bank of banks) {
    const payload = {
      name: bank.name,
      key: bank.key,
      description: bank.description || "",
      subjectCode: bank.subjectCode,
      isPublic: bank.isPublic !== false,
      isOfficial: bank.isOfficial !== false,
      settings: {
        difficultyRange: [1, 2, 3, 4, 5],
        questionTypes: ["coding", "short"],
        aiEnabled: false,
      },
    };

    const existing = await QuestionBank.findOne({ key: bank.key });
    if (existing) {
      await QuestionBank.updateOne({ _id: existing._id }, { $set: payload });
      bankMap.set(bank.key, existing._id);
    } else {
      const doc = await QuestionBank.create({ ...payload, questionCount: 0 });
      bankMap.set(bank.key, doc._id);
    }
    console.log(`  ✓ 题库 ${bank.key} - ${bank.name}`);
  }

  return bankMap;
}

async function removeOrphanBankQuestions(rawQuestions, bankMap) {
  const qidsByBank = new Map();
  for (const raw of rawQuestions) {
    if (!qidsByBank.has(raw.bankKey)) qidsByBank.set(raw.bankKey, new Set());
    qidsByBank.get(raw.bankKey).add(raw.qid);
  }

  let removed = 0;
  for (const [bankKey, bankId] of bankMap.entries()) {
    const keepQids = [...(qidsByBank.get(bankKey) || [])];
    if (keepQids.length === 0) continue;
    const result = await Question.deleteMany({
      bankId,
      qid: { $nin: keepQids },
    });
    removed += result.deletedCount || 0;
  }

  if (removed > 0) {
    console.log(`  🧹 已清理 ${removed} 道旧版/重复题目`);
  }
}

async function upsertQuestions(rawQuestions, bankMap) {
  let inserted = 0;
  let updated = 0;

  for (const raw of rawQuestions) {
    const bankId = bankMap.get(raw.bankKey);
    if (!bankId) continue;

    const doc = {
      id: raw.id,
      qid: raw.qid,
      subjectCode: raw.subjectCode,
      bankId,
      knowledgeNodeId: raw.knowledgeNodeId,
      type: raw.type || "coding",
      difficulty: raw.difficulty ?? 2,
      content: raw.content,
      options: raw.options || [],
      answer: raw.answer,
      explain: raw.explain || "",
      tags: raw.tags || [],
      source: raw.source || "import",
      codingMeta: raw.codingMeta || {},
    };

    const existing = await Question.findOne({ qid: doc.qid }).lean();
    if (existing) {
      await Question.updateOne({ _id: existing._id }, { $set: doc });
      updated += 1;
    } else {
      await Question.create(doc);
      inserted += 1;
    }
  }

  return { inserted, updated };
}

async function refreshBankCounts(bankMap) {
  for (const [key, bankId] of bankMap.entries()) {
    const count = await Question.countDocuments({ bankId });
    await QuestionBank.updateOne(
      { _id: bankId },
      { $set: { questionCount: count } }
    );
    console.log(`  📊 ${key}：${count} 题`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = loadJson("data/import-manifest.json");
  const codingManifest = manifest.coding || {};

  console.log("💻 导入 Java 编程题\n");
  console.log(`MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);

  const csvPath = resolveInputPath(args.csv, "csv", "java_submissions.csv");
  const zipPath = resolveInputPath(
    args.leetcodeZip,
    "leetcode-zip",
    "leetcode-master.zip"
  );
  console.log(`CSV: ${csvPath}`);
  console.log(`ZIP: ${zipPath}`);

  await mongoose.connect(MONGODB_URI);

  console.log("\n1️⃣  学科…");
  await seedSubjects(codingManifest.subjects || []);

  console.log("\n2️⃣  题库…");
  const bankMap = await seedBanks(codingManifest.banks || []);

  console.log("\n3️⃣  解析 CSV…");
  const javaItems = parseJavaSubmissionsCsv(csvPath);
  console.log(`  解析到 ${javaItems.length} 个 Java 实验活动`);

  console.log("\n4️⃣  解析 LeetCode ZIP…");
  const leetcodeItems = parseLeetcodeMasterZip(zipPath);
  console.log(`  解析到 ${leetcodeItems.length} 道 LeetCode Java 题`);

  const javaQuestions = javaItems.map((item, index) =>
    buildJavaLabQuestion(item, index, {
      prefix: "JAVA-LAB",
      subjectCode: "CS-JAVA",
      bankKey: "java-lab-submissions",
      tags: ["Java", "编程练习", "实验"],
    })
  );

  const leetcodeQuestions = leetcodeItems.map((item, index) =>
    buildLeetcodeQuestion(item, index, {
      prefix: "LC-JAVA",
      subjectCode: "CS-ALGO",
      bankKey: "leetcode-java-master",
      tags: ["LeetCode", "算法", "Java"],
    })
  );

  const allQuestions = [...javaQuestions, ...leetcodeQuestions];

  console.log("\n5️⃣  写入题目…");
  await removeOrphanBankQuestions(allQuestions, bankMap);
  const qStats = await upsertQuestions(allQuestions, bankMap);

  console.log("\n6️⃣  统计…");
  await refreshBankCounts(bankMap);

  const successCount = javaItems.filter((x) => x.score >= 0).length;

  console.log("\n✅ 导入完成");
  console.log(`   Java 实验题：${javaQuestions.length}（含通过样例 ${successCount}）`);
  console.log(`   LeetCode 题：${leetcodeQuestions.length}`);
  console.log(`   新建 ${qStats.inserted}，更新 ${qStats.updated}`);
  console.log("\nℹ️  编程题可在 Web「测验会话」中练习，提交后对照参考代码判分。");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 导入失败:", err.message || err);
  process.exit(1);
});
