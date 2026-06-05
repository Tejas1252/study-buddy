// Trigger a client-side download of `content` as a text file.
export function downloadText(filename, content, mime = "text/plain") {
  const blob = new Blob([String(content || "")], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "study-buddy.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
