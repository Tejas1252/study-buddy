const { generateOllamaResponse } = require("./ollamaService");

/**
 * Free-tier friendly: try several Gemini models, with retries on busy / rate-limit.
 * Order: preferred first; later IDs often succeed when the first is overloaded (503).
 */
const GEMINI_MODEL_IDS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

const GEMINI_MODEL_ID = GEMINI_MODEL_IDS[0];

const MAX_ATTEMPTS_PER_MODEL = 3;
const BASE_BACKOFF_MS = 800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveProvider() {
  const p = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  return p === "ollama" ? "ollama" : "gemini";
}

function normalizeLang(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "en" || s === "english") return "English";
  if (s === "hi" || s === "hindi") return "Hindi";
  if (s === "mr" || s === "marathi") return "Marathi";
  return s;
}

// A shared difficulty instruction so the Level selector shapes every mode,
// not just "simplify".
function levelHint(level) {
  const l = String(level || "").trim().toLowerCase();
  if (l === "hard" || l === "advanced") {
    return "Difficulty: ADVANCED. Use precise terminology and richer detail. Prefer application/analysis-level questions and nuanced explanations.";
  }
  if (l === "medium" || l === "intermediate") {
    return "Difficulty: INTERMEDIATE. Use moderate vocabulary and a mix of recall and understanding-level questions.";
  }
  return "Difficulty: EASY. Use simple vocabulary and short sentences. Prefer basic recall-level questions and beginner-friendly explanations.";
}

function buildPrompt(text, type, level, fromLang, toLang) {
  const hint = levelHint(level);

  if (type === "simplify") {
    return `Simplify this text for ${level} level student:\n${text}`;
  }
  if (type === "summary") {
    return `${hint}\nGive a short bullet summary:\n${text}`;
  }
  if (type === "questions") {
    return [
      hint,
      `Create 5 multiple-choice questions from the text.`,
      `Return ONLY valid JSON (no markdown, no backticks, no extra text).`,
      `JSON schema:`,
      `{`,
      `  "questions": [`,
      `    {`,
      `      "question": "string",`,
      `      "options": { "A": "string", "B": "string", "C": "string", "D": "string" },`,
      `      "answer": "A|B|C|D"`,
      `    }`,
      `  ]`,
      `}`,
      `Rules:`,
      `- Exactly 5 questions`,
      `- answer must match one of the option keys`,
      ``,
      `TEXT:`,
      text,
    ].join("\n");
  }
  if (type === "translate") {
    const from = normalizeLang(fromLang) || "auto-detect";
    const to = normalizeLang(toLang) || "English";
    return [
      `You are a translation engine.`,
      `Task: Translate the text from ${from} to ${to}.`,
      `Rules:`,
      `- Output must be ONLY the translation in ${to}.`,
      `- Do NOT add any explanations, notes, headings, or extra text.`,
      `- Preserve meaning, tone, and formatting (paragraphs / bullet points).`,
      `- If you see markdown like **bold**, keep the markdown but translate the words.`,
      ``,
      `TEXT:`,
      text,
    ].join("\n");
  }
  if (type === "flashcards") {
    return [
      hint,
      `Create flashcards from the text.`,
      `Return ONLY valid JSON (no markdown, no backticks, no extra text).`,
      `JSON schema: { "cards": [{ "front": "string", "back": "string" }] }`,
      `Rules:`,
      `- 10 to 20 cards depending on content`,
      `- Keep fronts short questions/terms; backs short answers/explanations`,
      ``,
      `TEXT:`,
      text,
    ].join("\n");
  }
  if (type === "key_terms") {
    return [
      hint,
      `Extract key terms from the text and define them simply.`,
      `Return ONLY valid JSON (no markdown, no backticks, no extra text).`,
      `JSON schema: { "terms": [{ "term": "string", "definition": "string", "example": "string" }] }`,
      `Rules:`,
      `- 10 to 15 terms`,
      `- definition should be easy to understand`,
      `- example should be 1 short sentence`,
      ``,
      `TEXT:`,
      text,
    ].join("\n");
  }
  if (type === "cloze") {
    return [
      hint,
      `Create fill-in-the-blanks practice from the text.`,
      `Return ONLY valid JSON (no markdown, no backticks, no extra text).`,
      `JSON schema: { "items": [{ "sentenceWithBlank": "string", "answer": "string" }] }`,
      `Rules:`,
      `- 8 to 12 items`,
      `- Use ____ for the blank`,
      `- Answers should be 1-4 words`,
      ``,
      `TEXT:`,
      text,
    ].join("\n");
  }
  if (type === "practice_test") {
    return [
      hint,
      `Create a practice test from the text.`,
      `Return ONLY valid JSON (no markdown, no backticks, no extra text).`,
      `JSON schema:`,
      `{`,
      `  "mcq": [`,
      `    { "question": "string", "options": { "A": "string", "B": "string", "C": "string", "D": "string" }, "answer": "A|B|C|D" }`,
      `  ],`,
      `  "short": [`,
      `    { "question": "string", "answer": "string" }`,
      `  ]`,
      `}`,
      `Rules:`,
      `- 8 MCQs`,
      `- 3 short-answer questions`,
      `- short answers should be 1-3 sentences`,
      ``,
      `TEXT:`,
      text,
    ].join("\n");
  }
  if (type === "rewrite") {
    return [
      `Rewrite the text to be plagiarism-safe while keeping meaning.`,
      `Rules:`,
      `- Keep it clear and natural`,
      `- Do not add new facts`,
      `- Preserve paragraph structure`,
      ``,
      `TEXT:`,
      text,
    ].join("\n");
  }
  return text;
}

function looksMostlyEnglish(s) {
  const str = String(s || "");
  const letters = (str.match(/[A-Za-z]/g) || []).length;
  const nonSpace = (str.match(/\S/g) || []).length;
  if (nonSpace === 0) return false;
  return letters / nonSpace > 0.6;
}

function isTransientGeminiError(err) {
  const status = typeof err.status === "number" ? err.status : null;
  if (status === 429 || status === 503) return true;
  const msg = String(err.message || "");
  if (/429|503|Too Many Requests|high demand|unavailable/i.test(msg)) return true;
  return false;
}

function backoffMs(attemptIndex) {
  return Math.min(12_000, BASE_BACKOFF_MS * 2 ** attemptIndex);
}

async function generateGeminiResponse(prompt) {
  const genAI = require("../config/gemini");

  async function generateWithModel(modelId) {
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  let lastErr;

  for (const modelId of GEMINI_MODEL_IDS) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await generateWithModel(modelId);
      } catch (err) {
        lastErr = err;
        if (!isTransientGeminiError(err)) {
          throw err;
        }
        if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
          await sleep(backoffMs(attempt));
        }
      }
    }
  }

  throw lastErr;
}

async function generateAIResponse(text, type, level, fromLang, toLang) {
  const prompt = buildPrompt(text, type, level, fromLang, toLang);

  if (resolveProvider() === "ollama") {
    const out = await generateOllamaResponse(prompt);
    if (type === "translate") {
      const to = normalizeLang(toLang) || "English";
      if (to !== "English" && looksMostlyEnglish(out)) {
        const stronger = `${prompt}\n\nIMPORTANT: The output MUST be in ${to}. Do not use English.`;
        return generateOllamaResponse(stronger);
      }
    }
    return out;
  }

  const out = await generateGeminiResponse(prompt);
  if (type === "translate") {
    const to = normalizeLang(toLang) || "English";
    if (to !== "English" && looksMostlyEnglish(out)) {
      const stronger = `${prompt}\n\nIMPORTANT: The output MUST be in ${to}. Do not use English.`;
      return generateGeminiResponse(stronger);
    }
  }
  return out;
}

function getAIInfo() {
  const provider = resolveProvider();
  if (provider === "ollama") {
    const { ollamaBaseUrl, ollamaModel } = require("./ollamaService");
    return {
      provider,
      ollamaBaseUrl: ollamaBaseUrl(),
      ollamaModel: ollamaModel(),
    };
  }
  return {
    provider,
    geminiModel: GEMINI_MODEL_ID,
    geminiModelFallbacks: GEMINI_MODEL_IDS,
  };
}

module.exports = {
  generateAIResponse,
  getAIInfo,
  GEMINI_MODEL_ID,
  GEMINI_MODEL_IDS,
};
