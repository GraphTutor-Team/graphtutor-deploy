import ContentPurchase from '../models/ContentPurchase.js';
import QuestionBank from '../models/QuestionBank.js';
import Note from '../models/Note.js';
import User from '../models/User.js';

export function priceOf(doc) {
  const value = Number(doc?.pricePoints);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

export async function hasContentAccess(userId, kind, doc) {
  if (priceOf(doc) === 0) return true;
  const uid = String(userId || '');
  if (!uid) return false;
  if (kind === 'bank') {
    const owner = String(doc.ownerId?._id || doc.ownerId || '');
    if (owner === uid) return true;
    const managers = Array.isArray(doc.managers) ? doc.managers : [];
    if (managers.some((item) => String(item?._id || item) === uid)) return true;
  }
  if (kind === 'note' && String(doc.userId) === uid) return true;
  const bought = await ContentPurchase.findOne({
    userId: uid,
    kind,
    targetId: String(doc._id),
  }).lean();
  return !!bought;
}

export async function purchaseContent(userId, kind, targetId) {
  const Model = kind === 'bank' ? QuestionBank : Note;
  const doc = await Model.findById(targetId);
  if (!doc) {
    const error = new Error(kind === 'bank' ? '题库不存在' : '笔记不存在');
    error.status = 404;
    throw error;
  }
  const price = priceOf(doc);
  if (price === 0) {
    const error = new Error('这份内容不需要积分');
    error.status = 400;
    throw error;
  }
  if (await hasContentAccess(userId, kind, doc)) {
    return { alreadyOwned: true, pricePoints: price };
  }
  const charged = await User.findOneAndUpdate(
    { _id: userId, points: { $gte: price } },
    { $inc: { points: -price } },
    { new: true },
  );
  if (!charged) {
    const error = new Error('积分不足');
    error.status = 400;
    throw error;
  }
  try {
    await ContentPurchase.create({
      userId: String(userId),
      kind,
      targetId: String(doc._id),
      points: price,
    });
  } catch (err) {
    await User.findByIdAndUpdate(userId, { $inc: { points: price } });
    if (err?.code === 11000) return { alreadyOwned: true, pricePoints: price };
    throw err;
  }
  return { alreadyOwned: false, pricePoints: price, pointsLeft: charged.points };
}

export async function assertQuestionBanksAccessible(userId, questions) {
  const bankIds = [...new Set(
    (questions || [])
      .map((question) => question?.bankId)
      .filter(Boolean)
      .map((bankId) => String(bankId)),
  )];
  for (const bankId of bankIds) {
    await assertBankQuestionAccess(userId, bankId);
  }
}

export async function assertBankQuestionAccess(userId, bankId) {
  if (!bankId) return;
  const bank = await QuestionBank.findById(bankId).select('pricePoints ownerId managers').lean();
  if (!bank || priceOf(bank) === 0) return;
  if (await hasContentAccess(userId, 'bank', bank)) return;
  const error = new Error('需要积分解锁这个题库');
  error.status = 403;
  error.pricePoints = priceOf(bank);
  throw error;
}

export function redactLockedNote(note) {
  return {
    ...note,
    content: '',
    images: [],
    attachments: [],
    locked: true,
    pricePoints: priceOf(note),
  };
}
