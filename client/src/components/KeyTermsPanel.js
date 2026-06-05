import { useState } from "react";

export default function KeyTermsPanel({ data }) {
  const terms = data?.terms || [];
  const [open, setOpen] = useState(null);
  if (!terms.length) return null;

  return (
    <div className="card result-card" aria-live="polite">
      <div className="result-header">
        <p className="result-title">Key terms</p>
      </div>
      <div className="terms">
        {terms.map((t, i) => (
          <button
            key={`${t.term}_${i}`}
            type="button"
            className={`term ${open === i ? "term-open" : ""}`}
            onClick={() => setOpen((v) => (v === i ? null : i))}
          >
            <div className="term-top">
              <span className="term-name">{t.term}</span>
              <span className="term-chevron">{open === i ? "▾" : "▸"}</span>
            </div>
            {open === i ? (
              <div className="term-body">
                <p className="term-def">{t.definition}</p>
                {t.example ? <p className="term-ex">Example: {t.example}</p> : null}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

