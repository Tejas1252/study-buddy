import axios from "axios";

// Base URL comes from the build-time env var so the same code works locally
// and in production (Netlify). Falls back to the local dev server.
// We normalize it so it works whether the env var is set with or without a
// trailing slash or the "/api" suffix (a common deploy foot-gun).
function resolveBaseUrl() {
  let base = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api").trim();
  base = base.replace(/\/+$/, ""); // drop trailing slash(es)
  if (!/\/api$/i.test(base)) base += "/api"; // ensure the /api prefix
  return base;
}

const API = axios.create({ baseURL: resolveBaseUrl() });

export const callAI = (data) => API.post("/ai", data);

// Upload a PDF/.txt file and get back the extracted text.
export const extractFile = (file) => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/extract", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
