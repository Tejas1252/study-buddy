// Single source of truth for the study modes, grouped for the sidebar.
// `color` drives each mode's vibrant icon chip; `subtitle` shows in the header.
export const MODE_GROUPS = [
  {
    label: "Transform",
    items: [
      { id: "simplify", label: "Simplify", icon: "✨", color: "#38bdf8", subtitle: "Rewrite text in simpler language" },
      { id: "summary", label: "Summary", icon: "📝", color: "#a78bfa", subtitle: "Get the key points fast" },
      { id: "rewrite", label: "Rewrite", icon: "♻️", color: "#34d399", subtitle: "Paraphrase while keeping the meaning" },
      { id: "translate", label: "Translate", icon: "🌐", color: "#fb7185", subtitle: "Translate between languages" },
    ],
  },
  {
    label: "Practice",
    items: [
      { id: "questions", label: "Quiz", icon: "❓", color: "#f59e0b", subtitle: "Generate multiple-choice questions" },
      { id: "flashcards", label: "Flashcards", icon: "🃏", color: "#22d3ee", subtitle: "Create flip cards to revise" },
      { id: "cloze", label: "Fill blanks", icon: "🧩", color: "#c084fc", subtitle: "Practice with fill-in-the-blanks" },
      { id: "practice_test", label: "Practice test", icon: "🧪", color: "#f472b6", subtitle: "Take a timed mock test" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "key_terms", label: "Key terms", icon: "🔑", color: "#4ade80", subtitle: "Extract and define key terms" },
    ],
  },
];

// Flat lookup by id.
export const MODES = Object.fromEntries(
  MODE_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i]))
);
