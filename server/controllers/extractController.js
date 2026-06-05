// Requiring the inner module avoids pdf-parse's package index running its
// bundled debug/test code (which tries to read a sample PDF from disk).
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const { estimateTokens } = require("../utils/tokens");

/**
 * POST /api/extract — accept a single uploaded PDF or .txt file (held in
 * memory by multer) and return its extracted plain text. Files are never
 * written to disk or stored; they exist only for the duration of the request.
 */
const handleExtract = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let text = "";
    const mime = file.mimetype || "";
    const name = (file.originalname || "").toLowerCase();

    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      const data = await pdfParse(file.buffer);
      text = data.text || "";
    } else if (mime.startsWith("text/") || name.endsWith(".txt")) {
      text = file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type. Upload a PDF or .txt file." });
    }

    text = text.replace(/\r\n/g, "\n").trim();

    if (!text) {
      return res.status(422).json({
        error: "Could not extract any text. The file may be empty or a scanned image.",
      });
    }

    return res.json({ text, inputTokens: estimateTokens(text) });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to read file" });
  }
};

module.exports = { handleExtract };
