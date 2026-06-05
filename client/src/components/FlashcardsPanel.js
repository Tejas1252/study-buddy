import { useMemo, useState } from "react";

export default function FlashcardsPanel({ data, onSpeak, speakingKey }) {
  const cards = useMemo(() => data?.cards || [], [data]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = useMemo(() => cards[idx], [cards, idx]);

  if (!cards.length) return null;

  const key = `fc_${idx}_${flipped ? "back" : "front"}`;
  const speakText = flipped ? current?.back : current?.front;

  return (
    <div className="card result-card" aria-live="polite">
      <div className="result-header">
        <p className="result-title">Flashcards</p>
        <div className="result-tools">
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => onSpeak(key, speakText)}
            title={speakingKey === key ? "Stop reading" : "Read card aloud"}
          >
            {speakingKey === key ? "■" : "🔊"}
          </button>
          <span className="label-inline">
            {idx + 1}/{cards.length}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`flashcard ${flipped ? "flashcard-flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        title="Click to flip"
      >
        <div className="flashcard-face">
          <p className="flashcard-text">
            {flipped ? current?.back : current?.front}
          </p>
          <p className="flashcard-hint">Click to flip</p>
        </div>
      </button>

      <div className="flashcard-actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            setFlipped(false);
            setIdx((i) => Math.max(0, i - 1));
          }}
          disabled={idx === 0}
        >
          Prev
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setFlipped((f) => !f)}
        >
          Flip
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setFlipped(false);
            setIdx((i) => Math.min(cards.length - 1, i + 1));
          }}
          disabled={idx === cards.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

