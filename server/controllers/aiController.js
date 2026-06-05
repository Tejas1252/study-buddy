const { generateAIResponse } = require("../services/aiService");
const {
  MAX_INPUT_TOKENS,
  CHUNK_THRESHOLD_TOKENS,
  CHUNK_SIZE_TOKENS,
  STRUCTURED_MAX_TOKENS,
  estimateTokens,
  truncateToTokens,
} = require("../utils/tokens");
const { splitIntoChunks } = require("../utils/chunk");

function extractJsonObject(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

function isStructuredType(type) {
  return (
    type === "questions" ||
    type === "flashcards" ||
    type === "key_terms" ||
    type === "cloze" ||
    type === "practice_test"
  );
}

// Modes whose output is plain text and can be safely chunked + joined.
function isTextType(type) {
  return (
    type === "simplify" ||
    type === "summary" ||
    type === "rewrite" ||
    type === "translate"
  );
}

const handleAI = async (req, res) => {
  try {
    const { text, type, level, fromLang, toLang } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const inputTokens = estimateTokens(text);
    if (inputTokens > MAX_INPUT_TOKENS) {
      return res.status(400).json({
        error: `Input is too long (~${inputTokens} tokens). The limit is ${MAX_INPUT_TOKENS} tokens. Please shorten it or split it up.`,
        meta: { inputTokens, maxTokens: MAX_INPUT_TOKENS },
      });
    }

    // --- Structured (JSON) modes: single pass, truncate if very long ---
    if (isStructuredType(type)) {
      let workText = text;
      let truncated = false;
      if (inputTokens > STRUCTURED_MAX_TOKENS) {
        workText = truncateToTokens(text, STRUCTURED_MAX_TOKENS);
        truncated = true;
      }

      const result = await generateAIResponse(workText, type, level, fromLang, toLang);
      const jsonStr = extractJsonObject(result);
      if (!jsonStr) {
        return res.status(502).json({ error: "Failed to parse JSON response" });
      }
      try {
        const parsed = JSON.parse(jsonStr);
        const shapeError = validateShape(type, parsed);
        if (shapeError) return res.status(502).json({ error: shapeError });
        return res.json({
          result: parsed,
          meta: { inputTokens, chunks: 1, truncated },
        });
      } catch {
        return res.status(502).json({ error: "Failed to parse JSON" });
      }
    }

    // --- Text modes: chunk long input, process each, then join ---
    if (isTextType(type) && inputTokens > CHUNK_THRESHOLD_TOKENS) {
      const chunks = splitIntoChunks(text, CHUNK_SIZE_TOKENS);
      const parts = [];
      for (const chunk of chunks) {
        // eslint-disable-next-line no-await-in-loop
        const out = await generateAIResponse(chunk, type, level, fromLang, toLang);
        parts.push(String(out).trim());
      }

      let result = parts.join("\n\n");

      // Summaries of many chunks → consolidate into one final summary.
      if (type === "summary" && parts.length > 1) {
        result = await generateAIResponse(result, "summary", level, fromLang, toLang);
      }

      return res.json({
        result,
        meta: { inputTokens, chunks: chunks.length, truncated: false },
      });
    }

    // --- Default: single pass ---
    const result = await generateAIResponse(text, type, level, fromLang, toLang);
    res.json({ result, meta: { inputTokens, chunks: 1, truncated: false } });
  } catch (err) {
    const upstream =
      typeof err.status === "number"
        ? err.status
        : typeof err.response?.status === "number"
          ? err.response.status
          : null;
    const status =
      upstream === 429
        ? 429
        : upstream === 503
          ? 503
          : upstream === 404
            ? 502
            : upstream && upstream >= 400 && upstream < 500
              ? 502
              : 500;
    res.status(status).json({ error: err.message });
  }
};

function validateShape(type, parsed) {
  if (type === "questions" && (!parsed?.questions || !Array.isArray(parsed.questions))) {
    return "Invalid questions response shape";
  }
  if (type === "flashcards" && (!parsed?.cards || !Array.isArray(parsed.cards))) {
    return "Invalid flashcards response shape";
  }
  if (type === "key_terms" && (!parsed?.terms || !Array.isArray(parsed.terms))) {
    return "Invalid key terms response shape";
  }
  if (type === "cloze" && (!parsed?.items || !Array.isArray(parsed.items))) {
    return "Invalid cloze response shape";
  }
  if (
    type === "practice_test" &&
    (!parsed?.mcq || !Array.isArray(parsed.mcq) || !parsed?.short || !Array.isArray(parsed.short))
  ) {
    return "Invalid practice test response shape";
  }
  return null;
}

module.exports = { handleAI };
