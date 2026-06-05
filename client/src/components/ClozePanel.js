import { useMemo, useState } from "react";

export default function ClozePanel({ data }) {
  const items = useMemo(() => data?.items || [], [data]);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  const score = useMemo(() => {
    if (!checked) return null;
    let ok = 0;
    items.forEach((it, i) => {
      const a = String(answers[i] || "").trim().toLowerCase();
      const b = String(it.answer || "").trim().toLowerCase();
      if (a && b && a === b) ok += 1;
    });
    return { ok, total: items.length };
  }, [answers, checked, items]);

  if (!items.length) return null;

  return (
    <div className="card result-card" aria-live="polite">
      <div className="result-header">
        <p className="result-title">Fill in the blanks</p>
        {score ? (
          <span className="label-inline">
            Score: {score.ok}/{score.total}
          </span>
        ) : null}
      </div>

      <div className="cloze">
        {items.map((it, i) => {
          const user = String(answers[i] || "");
          const correct = String(it.answer || "");
          const isCorrect =
            checked &&
            user.trim().toLowerCase() === correct.trim().toLowerCase() &&
            user.trim() !== "";
          const isWrong = checked && !isCorrect && user.trim() !== "";
          return (
            <div className="cloze-item" key={i}>
              <p className="cloze-sent">{it.sentenceWithBlank}</p>
              <input
                className={`cloze-input ${isCorrect ? "cloze-ok" : ""} ${
                  isWrong ? "cloze-wrong" : ""
                }`}
                value={user}
                disabled={checked}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [i]: e.target.value }))
                }
                placeholder="Your answer"
              />
              {checked ? (
                <p className="cloze-answer">Answer: {correct}</p>
              ) : null}
            </div>
          );
        })}

        <div className="mcq-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setChecked(true)}
            disabled={checked}
          >
            Check answers
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setChecked(false);
              setAnswers({});
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

