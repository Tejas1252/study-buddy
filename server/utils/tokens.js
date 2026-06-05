/**
 * Lightweight token estimation — no external dependencies.
 *
 * Real tokenizers (tiktoken / SentencePiece) are model-specific and heavy.
 * For input-budgeting and a "usage" readout, the common rule of thumb of
 * ~4 characters per token is accurate enough. The frontend mirrors this same
 * heuristic so the live counter matches what the server enforces.
 */

// Hard ceiling: requests above this are rejected outright (keeps cost/latency sane).
const MAX_INPUT_TOKENS = 6000;
const MAX_INPUT_CHARS = MAX_INPUT_TOKENS * 4;

// Above this single-pass threshold, text-style modes are chunked.
const CHUNK_THRESHOLD_TOKENS = 1200;

// Target size of each chunk when splitting long input.
const CHUNK_SIZE_TOKENS = 1000;

// Structured modes (quiz/flashcards/etc.) aren't chunked — merging JSON is
// messy — so very long input is truncated to this many tokens instead.
const STRUCTURED_MAX_TOKENS = 4000;

function estimateTokens(text) {
  const s = String(text || "");
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

// Trim text down to roughly maxTokens worth of characters.
function truncateToTokens(text, maxTokens) {
  const s = String(text || "");
  const maxChars = maxTokens * 4;
  return s.length <= maxChars ? s : s.slice(0, maxChars);
}

function countWords(text) {
  const s = String(text || "").trim();
  if (!s) return 0;
  return s.split(/\s+/).length;
}

module.exports = {
  MAX_INPUT_TOKENS,
  MAX_INPUT_CHARS,
  CHUNK_THRESHOLD_TOKENS,
  CHUNK_SIZE_TOKENS,
  STRUCTURED_MAX_TOKENS,
  estimateTokens,
  countWords,
  truncateToTokens,
};
