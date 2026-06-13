/**
 * 解析计算机二级 MS/WPS 精选选择题 PDF 文本
 * 格式：题干…（C）。 + A./B./C./D. 选项
 */

function normalizePdfText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n")
    .replace(/考计算机二级[^\n]*/g, "")
    .replace(/考试适用[^\n]*/g, "")
    .replace(/关注公众号[^\n]*/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/。/g, ".")
    .replace(/．/g, ".")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * @param {string} text - pdf-parse 提取的全文
 * @returns {Array<{ number: string, content: string, answerLetter: string, options: string[] }>}
 */
export function parseOfficeExamPdfText(text) {
  const cleaned = normalizePdfText(text);
  const re =
    /(\d{1,3})\.\s*([\s\S]*?)\(\s*([A-D])\s*\)\.\s*((?:[A-D][\.、]\s*[\s\S]*?)(?=\d{1,3}\.|$))/g;

  const questions = [];
  let match;

  while ((match = re.exec(cleaned)) !== null) {
    const number = match[1];
    const content = match[2].replace(/\s+/g, " ").trim();
    const answerLetter = match[3];
    const optionBlock = match[4];
    const options = [];

    const optionRe =
      /([A-D])[\.、]\s*([^\n]+(?:\n(?![A-D][\.、])[^\n]+)*)/g;
    let optionMatch;

    while ((optionMatch = optionRe.exec(optionBlock)) !== null) {
      options.push(optionMatch[2].replace(/\s+/g, " ").trim());
    }

    if (!content || options.length < 2) continue;

    questions.push({ number, content, answerLetter, options });
  }

  return questions;
}

export function letterToAnswerIndex(letter) {
  const map = { A: 0, B: 1, C: 2, D: 3 };
  return map[String(letter || "").toUpperCase()] ?? 0;
}

export async function extractPdfText(buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}
