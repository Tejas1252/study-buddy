const { estimateTokens, CHUNK_SIZE_TOKENS } = require("./tokens");

/**
 * Split long text into chunks that each stay under ~maxTokens.
 *
 * Strategy: prefer paragraph boundaries; if a single paragraph is still too
 * big, fall back to sentence boundaries; if a single sentence is still too big,
 * hard-split by character budget. This keeps each chunk semantically coherent
 * so per-chunk AI output stays readable.
 */
function splitIntoChunks(text, maxTokens = CHUNK_SIZE_TOKENS) {
  const input = String(text || "").trim();
  if (!input) return [];
  if (estimateTokens(input) <= maxTokens) return [input];

  const maxChars = maxTokens * 4;
  const paragraphs = input.split(/\n{2,}/);
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    const piece = para.trim();
    if (!piece) continue;

    // Paragraph alone fits within budget.
    if (estimateTokens(piece) <= maxTokens) {
      if (estimateTokens(current + "\n\n" + piece) > maxTokens) pushCurrent();
      current = current ? `${current}\n\n${piece}` : piece;
      continue;
    }

    // Paragraph too big on its own — flush, then split by sentences.
    pushCurrent();
    const sentences = piece.match(/[^.!?]+[.!?]*\s*/g) || [piece];
    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;
      if (estimateTokens(s) > maxTokens) {
        // Single very long sentence — hard split by characters.
        for (let i = 0; i < s.length; i += maxChars) {
          chunks.push(s.slice(i, i + maxChars));
        }
        continue;
      }
      if (estimateTokens(current + " " + s) > maxTokens) pushCurrent();
      current = current ? `${current} ${s}` : s;
    }
  }

  pushCurrent();
  return chunks;
}

module.exports = { splitIntoChunks };
