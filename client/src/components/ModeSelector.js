const MODES = [
  { id: "simplify", label: "Simplify" },
  { id: "summary", label: "Summary" },
  { id: "questions", label: "Quiz" },
  { id: "translate", label: "Translate" },
  { id: "flashcards", label: "Flashcards" },
  { id: "key_terms", label: "Key terms" },
  { id: "cloze", label: "Fill blanks" },
  { id: "practice_test", label: "Practice test" },
  { id: "rewrite", label: "Rewrite" },
];

export default function ModeSelector({ value, onChange, disabled }) {
  return (
    <div className="mode-row" role="tablist" aria-label="Mode selector">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`mode-pill ${value === m.id ? "mode-pill-active" : ""}`}
          onClick={() => onChange(m.id)}
          disabled={disabled}
          role="tab"
          aria-selected={value === m.id}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

