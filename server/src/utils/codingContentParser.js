/**
 * 解析 java_submissions.csv 与 leetcode-master.zip，转为编程题导入结构
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const JAVA_SUBMISSION_COLUMNS = [
  "index",
  "user",
  "version",
  "activity",
  "timestamp",
  "code",
  "result",
  "timisOrderedmp",
  "timismp",
];

export function humanizeSlug(slug) {
  return String(slug || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeCode(code) {
  return String(code || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSuccessfulSubmission(result) {
  return String(result || "").trim().toLowerCase().startsWith("success:");
}

export function scoreSubmissionResult(result) {
  const text = String(result || "").trim();
  if (!isSuccessfulSubmission(text)) return -1;
  const dots = (text.match(/\./g) || []).length;
  return dots;
}

/**
 * 简易 CSV 解析（支持引号内换行）
 */
export function parseCsvRecords(text) {
  const records = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        records.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

export function parseJavaSubmissionsCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf-8");
  const records = parseCsvRecords(text);
  if (records.length < 2) return [];

  const header = records[0].map((h) => h.trim());
  const colIndex = Object.fromEntries(header.map((name, idx) => [name, idx]));

  const grouped = new Map();

  for (let i = 1; i < records.length; i += 1) {
    const row = records[i];
    if (row.length < 6) continue;

    const activity = row[colIndex.activity ?? 3]?.trim();
    const code = row[colIndex.code ?? 5] ?? "";
    const result = row[colIndex.result ?? 6] ?? "";
    if (!activity || !code.trim()) continue;

    const score = scoreSubmissionResult(result);
    const existing = grouped.get(activity);
    const candidate = {
      activity,
      code: code.trim(),
      result: result.trim(),
      score,
      user: row[colIndex.user ?? 1]?.trim() || "",
    };

    if (!existing) {
      grouped.set(activity, candidate);
      continue;
    }

    const existingScore = existing.score;
    if (score > existingScore) {
      grouped.set(activity, candidate);
    } else if (score === existingScore && score >= 0) {
      if (candidate.code.length > existing.code.length) {
        grouped.set(activity, candidate);
      }
    } else if (existingScore < 0 && score < 0) {
      if (candidate.code.length > existing.code.length) {
        grouped.set(activity, candidate);
      }
    }
  }

  return [...grouped.values()].sort((a, b) =>
    a.activity.localeCompare(b.activity)
  );
}

function listZipEntries(zipPath) {
  try {
    const output = execFileSync("tar", ["-tf", zipPath], {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function readZipEntry(zipPath, entryPath) {
  try {
    return execFileSync("tar", ["-xOf", zipPath, entryPath], {
      encoding: "utf-8",
      maxBuffer: 5 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

export function parseLeetcodeMasterZip(zipPath) {
  const entries = listZipEntries(zipPath);
  const javaPrefix = "leetcode-master/algorithms/java/src/";

  const javaFiles = entries.filter(
    (entry) =>
      entry.startsWith(javaPrefix) &&
      entry.endsWith(".java") &&
      !entry.endsWith("Test.java") &&
      !entry.endsWith("TreeNode.java") &&
      entry !== `${javaPrefix}`
  );

  const problems = [];

  for (const entry of javaFiles) {
    const relative = entry.slice(javaPrefix.length);
    const parts = relative.split("/");
    if (parts.length < 2) continue;

    const folder = parts[0];
    const fileName = path.basename(parts[parts.length - 1], ".java");
    const slug = folder || fileName;
    const code = readZipEntry(zipPath, entry).trim();
    if (!code) continue;

    problems.push({
      slug,
      title: humanizeSlug(fileName !== folder ? fileName : folder),
      folder,
      fileName,
      code,
      entry,
    });
  }

  const deduped = new Map();
  for (const item of problems) {
    const key = `${item.folder}/${item.fileName}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return [...deduped.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function buildJavaLabQuestion(item, index, config) {
  const seq = String(index + 1).padStart(3, "0");
  const title = humanizeSlug(item.activity);
  const qid = `${config.prefix}-${seq}`;

  return {
    id: qid,
    qid,
    subjectCode: config.subjectCode,
    bankKey: config.bankKey,
    type: "coding",
    difficulty: item.score >= 0 ? 2 : 3,
    content: `请完成 Java 编程练习：${title}\n\n活动标识：${item.activity}`,
    options: [],
    answer: item.code,
    knowledgeNodeId: `${config.prefix.toLowerCase()}:${item.activity}`,
    tags: [...config.tags, item.activity, item.score >= 0 ? "已通过样例" : "参考提交"],
    source: "import",
    explain: item.score >= 0
      ? `参考通过样例（${item.result}）`
      : "参考学生提交（未全部通过测试，仅供练习对照）",
    codingMeta: {
      language: "java",
      referenceCode: item.code,
      starterCode: buildJavaStarter(item.code),
      slug: item.activity,
      externalSource: "java_submissions.csv",
      hint: `实现 ${title} 相关逻辑，可使用标准输入输出。`,
    },
  };
}

export function buildLeetcodeQuestion(item, index, config) {
  const seq = String(index + 1).padStart(3, "0");
  const qid = `${config.prefix}-${seq}`;

  return {
    id: qid,
    qid,
    subjectCode: config.subjectCode,
    bankKey: config.bankKey,
    type: "coding",
    difficulty: 3,
    content: `LeetCode 算法题：${item.title}\n\n请阅读题目要求，用 Java 实现对应算法（可参考下方代码编辑器练习）。`,
    options: [],
    answer: item.code,
    knowledgeNodeId: `${config.prefix.toLowerCase()}:${item.slug}`,
    tags: [...config.tags, item.slug, item.folder],
    source: "import",
    explain: "参考实现来自 leetcode-master 仓库，仅供学习对照。",
    codingMeta: {
      language: "java",
      referenceCode: item.code,
      starterCode: buildJavaStarter(item.code),
      slug: item.slug,
      externalSource: "leetcode-master",
      hint: `题目目录：${item.folder}`,
    },
  };
}

function buildJavaStarter(referenceCode) {
  const code = String(referenceCode || "");
  const classMatch = code.match(/class\s+(\w+)/);
  const className = classMatch?.[1] || "Solution";

  return `// 在此编写你的 Java 代码\npublic class ${className} {\n    // TODO\n}\n`;
}
