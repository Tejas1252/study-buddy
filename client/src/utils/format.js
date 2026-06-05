// Single source of truth for turning any mode's output into plain text.
// Reused by Export PDF, Copy, and Download so the serialization lives in one place.
export function formatOutput({ mcq, flashcards, terms, cloze, practiceTest, result }) {
  if (mcq?.questions?.length) {
    return mcq.questions
      .map((q, i) =>
        [
          `${i + 1}. ${q.question}`,
          `A) ${q.options?.A || ""}`,
          `B) ${q.options?.B || ""}`,
          `C) ${q.options?.C || ""}`,
          `D) ${q.options?.D || ""}`,
          `Answer: ${q.answer || ""}`,
        ].join("\n")
      )
      .join("\n\n");
  }

  if (flashcards?.cards?.length) {
    return flashcards.cards
      .map((c, i) => `${i + 1}. ${c.front}\n   ${c.back}`)
      .join("\n\n");
  }

  if (terms?.terms?.length) {
    return terms.terms
      .map(
        (t) =>
          `- ${t.term}: ${t.definition}${t.example ? ` (e.g. ${t.example})` : ""}`
      )
      .join("\n");
  }

  if (cloze?.items?.length) {
    return cloze.items
      .map((it, i) => `${i + 1}. ${it.sentenceWithBlank}\n   Answer: ${it.answer || ""}`)
      .join("\n\n");
  }

  if (practiceTest?.mcq?.length) {
    return [
      "MCQ:",
      ...practiceTest.mcq.map((q, i) =>
        [
          `${i + 1}. ${q.question}`,
          `A) ${q.options?.A || ""}`,
          `B) ${q.options?.B || ""}`,
          `C) ${q.options?.C || ""}`,
          `D) ${q.options?.D || ""}`,
          `Answer: ${q.answer || ""}`,
        ].join("\n")
      ),
      "",
      "Short answers:",
      ...(practiceTest.short || []).map(
        (q, i) => `${i + 1}. ${q.question}\n   ${q.answer || ""}`
      ),
    ].join("\n\n");
  }

  return String(result || "");
}
