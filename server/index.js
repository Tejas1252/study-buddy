const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});

const { getAIInfo } = require("./services/aiService");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// CORS: if ALLOWED_ORIGIN is set (comma-separated), restrict to those origins;
// otherwise allow all (convenient for local dev). Set it in production to the
// Netlify site URL.
// Compare origins ignoring trailing slashes (a common mismatch source).
const stripSlash = (s) => String(s || "").trim().replace(/\/+$/, "");
const allowedOrigins = String(process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(stripSlash)
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length
      ? {
          origin: (origin, cb) => {
            // Allow same-origin / non-browser requests (no Origin header).
            if (!origin || allowedOrigins.includes(stripSlash(origin))) {
              return cb(null, true);
            }
            return cb(new Error(`Origin ${origin} not allowed by CORS`));
          },
        }
      : undefined
  )
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "study-buddy-server",
    ...getAIInfo(),
  });
});

app.use("/api", aiRoutes);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://127.0.0.1:${PORT}/api/health`);
  const ai = getAIInfo();
  console.log(`AI provider: ${ai.provider}`);
  if (ai.provider === "ollama") {
    console.log(`Ollama: ${ai.ollamaModel} @ ${ai.ollamaBaseUrl}`);
  } else {
    console.log(
      `Gemini (try order): ${(ai.geminiModelFallbacks || []).join(" → ")}`
    );
  }
});
