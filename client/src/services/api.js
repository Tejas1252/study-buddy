import axios from "axios";

// Base URL comes from the build-time env var so the same code works locally
// and in production (Netlify). Falls back to the local dev server.
const baseURL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const API = axios.create({ baseURL });

export const callAI = (data) => API.post("/ai", data);

// Upload a PDF/.txt file and get back the extracted text.
export const extractFile = (file) => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/extract", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
