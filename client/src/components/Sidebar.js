import { MODE_GROUPS } from "../modes";

export default function Sidebar({ value, onChange, disabled, stats }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo" aria-hidden="true">
          📚
        </span>
        <span className="sidebar-brand-text">Study Buddy</span>
      </div>

      <nav className="sidebar-nav" aria-label="Study modes" role="tablist">
        {MODE_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-group-label">{group.label}</p>
            {group.items.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={value === m.id}
                className={`nav-item ${value === m.id ? "nav-item-active" : ""}`}
                onClick={() => onChange(m.id)}
                disabled={disabled}
                title={m.subtitle}
              >
                <span className="nav-icon" style={{ "--chip": m.color }} aria-hidden="true">
                  {m.icon}
                </span>
                <span className="nav-label">{m.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {stats?.totalRuns > 0 ? (
        <div className="sidebar-footer">
          {stats.streak > 0 ? (
            <span className="streak-chip">🔥 {stats.streak}-day streak</span>
          ) : null}
          <span className="streak-chip streak-chip-muted">📚 {stats.totalRuns} runs</span>
        </div>
      ) : null}
    </aside>
  );
}
