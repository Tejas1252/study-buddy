const express = require("express");
const multer = require("multer");
const router = express.Router();

const { handleAI } = require("../controllers/aiController");
const { handleExtract } = require("../controllers/extractController");
const { getAIInfo } = require("../services/aiService");

// Keep uploads in memory (max 10 MB); we extract text then discard the buffer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "study-buddy-server",
    ...getAIInfo(),
  });
});

router.post("/ai", handleAI);
router.post("/extract", upload.single("file"), handleExtract);

module.exports = router;
