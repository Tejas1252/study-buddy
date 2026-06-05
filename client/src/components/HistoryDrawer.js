import { useMemo } from "react";

export default function HistoryDrawer({
  open,
  onClose,
  items,
  query,
  setQuery,
  onLoad,
  onDelete,
  onClear,
}) {
  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      return (
        String(it.mode || "").toLowerCase().includes(q) ||
        String(it.inputText || "").toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  return (
    <div className={`drawer ${open ? "drawer-open" : ""}`} aria-hidden={!open}>
      <div className="drawer-header">
        <p className="drawer-title">History</p>
        <div className="drawer-tools">
          <button className="btn btn-sm" type="button" onClick={onClear}>
            Clear
          </button>
          <button className="btn btn-sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="drawer-body">
        <input
          className="cloze-input"
          placeholder="Search… (mode or text)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="history-list">
          {filtered.length ? (
            filtered.map((it) => (
              <div key={it.id} className="history-item">
                <button
                  type="button"
                  className="history-main"
                  onClick={() => onLoad(it)}
                  title="Load this run"
                >
                  <div className="history-top">
                    <span className="history-mode">{it.mode}</span>
                    <span className="history-time">
                      {new Date(it.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="history-preview">
                    {String(it.inputText || "").slice(0, 120) || "(empty)"}
                  </div>
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onDelete(it.id)}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <p className="hint">No history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

