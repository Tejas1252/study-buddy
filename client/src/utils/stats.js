// Derive lightweight study stats from the existing history array — no new
// storage. History items look like { createdAt, mode, ... }.

const MODE_LABELS = {
  simplify: "Simplify",
  summary: "Summary",
  questions: "Quiz",
  translate: "Translate",
  flashcards: "Flashcards",
  key_terms: "Key terms",
  cloze: "Fill blanks",
  practice_test: "Practice test",
  rewrite: "Rewrite",
};

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeStats(history) {
  const items = Array.isArray(history) ? history : [];
  const totalRuns = items.length;

  // Distinct days, most-recent first.
  const days = Array.from(new Set(items.map((it) => dayKey(it.createdAt)))).sort();

  // Streak: consecutive days ending today (or yesterday if nothing today yet).
  const today = new Date();
  let streak = 0;
  const dayset = new Set(days);
  const cursor = new Date(today);
  // Allow the streak to still count if the user hasn't studied yet today.
  if (!dayset.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dayset.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Favourite mode.
  const byMode = {};
  items.forEach((it) => {
    const m = it.mode || "simplify";
    byMode[m] = (byMode[m] || 0) + 1;
  });
  let topMode = null;
  let topCount = 0;
  Object.entries(byMode).forEach(([m, c]) => {
    if (c > topCount) {
      topCount = c;
      topMode = m;
    }
  });

  return {
    totalRuns,
    streak,
    topMode: topMode ? MODE_LABELS[topMode] || topMode : null,
  };
}
