import Subject from '../models/Subject.js';

/**
 * 学科代码是字符串，不能用 populate。按 code 查名称后再附上。
 * @param {object|object[]|null} docs
 * @returns {Promise<object|object[]|null>}
 */
export async function attachSubjectNames(docs) {
  const list = Array.isArray(docs) ? docs : docs ? [docs] : [];
  const codes = [...new Set(
    list
      .map((doc) => doc?.subjectCode)
      .filter((code) => typeof code === 'string' && code),
  )];
  if (codes.length === 0) return docs;

  const subjects = await Subject.find({ code: { $in: codes } })
    .select('code name icon')
    .lean();
  const byCode = new Map(subjects.map((subject) => [subject.code, subject]));
  const mapped = list.map((doc) => {
    if (!doc || typeof doc.subjectCode !== 'string') return doc;
    const subject = byCode.get(doc.subjectCode);
    if (!subject) return doc;
    return {
      ...doc,
      subjectCode: {
        code: subject.code,
        name: subject.name,
        icon: subject.icon,
      },
    };
  });
  return Array.isArray(docs) ? mapped : mapped[0];
}
