// Mirror the backend heuristic (~4 chars/token) so the live counter matches
// what the server enforces. Keep MAX_INPUT_TOKENS in sync with server/utils/tokens.js.
export const MAX_INPUT_TOKENS = 6000;

export function estimateTokens(text) {
  const s = String(text || "");
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}
