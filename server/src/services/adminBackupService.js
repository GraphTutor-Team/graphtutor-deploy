/**
 * GraphTutor - Admin 全量内容备份（学科 / 知识点 / 题库+题目 / 作答记录）
 */

import Subject from '../models/Subject.js';
import KnowledgeNode from '../models/KnowledgeNode.js';
import QuestionBank from '../models/QuestionBank.js';
import Question from '../models/Question.js';
import Record from '../models/Record.js';
import User from '../models/User.js';

const BACKUP_TYPE = 'graphtutor-full-backup';
const BACKUP_VERSION = '3.1';
const MAX_RECORDS_EXPORT = 100000;

function mapQuestion(q) {
  return {
    qid: q.qid || q.id || undefined,
    content: q.content || '',
    options: Array.isArray(q.options) ? q.options : [],
    answer: q.answer !== undefined ? q.answer : q.answerIndex,
    answerIndex: q.answerIndex,
    type: q.type || 'single',
    difficulty: typeof q.difficulty === 'number' ? q.difficulty : 1,
    tags: Array.isArray(q.tags) ? q.tags : [],
    explain: q.explain || '',
    knowledgeNodeId: q.knowledgeNodeId || '',
    subjectCode: q.subjectCode || '',
    blankAnswers: q.blankAnswers,
    codingMeta: q.codingMeta,
  };
}

/**
 * 导出全量内容备份
 * @param {{ includeRecords?: boolean }} [options]
 */
export async function exportFullBackup(options = {}) {
  const includeRecords = options.includeRecords !== false;

  const [subjects, nodes, banks, questions] = await Promise.all([
    Subject.find().sort({ level: 1, order: 1 }).lean(),
    KnowledgeNode.find().sort({ order: 1 }).lean(),
    QuestionBank.find().sort({ createdAt: 1 }).lean(),
    Question.find().lean(),
  ]);

  const codeById = new Map(subjects.map((s) => [String(s._id), s.code]));
  const subjectPayload = subjects.map((s) => ({
    code: s.code,
    name: s.name,
    level: s.level || 1,
    parentCode: s.parentId ? codeById.get(String(s.parentId)) || null : null,
    order: s.order || 0,
    enabled: s.enabled !== false,
    description: s.description || '',
    color: s.color || '#3B82F6',
    icon: s.icon || '📚',
  }));

  const nodePayload = nodes.map((n) => ({
    key: n.key,
    name: n.name || '',
    order: n.order || 0,
  }));

  const questionsByBank = new Map();
  const orphanQuestions = [];
  const qidByQuestionId = new Map();
  for (const q of questions) {
    const mapped = mapQuestion(q);
    const idStr = String(q._id);
    if (q.qid) qidByQuestionId.set(idStr, String(q.qid));
    if (q.id) qidByQuestionId.set(idStr, qidByQuestionId.get(idStr) || String(q.id));
    if (q.bankId) {
      const key = String(q.bankId);
      if (!questionsByBank.has(key)) questionsByBank.set(key, []);
      questionsByBank.get(key).push(mapped);
    } else {
      orphanQuestions.push(mapped);
    }
  }

  const bankPayload = banks.map((b) => ({
    name: b.name,
    key: b.key || undefined,
    subjectCode: b.subjectCode || '',
    description: b.description || '',
    isPublic: b.isPublic !== false,
    isOfficial: !!b.isOfficial,
    settings: b.settings || undefined,
    questions: questionsByBank.get(String(b._id)) || [],
  }));

  if (orphanQuestions.length > 0) {
    bankPayload.push({
      name: '未分类题目',
      key: '_orphans',
      subjectCode: '',
      description: '导出时无所属题库的题目',
      isPublic: true,
      isOfficial: false,
      questions: orphanQuestions,
    });
  }

  let recordsPayload = [];
  let recordsTruncated = false;
  if (includeRecords) {
    const totalRecords = await Record.countDocuments();
    recordsTruncated = totalRecords > MAX_RECORDS_EXPORT;
    const records = await Record.find()
      .sort({ createdAt: 1 })
      .limit(MAX_RECORDS_EXPORT)
      .lean();

    const userIds = [...new Set(records.map((r) => String(r.userId)).filter(Boolean))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id email').lean()
      : [];
    const emailByUserId = new Map(users.map((u) => [String(u._id), u.email]));

    recordsPayload = records.map((r) => {
      const uid = String(r.userId);
      const email = emailByUserId.get(uid);
      const qid = qidByQuestionId.get(String(r.questionId)) || undefined;
      return {
        userEmail: email || undefined,
        // 找不到邮箱时保留原 userId，导入环境需用户已存在且 _id 一致
        userId: email ? undefined : uid,
        questionQid: qid,
        questionId: qid ? undefined : String(r.questionId),
        knowledgeNodeId: r.knowledgeNodeId || '',
        isCorrect: !!r.isCorrect,
        answerIndex: r.answerIndex ?? null,
        correctIndex: r.correctIndex ?? null,
        timeSpentMs: r.timeSpentMs,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      };
    });
  }

  return {
    version: BACKUP_VERSION,
    type: BACKUP_TYPE,
    exportDate: new Date().toISOString(),
    meta: {
      subjectCount: subjectPayload.length,
      nodeCount: nodePayload.length,
      bankCount: bankPayload.length,
      questionCount: questions.length,
      recordCount: recordsPayload.length,
      recordsTruncated,
      maxRecordsExport: MAX_RECORDS_EXPORT,
    },
    subjects: subjectPayload,
    knowledgeNodes: nodePayload,
    banks: bankPayload,
    records: recordsPayload,
  };
}

async function importSubjects(list = []) {
  const result = { created: 0, updated: 0, failed: 0 };
  if (!Array.isArray(list) || list.length === 0) return result;

  const sorted = [...list].sort((a, b) => (a.level || 1) - (b.level || 1));
  const idByCode = new Map();

  // 预载已有学科
  const existing = await Subject.find().select('_id code').lean();
  existing.forEach((s) => idByCode.set(s.code, s._id));

  for (const item of sorted) {
    try {
      if (!item?.code || !item?.name) {
        result.failed += 1;
        continue;
      }
      const parentId = item.parentCode ? idByCode.get(item.parentCode) || null : null;
      const payload = {
        code: String(item.code).trim().toUpperCase(),
        name: String(item.name).trim(),
        level: item.level || 1,
        parentId,
        order: item.order || 0,
        enabled: item.enabled !== false,
        description: item.description || '',
        color: item.color || '#3B82F6',
        icon: item.icon || '📚',
      };

      const found = await Subject.findOne({ code: payload.code });
      if (found) {
        Object.assign(found, payload);
        await found.save();
        idByCode.set(payload.code, found._id);
        result.updated += 1;
      } else {
        const created = await Subject.create(payload);
        idByCode.set(payload.code, created._id);
        result.created += 1;
      }
    } catch (err) {
      console.warn('[adminBackup] subject import failed:', err.message);
      result.failed += 1;
    }
  }
  return result;
}

async function importKnowledgeNodes(list = []) {
  const result = { upserted: 0, failed: 0 };
  if (!Array.isArray(list) || list.length === 0) return result;

  const ops = [];
  for (const item of list.slice(0, 5000)) {
    if (!item?.key) {
      result.failed += 1;
      continue;
    }
    ops.push({
      updateOne: {
        filter: { key: String(item.key).trim() },
        update: {
          $set: {
            key: String(item.key).trim(),
            name: item.name || '',
            order: typeof item.order === 'number' ? item.order : 0,
          },
        },
        upsert: true,
      },
    });
  }
  if (ops.length) {
    const r = await KnowledgeNode.bulkWrite(ops, { ordered: false });
    result.upserted = (r.upsertedCount || 0) + (r.modifiedCount || 0) + (r.matchedCount || 0);
  }
  return result;
}

async function upsertQuestion(bankId, q, stats) {
  try {
    if (!q?.content) {
      stats.failed += 1;
      return;
    }
    const qid = q.qid || q.id || undefined;
    const payload = {
      bankId,
      content: q.content,
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer !== undefined ? q.answer : q.answerIndex,
      answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : undefined,
      type: q.type || 'single',
      difficulty: typeof q.difficulty === 'number' ? q.difficulty : 1,
      tags: Array.isArray(q.tags) ? q.tags : [],
      explain: q.explain || '',
      knowledgeNodeId: q.knowledgeNodeId || '',
      subjectCode: q.subjectCode || '',
      blankAnswers: q.blankAnswers,
      codingMeta: q.codingMeta,
    };
    if (qid) payload.qid = String(qid);

    if (qid) {
      const existing = await Question.findOne({ qid: String(qid) });
      if (existing) {
        Object.assign(existing, payload);
        await existing.save();
        stats.updated += 1;
        return;
      }
    }

    await Question.create(payload);
    stats.created += 1;
  } catch (err) {
    console.warn('[adminBackup] question import failed:', err.message);
    stats.failed += 1;
  }
}

async function importBanks(list = []) {
  const banksResult = { created: 0, updated: 0, failed: 0 };
  const questionsResult = { created: 0, updated: 0, failed: 0 };
  if (!Array.isArray(list) || list.length === 0) {
    return { banks: banksResult, questions: questionsResult };
  }

  for (const bankData of list) {
    try {
      if (!bankData?.name) {
        banksResult.failed += 1;
        continue;
      }
      const key = bankData.key ? String(bankData.key).trim() : undefined;
      let bank = key ? await QuestionBank.findOne({ key }) : null;

      const bankPayload = {
        name: String(bankData.name).trim(),
        key,
        subjectCode: bankData.subjectCode || '',
        description: bankData.description || '',
        isPublic: bankData.isPublic !== false,
        isOfficial: !!bankData.isOfficial,
        settings: bankData.settings || undefined,
      };

      if (bank) {
        Object.assign(bank, bankPayload);
        await bank.save();
        banksResult.updated += 1;
      } else {
        bank = await QuestionBank.create(bankPayload);
        banksResult.created += 1;
      }

      const questions = Array.isArray(bankData.questions) ? bankData.questions : [];
      for (const q of questions) {
        await upsertQuestion(bank._id, q, questionsResult);
      }

      const count = await Question.countDocuments({ bankId: bank._id });
      await QuestionBank.findByIdAndUpdate(bank._id, { questionCount: count });
    } catch (err) {
      console.warn('[adminBackup] bank import failed:', err.message);
      banksResult.failed += 1;
    }
  }

  return { banks: banksResult, questions: questionsResult };
}

function recordDedupeKey(userId, questionId, createdAt) {
  const t = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt || '');
  return `${userId}|${questionId}|${t}`;
}

async function importRecords(list = []) {
  const result = { created: 0, skipped: 0, failed: 0 };
  if (!Array.isArray(list) || list.length === 0) return result;

  const emails = [...new Set(list.map((r) => r.userEmail).filter(Boolean).map(String))];
  const users = emails.length
    ? await User.find({ email: { $in: emails } }).select('_id email').lean()
    : [];
  const userIdByEmail = new Map(users.map((u) => [String(u.email).toLowerCase(), String(u._id)]));

  const qids = [...new Set(list.map((r) => r.questionQid).filter(Boolean).map(String))];
  const questions = qids.length
    ? await Question.find({ qid: { $in: qids } }).select('_id qid').lean()
    : [];
  const questionIdByQid = new Map(questions.map((q) => [String(q.qid), String(q._id)]));

  const mapped = [];
  for (const item of list) {
    try {
      let userId = null;
      if (item.userEmail) {
        userId = userIdByEmail.get(String(item.userEmail).toLowerCase()) || null;
      }
      if (!userId && item.userId) {
        userId = String(item.userId);
      }
      if (!userId) {
        result.failed += 1;
        continue;
      }

      let questionId = null;
      if (item.questionQid) {
        questionId = questionIdByQid.get(String(item.questionQid)) || null;
      }
      if (!questionId && item.questionId) {
        questionId = String(item.questionId);
      }
      if (!questionId) {
        result.failed += 1;
        continue;
      }

      const createdAt = item.createdAt ? new Date(item.createdAt) : undefined;
      const hasTime = createdAt && !Number.isNaN(createdAt.getTime());
      mapped.push({
        userId,
        questionId,
        knowledgeNodeId: item.knowledgeNodeId || undefined,
        isCorrect: !!item.isCorrect,
        answerIndex: typeof item.answerIndex === 'number' ? item.answerIndex : null,
        correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : null,
        timeSpentMs: typeof item.timeSpentMs === 'number' ? item.timeSpentMs : undefined,
        ...(hasTime ? { createdAt, updatedAt: createdAt } : {}),
      });
    } catch (err) {
      console.warn('[adminBackup] record map failed:', err.message);
      result.failed += 1;
    }
  }

  // 预载相关用户已有记录，按 userId+questionId+createdAt 去重
  const existingKeys = new Set();
  const userIdsForDedup = [...new Set(mapped.map((d) => d.userId))];
  for (const uid of userIdsForDedup) {
    const rows = await Record.find({ userId: uid }).select('questionId createdAt').lean();
    for (const r of rows) {
      if (r.createdAt) {
        existingKeys.add(recordDedupeKey(uid, String(r.questionId), new Date(r.createdAt)));
      }
    }
  }

  const docs = [];
  for (const doc of mapped) {
    if (doc.createdAt) {
      const key = recordDedupeKey(doc.userId, doc.questionId, doc.createdAt);
      if (existingKeys.has(key)) {
        result.skipped += 1;
        continue;
      }
      existingKeys.add(key);
    }
    docs.push(doc);
  }

  const BATCH = 500;
  for (let i = 0; i < docs.length; i += BATCH) {
    const chunk = docs.slice(i, i + BATCH);
    try {
      await Record.insertMany(chunk, { ordered: false });
      result.created += chunk.length;
    } catch (err) {
      const n = err?.insertedDocs?.length || err?.result?.nInserted || 0;
      result.created += n;
      result.failed += Math.max(0, chunk.length - n);
      console.warn('[adminBackup] record insertMany partial fail:', err.message);
    }
  }

  return result;
}

/**
 * 导入全量内容备份
 * @param {object} payload
 */
export async function importFullBackup(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('备份内容无效');
  }

  // 兼容：若上传的是纯 graph 导出 { nodes: [...] }
  if (Array.isArray(payload.nodes) && !payload.knowledgeNodes && !payload.banks && !payload.subjects) {
    const knowledgeNodes = payload.nodes;
    const nodes = await importKnowledgeNodes(knowledgeNodes);
    return {
      subjects: { created: 0, updated: 0, failed: 0 },
      knowledgeNodes: nodes,
      banks: { created: 0, updated: 0, failed: 0 },
      questions: { created: 0, updated: 0, failed: 0 },
      records: { created: 0, skipped: 0, failed: 0 },
      note: '已按知识点（graph nodes）格式导入',
    };
  }

  if (payload.type && payload.type !== BACKUP_TYPE && !payload.banks && !payload.subjects && !payload.records) {
    throw new Error(`不支持的备份类型：${payload.type}`);
  }

  const subjects = await importSubjects(payload.subjects || []);
  const knowledgeNodes = await importKnowledgeNodes(payload.knowledgeNodes || payload.nodes || []);
  const { banks, questions } = await importBanks(payload.banks || []);
  const records = await importRecords(payload.records || []);

  return {
    subjects,
    knowledgeNodes,
    banks,
    questions,
    records,
  };
}
