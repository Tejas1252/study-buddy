import { useEffect, useMemo, useRef, useState } from "react";
import { callAI, extractFile } from "../services/api";
import Sidebar from "./Sidebar";
import { MODES } from "../modes";
import FlashcardsPanel from "./FlashcardsPanel";
import KeyTermsPanel from "./KeyTermsPanel";
import ClozePanel from "./ClozePanel";
import PracticeTestPanel from "./PracticeTestPanel";
import HistoryDrawer from "./HistoryDrawer";
import { openPrintWindow } from "../utils/print";
import { estimateTokens, MAX_INPUT_TOKENS } from "../utils/tokens";
import { formatOutput } from "../utils/format";
import { copyText } from "../utils/clipboard";
import { downloadText } from "../utils/download";
import { computeStats } from "../utils/stats";

const TextForm = () => {
  const makeId = () => {
    try {
      // eslint-disable-next-line no-undef
      return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
    } catch {
      return String(Date.now());
    }
  };
  const [mode, setMode] = useState("simplify");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("studyBuddyTheme") || "dark";
    } catch {
      return "dark";
    }
  });
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [resultBase, setResultBase] = useState("");
  const [mcq, setMcq] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [terms, setTerms] = useState(null);
  const [cloze, setCloze] = useState(null);
  const [practiceTest, setPracticeTest] = useState(null);
  const [answersShown, setAnswersShown] = useState(false);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const [level, setLevel] = useState("easy");
  const [fromLang, setFromLang] = useState("en");
  const [toLang, setToLang] = useState("hi");
  const [outFromLang, setOutFromLang] = useState("en");
  const [outToLang, setOutToLang] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);
  const [meta, setMeta] = useState(null);
  const [uploadInfo, setUploadInfo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const [speakingKey, setSpeakingKey] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studyBuddyHistory") || "[]");
    } catch {
      return [];
    }
  });

  const ttsSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined";

  const sttSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => () => clearProgressTimer(), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("studyBuddyTheme", theme);
    } catch {
      // ignore
    }
  }, [theme]);
  useEffect(() => {
    if (!ttsSupported) return;
    const onEnd = () => setSpeakingKey(null);
    window.speechSynthesis.addEventListener("end", onEnd);
    window.speechSynthesis.addEventListener("error", onEnd);
    return () => {
      window.speechSynthesis.removeEventListener("end", onEnd);
      window.speechSynthesis.removeEventListener("error", onEnd);
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sttSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || "";
      if (transcript) setText((t) => (t ? `${t}\n${transcript}` : transcript));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (key, content) => {
    if (!ttsSupported) {
      setError("Text-to-speech is not supported in this browser.");
      return;
    }

    const textToSpeak = String(content || "").trim();
    if (!textToSpeak) return;

    // Toggle: clicking same button stops.
    if (speakingKey === key) {
      window.speechSynthesis.cancel();
      setSpeakingKey(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingKey(key);

    const utter = new window.SpeechSynthesisUtterance(textToSpeak);
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => setSpeakingKey(null);
    utter.onerror = () => setSpeakingKey(null);
    window.speechSynthesis.speak(utter);
  };

  const toggleListening = () => {
    if (!sttSupported) {
      setError("Speech-to-text is not supported in this browser.");
      return;
    }
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }
    setError("");
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const clearOutputs = () => {
    setResult("");
    setResultBase("");
    setMcq(null);
    setFlashcards(null);
    setTerms(null);
    setCloze(null);
    setPracticeTest(null);
    setAnswersShown(false);
    setSelected({});
    setMeta(null);
  };

  const handleUploadClick = () => {
    if (loading || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    setError("");
    setUploadInfo("");
    setUploading(true);
    try {
      const res = await extractFile(file);
      const extracted = res.data.text || "";
      setText(extracted);
      setUploadInfo(
        `Loaded "${file.name}" · ~${res.data.inputTokens || estimateTokens(extracted)} tokens`
      );
    } catch (err) {
      const msg =
        err.response?.data?.error || err.message || "Could not read that file";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const saveRun = (run) => {
    setHistory((prev) => {
      const next = [run, ...prev].slice(0, 50);
      localStorage.setItem("studyBuddyHistory", JSON.stringify(next));
      return next;
    });
  };

  const startProgressSimulation = () => {
    setProgress(0);
    clearProgressTimer();
    progressTimerRef.current = setInterval(() => {
      setProgress((p) =>
        p >= 95 ? p : Math.min(95, p + Math.max(0.4, (95 - p) * 0.07))
      );
    }, 100);
  };

  const handleSubmit = async (type) => {
    if (loading) return;
    setError("");
    clearOutputs();
    setLoading(true);
    startProgressSimulation();
    try {
      const payload = { text, type, level };
      if (type === "translate") {
        payload.fromLang = fromLang;
        payload.toLang = toLang;
      }
      const res = await callAI(payload);
      clearProgressTimer();
      setProgress(100);
      setMeta(res.data.meta || null);
      if (type === "questions") setMcq(res.data.result);
      else if (type === "flashcards") setFlashcards(res.data.result);
      else if (type === "key_terms") setTerms(res.data.result);
      else if (type === "cloze") setCloze(res.data.result);
      else if (type === "practice_test") setPracticeTest(res.data.result);
      else {
        setResult(res.data.result);
        setResultBase(res.data.result);
      }
      saveRun({
        id: makeId(),
        createdAt: Date.now(),
        mode: type,
        inputText: text,
        settings: {
          level,
          fromLang,
          toLang,
        },
        output: res.data.result,
      });
      await new Promise((r) => setTimeout(r, 420));
    } catch (err) {
      clearProgressTimer();
      setProgress(0);
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const translateOutput = async () => {
    if (!resultBase || loading) return;
    setError("");
    setLoading(true);
    startProgressSimulation();
    try {
      const res = await callAI({
        text: resultBase,
        type: "translate",
        level,
        fromLang: outFromLang,
        toLang: outToLang,
      });
      clearProgressTimer();
      setProgress(100);
      setResult(res.data.result);
      await new Promise((r) => setTimeout(r, 420));
    } catch (err) {
      clearProgressTimer();
      setProgress(0);
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // All "what's currently shown as output" serialization lives in formatOutput.
  const currentOutputText = () =>
    formatOutput({ mcq, flashcards, terms, cloze, practiceTest, result });

  const hasOutput = () =>
    !!(
      mcq?.questions?.length ||
      flashcards?.cards?.length ||
      terms?.terms?.length ||
      cloze?.items?.length ||
      practiceTest?.mcq?.length ||
      result
    );

  const exportPdf = () => {
    const content = currentOutputText();
    if (!content) return;
    openPrintWindow({ title: `Study Buddy — ${mode}`, contentText: content });
  };

  const handleCopy = async () => {
    const content = currentOutputText();
    if (!content) return;
    const ok = await copyText(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    const content = currentOutputText();
    if (!content) return;
    downloadText(`study-buddy-${mode}.txt`, content);
  };

  const stats = useMemo(() => computeStats(history), [history]);
  const inputTokens = useMemo(() => estimateTokens(text), [text]);
  const overLimit = inputTokens > MAX_INPUT_TOKENS;
  const tokenRatio = Math.min(1, inputTokens / MAX_INPUT_TOKENS);
  const tokenState = overLimit ? "over" : tokenRatio > 0.8 ? "warn" : "ok";

  const pct = Math.round(progress);
  const allAnswered =
    !!mcq?.questions?.length &&
    mcq.questions.every((_, i) => typeof selected[i] === "string" && selected[i]);

  const primaryActionText = useMemo(() => {
    if (mode === "questions") return "Generate quiz";
    if (mode === "translate") return "Translate";
    if (mode === "flashcards") return "Generate flashcards";
    if (mode === "key_terms") return "Extract key terms";
    if (mode === "cloze") return "Generate blanks";
    if (mode === "practice_test") return "Generate test";
    if (mode === "rewrite") return "Rewrite";
    if (mode === "summary") return "Summarize";
    return "Simplify";
  }, [mode]);

  return (
    <div className="layout">
      <Sidebar value={mode} onChange={setMode} disabled={loading} stats={stats} />
      <div className="main">
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={history}
        query={historyQuery}
        setQuery={setHistoryQuery}
        onLoad={(it) => {
          setMode(it.mode || "simplify");
          setText(it.inputText || "");
          setLevel(it.settings?.level || "easy");
          setFromLang(it.settings?.fromLang || "en");
          setToLang(it.settings?.toLang || "hi");
          clearOutputs();
          if (it.mode === "questions") setMcq(it.output);
          else if (it.mode === "flashcards") setFlashcards(it.output);
          else if (it.mode === "key_terms") setTerms(it.output);
          else if (it.mode === "cloze") setCloze(it.output);
          else if (it.mode === "practice_test") setPracticeTest(it.output);
          else {
            setResult(it.output);
            setResultBase(it.output);
          }
          setHistoryOpen(false);
        }}
        onDelete={(id) => {
          setHistory((prev) => {
            const next = prev.filter((x) => x.id !== id);
            localStorage.setItem("studyBuddyHistory", JSON.stringify(next));
            return next;
          });
        }}
        onClear={() => {
          setHistory([]);
          localStorage.setItem("studyBuddyHistory", "[]");
        }}
      />
      {loading ? (
        <div
          className="loading-overlay"
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="loading-title"
          aria-describedby="loading-desc"
        >
          <div className="loading-card">
            <p id="loading-title" className="loading-title">
              Generating response
            </p>
            <p id="loading-desc" className="loading-sub">
              Estimated progress (response time varies)
            </p>
            <div
              className="loading-bar-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="loading-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="loading-pct">{pct}%</p>
          </div>
        </div>
      ) : null}

      <div className="main-header">
        <div className="main-heading">
          <span
            className="main-heading-icon"
            style={{ "--chip": MODES[mode]?.color }}
            aria-hidden="true"
          >
            {MODES[mode]?.icon}
          </span>
          <div className="main-heading-text">
            <h2 className="main-title">{MODES[mode]?.label}</h2>
            <p className="main-sub">{MODES[mode]?.subtitle}</p>
          </div>
        </div>
        <div className="main-header-tools">
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setHistoryOpen(true)}
            disabled={loading}
          >
            🕘 History
          </button>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="label-row">
          <label className="label" htmlFor="inputText">
            Paste your text
          </label>
          <div className="label-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              className="btn btn-sm"
              type="button"
              onClick={handleUploadClick}
              disabled={loading || uploading}
              title="Upload a PDF or .txt file"
            >
              {uploading ? "Uploading…" : "📎 Upload PDF/TXT"}
            </button>
          </div>
        </div>

        {uploadInfo ? <p className="upload-info">{uploadInfo}</p> : null}

        <div className="textarea-wrap">
          <textarea
            id="inputText"
            className="textarea"
            rows="10"
            placeholder="Paste your notes, paragraph, or topic…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />
          <button
            className="icon-btn"
            type="button"
            onClick={() => speak("input", text)}
            disabled={loading || !text.trim()}
            title={speakingKey === "input" ? "Stop reading" : "Read aloud"}
            aria-label={speakingKey === "input" ? "Stop reading" : "Read input aloud"}
          >
            {speakingKey === "input" ? "■" : "🔊"}
          </button>
          <button
            className="icon-btn icon-btn-left"
            type="button"
            onClick={toggleListening}
            disabled={loading}
            title={listening ? "Stop dictation" : "Dictate (speech to text)"}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
          >
            {listening ? "■" : "🎙"}
          </button>
        </div>

        <div className={`token-meter token-meter-${tokenState}`}>
          <div className="token-meter-track">
            <div
              className="token-meter-fill"
              style={{ width: `${Math.round(tokenRatio * 100)}%` }}
            />
          </div>
          <span className="token-meter-label">
            ~{inputTokens.toLocaleString()} / {MAX_INPUT_TOKENS.toLocaleString()} tokens
            {overLimit ? " · too long, please shorten" : ""}
          </span>
        </div>

        <div className="controls">
          <div className="control">
            <span className="label-inline">Level</span>
            <select
              className="select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              disabled={loading}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="control">
            <span className="label-inline">Translate</span>
            <select
              className="select"
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              disabled={loading}
              aria-label="Translate from"
              title="Translate from"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
            <span className="label-inline" aria-hidden="true">
              →
            </span>
            <select
              className="select"
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              disabled={loading}
              aria-label="Translate to"
              title="Translate to"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>

          <div className="buttons">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => handleSubmit(mode)}
              disabled={loading || overLimit || !text.trim()}
              title={overLimit ? "Input is over the token limit" : ""}
            >
              {primaryActionText}
            </button>
            <button
              className="btn"
              type="button"
              onClick={handleCopy}
              disabled={loading || !hasOutput()}
              title="Copy result to clipboard"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={handleDownload}
              disabled={loading || !hasOutput()}
              title="Download result as .txt"
            >
              Download
            </button>
            <button
              className="btn"
              type="button"
              onClick={exportPdf}
              disabled={loading || !hasOutput()}
              title="Print / Save as PDF"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert" role="alert">
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      {meta && (meta.chunks > 1 || meta.truncated) ? (
        <div className="meta-note" role="status">
          {meta.chunks > 1
            ? `Long input was processed in ${meta.chunks} chunks.`
            : null}
          {meta.truncated
            ? " Input was truncated to fit the limit for this mode."
            : null}
        </div>
      ) : null}

      {mcq?.questions?.length ? (
        <div className="card result-card" aria-live="polite">
          <div className="result-header">
            <p className="result-title">Questions</p>
          </div>

          <div className="mcq">
            {mcq.questions.map((q, idx) => {
              const name = `q_${idx}`;
              const correct = q.answer;
              const show = answersShown;
              const ttsText = [
                `Question ${idx + 1}. ${q.question}`,
                `Option A. ${q.options?.A || ""}`,
                `Option B. ${q.options?.B || ""}`,
                `Option C. ${q.options?.C || ""}`,
                `Option D. ${q.options?.D || ""}`,
              ].join("\n");
              return (
                <div className="mcq-q" key={idx}>
                  <div className="mcq-title-row">
                    <p className="mcq-title">
                      {idx + 1}. {q.question}
                    </p>
                    <button
                      className="icon-btn icon-btn-sm"
                      type="button"
                      onClick={() => speak(`q_${idx}`, ttsText)}
                      disabled={loading}
                      title={speakingKey === `q_${idx}` ? "Stop reading" : "Read question aloud"}
                      aria-label={
                        speakingKey === `q_${idx}` ? "Stop reading" : "Read question aloud"
                      }
                    >
                      {speakingKey === `q_${idx}` ? "■" : "🔊"}
                    </button>
                  </div>
                  <div className="mcq-options">
                    {["A", "B", "C", "D"].map((k) => {
                      const isCorrect = show && k === correct;
                      const isWrongSelected =
                        show && selected[idx] === k && k !== correct;
                      return (
                        <label
                          key={k}
                          className={[
                            "mcq-opt",
                            isCorrect ? "mcq-opt-correct" : "",
                            isWrongSelected ? "mcq-opt-wrong" : "",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name={name}
                            value={k}
                            disabled={loading || show}
                            checked={selected[idx] === k}
                            onChange={() =>
                              setSelected((s) => ({ ...s, [idx]: k }))
                            }
                          />
                          <span className="mcq-letter">{k}.</span>
                          <span>{q.options?.[k]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mcq-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setAnswersShown(true)}
                disabled={loading || answersShown || !allAnswered}
                title={
                  !allAnswered
                    ? "Select an option for every question first"
                    : "Show correct answers"
                }
              >
                Show result
              </button>
            </div>
          </div>
        </div>
      ) : result ? (
        <div className="card result-card" aria-live="polite">
          <div className="result-header">
            <p className="result-title">Result</p>
            <div className="result-tools">
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => speak("result", result)}
                disabled={loading || !result}
                title={speakingKey === "result" ? "Stop reading" : "Read result aloud"}
              >
                {speakingKey === "result" ? "■" : "🔊"}
              </button>
              <select
                className="select select-sm"
                value={outFromLang}
                onChange={(e) => setOutFromLang(e.target.value)}
                disabled={loading}
                aria-label="Translate result from"
                title="Translate result from"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
              <span className="label-inline" aria-hidden="true">
                →
              </span>
              <select
                className="select select-sm"
                value={outToLang}
                onChange={(e) => setOutToLang(e.target.value)}
                disabled={loading}
                aria-label="Translate result to"
                title="Translate result to"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
              <button
                className="btn btn-sm"
                type="button"
                onClick={translateOutput}
                disabled={loading || !resultBase}
                title="Translate the result text"
              >
                Translate result
              </button>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => setResult(resultBase)}
                disabled={loading || !resultBase}
                title="Restore original result"
              >
                Reset
              </button>
            </div>
          </div>
          <pre className="result">{result}</pre>
        </div>
      ) : (
        <div className="hint">
          Tip: Pick a mode from the sidebar, then click{" "}
          <strong>{primaryActionText}</strong>.
        </div>
      )}

      <FlashcardsPanel data={flashcards} onSpeak={speak} speakingKey={speakingKey} />
      <KeyTermsPanel data={terms} />
      <ClozePanel data={cloze} />
      <PracticeTestPanel data={practiceTest} />
      </div>
    </div>
  );
};

export default TextForm;
