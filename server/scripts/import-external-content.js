/**
 * 从外部文件导入：计算机二级 MS/WPS PDF 选择题
 *
 * 用法（项目根目录）：
 *   npm run seed:import-external
 *
 * 指定 PDF 路径：
 *   node server/scripts/import-external-content.js --ms-pdf "path/to/ms.pdf" --wps-pdf "path/to/wps.pdf"
 *
 * 环境变量：
 *   IMPORT_MS_PDF / IMPORT_WPS_PDF
 *   MONGODB_URI
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
  parseOfficeExamPdfText,
  letterToAnswerIndex,
  extractPdfText,
} from "../src/utils/officeExamPdfParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/graphtutor";

const DEFAULT_MS_PDF =
  process.env.IMPORT_MS_PDF ||
  "c:/Users/16119/xwechat_files/wxid_8ujw1mg6b6b622_a5c5/msg/file/2026-06/26.3版本-二级MS精选300道选择题.pdf";
const DEFAULT_WPS_PDF =
  process.env.IMPORT_WPS_PDF ||
  "c:/Users/16119/xwechat_files/wxid_8ujw1mg6b6b622_a5c5/msg/file/2026-06/二级WPS office精选300题(1).pdf";

function parseArgs(argv) {
  const args = { msPdf: DEFAULT_MS_PDF, wpsPdf: DEFAULT_WPS_PDF };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--ms-pdf" && argv[i + 1]) {
      args.msPdf = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--wps-pdf" && argv[i + 1]) {
      args.wpsPdf = argv[i + 1];
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

function resolvePdfPath(inputPath, label) {
  const candidates = [
    inputPath,
    path.join(__dirname, "..", "data", "import", path.basename(inputPath)),
    path.join(__dirname, "..", "data", "import", `${label}.pdf`),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`找不到 ${label} PDF，请使用 --${label}-pdf 指定路径`);
}

function toQuestionDocs(parsed, config) {
  const { prefix, subjectCode, bankKey, tags } = config;

  return parsed.map((item, index) => {
    const seq = String(index + 1).padStart(3, "0");
    const answerIndex = letterToAnswerIndex(item.answerLetter);
    const type = item.options.length === 2 ? "judge" : "single";

    return {
      id: `${prefix}-${seq}`,
      qid: `${prefix}-${seq}`,
      subjectCode,
      bankKey,
      type,
      difficulty: 2,
      content: item.content,
      options: item.options,
      answer: answerIndex,
      answerIndex,
      knowledgeNodeId: `${prefix.toLowerCase()}:q${seq}`,
      tags: [...tags, `原题号${item.number}`],
      source: "bank",
    };
  });
}

async function seedSubjects(subjects) {
  const subjectMap = new Map();
  let created = 0;
  let updated = 0;

  for (const item of [...subjects].sort((a, b) => a.level - b.level)) {
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
      updated++;
    } else {
      const doc = await Subject.create({ ...data, parentId, enabled: true });
      subjectMap.set(data.code, doc._id);
      created++;
    }
    console.log(`  ✓ 学科 ${data.code} - ${data.name}`);
  }

  return { created, updated, subjectMap };
}

async function seedBanks(banks) {
  const bankMap = new Map();
  let created = 0;
  let updated = 0;

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
        questionTypes: ["single", "multiple", "judge"],
        aiEnabled: false,
      },
    };

    const existing = await QuestionBank.findOne({ key: bank.key });
    if (existing) {
      await QuestionBank.updateOne({ _id: existing._id }, { $set: payload });
      bankMap.set(bank.key, existing._id);
      updated++;
    } else {
      const doc = await QuestionBank.create({ ...payload, questionCount: 0 });
      bankMap.set(bank.key, doc._id);
      created++;
    }
    console.log(`  ✓ 题库 ${bank.key} - ${bank.name}`);
  }

  return { created, updated, bankMap };
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
      type: raw.type || "single",
      difficulty: raw.difficulty ?? 2,
      content: raw.content,
      options: raw.options,
      answer: raw.answer,
      answerIndex: raw.answerIndex,
      explain: raw.explain || "",
      tags: raw.tags || [],
      source: "bank",
    };

    const existing = await Question.findOne({ qid: doc.qid }).lean();
    if (existing) {
      await Question.updateOne({ _id: existing._id }, { $set: doc });
      updated++;
    } else {
      await Question.create(doc);
      inserted++;
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

async function importPdfBank(pdfPath, bankConfig) {
  console.log(`\n📄 解析 ${path.basename(pdfPath)} …`);
  const text = await extractPdfText(fs.readFileSync(pdfPath));
  const parsed = parseOfficeExamPdfText(text);
  console.log(`  解析到 ${parsed.length} 道题`);

  const docs = toQuestionDocs(parsed, bankConfig);
  return docs;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = loadJson("data/import-manifest.json");

  console.log("📚 导入计算机二级 MS/WPS 选择题\n");
  console.log(`MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);

  const msPdf = resolvePdfPath(args.msPdf, "ms");
  const wpsPdf = resolvePdfPath(args.wpsPdf, "wps");
  console.log(`MS PDF: ${msPdf}`);
  console.log(`WPS PDF: ${wpsPdf}`);

  await mongoose.connect(MONGODB_URI);

  console.log("\n1️⃣  学科…");
  await seedSubjects(manifest.subjects);

  console.log("\n2️⃣  题库…");
  const bankStats = await seedBanks(manifest.banks);

  console.log("\n3️⃣  题目…");
  const msQuestions = await importPdfBank(msPdf, {
    prefix: "NCRE-MS",
    subjectCode: "CERT-MS",
    bankKey: "ncre-ms-300",
    tags: ["计算机二级", "MS Office", "NCRe"],
  });
  const wpsQuestions = await importPdfBank(wpsPdf, {
    prefix: "NCRE-WPS",
    subjectCode: "CERT-WPS",
    bankKey: "ncre-wps-300",
    tags: ["计算机二级", "WPS Office", "NCRe"],
  });

  const allQuestions = [...msQuestions, ...wpsQuestions];
  await removeOrphanBankQuestions(allQuestions, bankStats.bankMap);
  const qStats = await upsertQuestions(allQuestions, bankStats.bankMap);

  console.log("\n4️⃣  统计…");
  await refreshBankCounts(bankStats.bankMap);

  console.log("\n✅ 导入完成");
  console.log(`   MS 题目：${msQuestions.length}`);
  console.log(`   WPS 题目：${wpsQuestions.length}`);
  console.log(`   新建 ${qStats.inserted}，更新 ${qStats.updated}`);
  console.log("\nℹ️  说明：");
  console.log("   - 主程序 / 小程序登录后可在「计算机等级考试」学科下练习");
  console.log("   - Java/LeetCode 编程题请运行：npm run seed:import-coding");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 导入失败:", err.message || err);
  process.exit(1);
});
