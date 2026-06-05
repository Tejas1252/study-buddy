# Study Buddy 📚

An AI-powered study assistant. Paste notes or upload a PDF/TXT, then **simplify,
summarize, translate, generate quizzes, flashcards, key terms, fill-in-the-blanks,
practice tests, or rewrite** — with adjustable difficulty, read-aloud, dictation,
history, copy/download, and PDF export.

- **Frontend:** React (Create React App), plain themeable CSS (dark/light).
- **Backend:** Node.js + Express, proxying to **Google Gemini** (cloud, free tier)
  or **Ollama** (local).

---

## Features

| Feature | Notes |
|---|---|
| 9 study modes | Simplify, Summary, Quiz, Translate, Flashcards, Key terms, Fill blanks, Practice test, Rewrite |
| Difficulty control | Easy / Medium / Hard — now shapes **every** mode, not just Simplify |
| Token handling | Live token meter, hard input limit, and automatic **chunking** of long text for text modes |
| File upload | Upload a **PDF or .txt**; text is extracted server-side (in memory, never stored) |
| Read aloud / dictation | Browser speech synthesis + speech-to-text |
| Output tools | Copy, Download (.txt), Export PDF, translate-the-result |
| History & stats | Local history (last 50 runs) + study streak / run count |
| Themes | Dark / light toggle, persisted locally |

---

## Local development

### 1. Backend (`server/`)
```bash
cd server
cp .env.example .env        # then fill in values
npm install
npm start                   # http://localhost:5000  (health: /api/health)
```

`.env` keys (see [server/.env.example](server/.env.example)):
- `AI_PROVIDER` — `gemini` (default) or `ollama`
- `GEMINI_API_KEY` — free key from https://aistudio.google.com/app/apikey
- `OLLAMA_MODEL` / `OLLAMA_BASE_URL` — only for local Ollama
- `PORT` — defaults to 5000
- `ALLOWED_ORIGIN` — comma-separated CORS allowlist (blank = allow all, fine for dev)

### 2. Frontend (`client/`)
```bash
cd client
npm install
npm start                   # http://localhost:3000
```
Optionally set `REACT_APP_API_BASE_URL` (see [client/.env.example](client/.env.example)).
Defaults to `http://localhost:5000/api`.

---

## Deploy for free (Netlify + Render)

### Backend → Render
1. Push this repo to GitHub.
2. Render → **New → Web Service**, root directory `server`.
   - Build: `npm install` · Start: `npm start`
3. Environment variables:
   - `AI_PROVIDER=gemini`
   - `GEMINI_API_KEY=<your rotated key>`
   - `ALLOWED_ORIGIN=https://<your-site>.netlify.app`
4. Note the service URL, e.g. `https://study-buddy-api.onrender.com`.

### Frontend → Netlify
1. Netlify → **Add new site → Import from GitHub**.
2. Base directory `client` (config is in [client/netlify.toml](client/netlify.toml)).
3. Environment variable:
   - `REACT_APP_API_BASE_URL=https://study-buddy-api.onrender.com/api`
4. Deploy. Update Render's `ALLOWED_ORIGIN` with the final Netlify URL.

> **Note:** Ollama (local models) can't run on free hosting (needs lots of RAM/GPU),
> which is why the cloud deployment uses Gemini's free tier.

---

## ⚠️ Security

- **Never commit `server/.env`** — it's git-ignored. Use the dashboard env vars in
  production. If a key was ever committed, **rotate it** in Google AI Studio.
- Uploaded files are processed in memory and not persisted on the server.

---

## Ideas / roadmap
- Accounts + cloud-synced history (e.g. free Supabase / MongoDB Atlas).
- Q&A over your notes (RAG) and spaced-repetition flashcard review.
- Shareable links for generated quizzes / flashcard sets.
