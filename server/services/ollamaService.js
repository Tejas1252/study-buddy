const axios = require("axios");

const DEFAULT_BASE = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";

function ollamaBaseUrl() {
  const raw =
    process.env.OLLAMA_BASE_URL ||
    process.env.OLLAMA_HOST ||
    DEFAULT_BASE;
  return String(raw).replace(/\/+$/, "");
}

function ollamaModel() {
  return (process.env.OLLAMA_MODEL || DEFAULT_MODEL).trim();
}

async function generateOllamaResponse(prompt) {
  const base = ollamaBaseUrl();
  const model = ollamaModel();
  const url = `${base}/api/chat`;

  try {
    const { data } = await axios.post(
      url,
      {
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      },
      { timeout: 120_000 }
    );

    const text = data?.message?.content;
    if (!text || typeof text !== "string") {
      const err = new Error(
        `Ollama returned an empty reply. Pull the model with: ollama pull ${model}`
      );
      err.status = 502;
      throw err;
    }
    return text;
  } catch (err) {
    if (err.status) throw err;
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      const e = new Error(
        `Cannot reach Ollama at ${base}. Run \`ollama serve\`, then \`ollama pull ${model}\`.`
      );
      e.status = 503;
      throw e;
    }
    if (err.response?.status === 404) {
      const e = new Error(
        `Ollama model "${model}" is missing. Run: ollama pull ${model}`
      );
      e.status = 404;
      throw e;
    }
    const e = new Error(err.response?.data?.error || err.message || "Ollama request failed");
    if (typeof err.response?.status === "number") e.status = err.response.status;
    throw e;
  }
}

module.exports = {
  generateOllamaResponse,
  ollamaBaseUrl,
  ollamaModel,
};
