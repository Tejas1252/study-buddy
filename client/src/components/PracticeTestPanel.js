import { useEffect, useMemo, useState } from "react";

export default function PracticeTestPanel({ data }) {
  const mcq = useMemo(() => data?.mcq || [], [data]);
  const short = useMemo(() => data?.short || [], [data]);

  const [selected, setSelected] = useState({});
  const [shortAns, setShortAns] = useState({});
  const [shown, setShown] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    // reset when new data arrives
    setSelected({});
    setShortAns({});
    setShown(false);
    setSecondsLeft(15 * 60);
    setRunning(false);
  }, [data]);

  useEffect(() => {
    if (!running || shown) return;
    if (secondsLeft <= 0) {
      setRunning(false);
      setShown(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, secondsLeft, shown]);

  const allAnswered = useMemo(() => {
    if (!mcq.length) return false;
    return mcq.every((_, i) => selected[i]);
  }, [mcq, selected]);

  const score = useMemo(() => {
    if (!shown) return null;
    let ok = 0;
    mcq.forEach((q, i) => {
      if (selected[i] === q.answer) ok += 1;
    });
    return { ok, total: mcq.length };
  }, [mcq, selected, shown]);

  if (!mcq.length && !short.length) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="card result-card" aria-live="polite">
      <div className="result-header">
        <p className="result-title">Practice test</p>
        <div className="result-tools">
          <span className="label-inline">
            Time: {mm}:{ss}
          </span>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setRunning((r) => !r)}
            disabled={shown}
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => {
              setRunning(false);
              setShown(true);
            }}
            disabled={!allAnswered || shown}
            title={!allAnswered ? "Answer all MCQs first" : "Submit test"}
          >
            Submit
          </button>
        </div>
      </div>

      <div className="mcq">
        {score ? (
          <div className="test-score">
            Score: {score.ok}/{score.total}
          </div>
        ) : null}

        {mcq.map((q, idx) => {
          const correct = q.answer;
          return (
            <div className="mcq-q" key={idx}>
              <p className="mcq-title">
                {idx + 1}. {q.question}
              </p>
              <div className="mcq-options">
                {["A", "B", "C", "D"].map((k) => {
                  const isCorrect = shown && k === correct;
                  const isWrongSelected =
                    shown && selected[idx] === k && k !== correct;
                  return (
                    <label
                      key={k}
                      className={[
                        "mcq-opt",
                        isCorrect ? "mcq-opt-correct" : "",
                        isWrongSelected ? "mcq-opt-wrong" : "",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name={`pt_${idx}`}
                        value={k}
                        disabled={shown}
                        checked={selected[idx] === k}
                        onChange={() =>
                          setSelected((s) => ({ ...s, [idx]: k }))
                        }
                      />
                      <span className="mcq-letter">{k}.</span>
                      <span>{q.options?.[k]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {short.length ? (
          <div className="short">
            <h3 className="short-title">Short answers</h3>
            {short.map((q, idx) => (
              <div className="short-q" key={idx}>
                <p className="mcq-title">
                  {idx + 1}. {q.question}
                </p>
                <textarea
                  className="textarea"
                  rows={3}
                  value={shortAns[idx] || ""}
                  onChange={(e) =>
                    setShortAns((s) => ({ ...s, [idx]: e.target.value }))
                  }
                  disabled={shown}
                  placeholder="Write your answer…"
                />
                {shown ? (
                  <div className="short-answer">
                    <span className="label-inline">Suggested answer:</span>{" "}
                    {q.answer}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

