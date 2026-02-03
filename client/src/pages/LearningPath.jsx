import React, { useState, useEffect } from "react";
import {
  getLearningPath,
  getModule,
  submit,
  evaluateResponse,
  getAIExplanation,
  generateAIQuestion,
} from "../api";
import VoiceInput from "../components/VoiceInput";
import AIAssistant from "../components/AIAssistant";
import { BookOpen, LogOut, Layers, ArrowLeft, Check, X } from "lucide-react";

export default function LearningPath({ token, onLogout, user }) {
  const [path, setPath] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [moduleContent, setModuleContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [answers, setAnswers] = useState({});
  const [voiceAnswers, setVoiceAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [aiHelp, setAiHelp] = useState({});
  const [evaluating, setEvaluating] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  const [activeAIQuestion, setActiveAIQuestion] = useState(null);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState(null);

  useEffect(() => {
    loadPath();
    // eslint-disable-next-line
  }, []);

  async function loadPath() {
    setLoading(true);
    setError("");
    try {
      const data = await getLearningPath(token);
      setPath(data);
    } catch (e) {
      setError("Failed to load learning path.");
    } finally {
      setLoading(false);
    }
  }

  async function openModule(m) {
    setActiveModule(m);
    setModuleContent(null);
    setAnswers({});
    setVoiceAnswers({});
    setFeedback({});
    setAiHelp({});
    setLoading(true);
    try {
      const mod = await getModule(token, m.id);
      setModuleContent(mod);
    } catch (e) {
      setError("Failed to open module.");
    } finally {
      setLoading(false);
    }
  }

  async function getAIHelpForQuestion(text, id) {
    setLoadingAI(true);
    try {
      const result = await getAIExplanation(token, text, "intermediate");
      setAiHelp((prev) => ({ ...prev, [id]: result.explanation }));
    } catch (e) {
      setAiHelp((prev) => ({ ...prev, [id]: "AI help not available." }));
    } finally {
      setLoadingAI(false);
    }
  }

  async function handleSubmit(e, item) {
    e.preventDefault();
    const q = item.question;
    const id = item.id || q._id;

    const isSpeaking = q.skill === "speaking";
    const userAnswer = isSpeaking
      ? (voiceAnswers[id] || "").trim()
      : (answers[id] || "").trim();

    if (!userAnswer) {
      setFeedback((prev) => ({
        ...prev,
        [id]: { correct: false, message: "⚠️ Please enter an answer." },
      }));
      return;
    }

    setEvaluating(true);
    try {
      let result;
      if (isSpeaking) {
        const res = await fetch("http://localhost:4000/api/evaluate-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: q._id,
            transcript: userAnswer,
          }),
        });

        result = await res.json();
        setFeedback((prev) => ({
          ...prev,
          [id]: {
            correct: result.correct,
            message:
              result.correct
                ? `Great speaking! Score: ${result.speechEvaluation.grade}%`
                : `Score: ${result.speechEvaluation.grade}%`,
            speechMetrics: result.speechEvaluation,
          },
        }));
      } else if (
        q.type === "free-text" ||
        q.evaluationType === "semantic"
      ) {
        const res = await submit(token, q._id, false, userAnswer, true);
        const evalData = res.nlpEvaluation;
        const pass = evalData?.grade >= 70;

        setFeedback((prev) => ({
          ...prev,
          [id]: {
            correct: pass,
            message: pass
              ? `Great! Score: ${evalData.grade}%`
              : `Score: ${evalData.grade}% - ${evalData.feedback}`,
            nlpScore: evalData.grade,
          },
        }));
      } else {
        const correct =
          userAnswer.toLowerCase() === q.answer.toLowerCase();
        const res = await submit(token, q._id, correct, userAnswer, false);
        setFeedback((prev) => ({
          ...prev,
          [id]: {
            correct,
            message: correct
              ? "Correct!"
              : `Incorrect. The correct answer is: ${q.answer}`,
          },
        }));
      }
    } catch (e) {
      setFeedback((prev) => ({
        ...prev,
        [id]: { correct: false, message: "Failed to evaluate answer." },
      }));
    }
    setEvaluating(false);
  }

  async function generateAIPractice(skill, difficulty) {
    setLoadingAI(true);
    try {
      const result = await generateAIQuestion(token, skill, difficulty, skill);
      setActiveAIQuestion(result);
      setAiAnswer("");
      setAiFeedback(null);
    } catch (err) {
      setError("Failed to generate AI question.");
    } finally {
      setLoadingAI(false);
    }
  }

  /* =======================
     SIDEBAR
  ======================= */
  const Sidebar = () => (
    <aside
      style={{
        width: 260,
        padding: 30,
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        minHeight: "100vh",
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Learning Path</h2>

      <NavItem
        icon={<BookOpen size={18} />}
        label="Dashboard"
        onClick={() => {
          setActiveModule(null);
          setModuleContent(null);
        }}
      />

      <NavItem
        icon={<Layers size={18} />}
        label="Modules"
        onClick={() => {
          setActiveModule(null);
          setModuleContent(null);
        }}
      />

      <div style={{ flex: 1 }} />

      <NavItem
        icon={<LogOut size={18} />}
        label="Logout"
        danger
        onClick={onLogout}
      />
    </aside>
  );

  /* =======================
     NAV ITEM
  ======================= */
  function NavItem({ icon, label, onClick, danger }) {
    return (
      <button
        onClick={onClick}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "12px 14px",
          borderRadius: 10,
          background: danger
            ? "rgba(239,68,68,0.15)"
            : "rgba(255,255,255,0.08)",
          color: danger ? "#fecaca" : "white",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {icon}
        {label}
      </button>
    );
  }

  /* =======================
     MAIN LAYOUT
  ======================= */
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
      }}
    >
      <Sidebar />

      <main style={{ flex: 1, padding: 60, overflowY: "auto" }}>
        {/* HEADER */}
        <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
          Your AI-Powered Learning Path
        </h1>
        <p style={{ opacity: 0.6, marginBottom: 40 }}>
          Personalized module recommendations and adaptive practice.
        </p>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom: 20,
              padding: 20,
              background: "rgba(255,0,0,0.1)",
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && !path && (
          <div style={{ padding: 60 }}>Loading...</div>
        )}

        {/* MAIN PATH VIEW */}
        {!activeModule ? (
          <PathOverview
            path={path}
            openModule={openModule}
            generateAIPractice={generateAIPractice}
          />
        ) : (
          <ModuleView
            activeModule={activeModule}
            moduleContent={moduleContent}
            answers={answers}
            voiceAnswers={voiceAnswers}
            feedback={feedback}
            loadingAI={loadingAI}
            evaluating={evaluating}
            setAnswers={setAnswers}
            setVoiceAnswers={setVoiceAnswers}
            handleSubmit={handleSubmit}
            getAIHelpForQuestion={getAIHelpForQuestion}
            aiHelp={aiHelp}
            setActiveModule={setActiveModule}
            setModuleContent={setModuleContent}
          />
        )}

        {/* AI GENERATED QUESTION MODAL */}
        {activeAIQuestion && (
          <AIPracticeModal
            activeAIQuestion={activeAIQuestion}
            setActiveAIQuestion={setActiveAIQuestion}
            aiAnswer={aiAnswer}
            setAiAnswer={setAiAnswer}
            aiFeedback={aiFeedback}
            setAiFeedback={setAiFeedback}
            token={token}
          />
        )}

        {/* AI ASSISTANT */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}>
            🤖 Need More Help?
          </h2>
          <AIAssistant token={token} />
        </div>
      </main>
    </div>
  );
}

/* ============================
   PATH OVERVIEW SECTION
============================ */
function PathOverview({ path, openModule, generateAIPractice }) {
  if (!path) return null;

  return (
    <div>
      {/* STATS */}
      <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
        <StatCard label="Your Level" value={path.suggestedLevel || "Beginner"} />
        <StatCard
          label="Ability Score (θ)"
          value={path.theta?.toFixed(2) || "0.00"}
        />
      </div>

      <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        Recommended Modules
      </h3>

      {/* MODULE GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 20,
        }}
      >
        {path.modules?.map((m) => (
          <div
            key={m.id}
            style={{
              padding: 24,
              borderRadius: 20,
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
            }}
          >
            <h4 style={{ fontSize: 20, fontWeight: 800 }}>{m.title}</h4>
            <p style={{ opacity: 0.6, margin: "6px 0" }}>Skill: {m.skill}</p>
            <p style={{ opacity: 0.6 }}>Level {m.level}</p>

            <button
              onClick={() => openModule(m)}
              style={btnPrimary}
            >
              Start →
            </button>
          </div>
        ))}
      </div>

      {/* AI PRACTICE QUICK ACTION */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          Quick AI Practice
        </h3>

        <div style={{ display: "flex", gap: 12 }}>
          {["reading", "writing", "listening", "speaking"].map((skill) => (
            <button
              key={skill}
              onClick={() => generateAIPractice(skill, "intermediate")}
              style={{
                ...btnGhost,
                padding: "12px 18px",
                textTransform: "capitalize",
              }}
            >
              Practice {skill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================
   MODULE VIEW SECTION
============================ */
function ModuleView({
  activeModule,
  moduleContent,
  answers,
  voiceAnswers,
  feedback,
  loadingAI,
  evaluating,
  setAnswers,
  setVoiceAnswers,
  handleSubmit,
  getAIHelpForQuestion,
  aiHelp,
  setActiveModule,
  setModuleContent,
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={() => {
          setActiveModule(null);
          setModuleContent(null);
        }}
        style={btnGhost}
      >
        ← Back to Modules
      </button>

      <h2 style={{ fontSize: 28, fontWeight: 800, margin: "20px 0 6px" }}>
        {moduleContent?.title}
      </h2>
      <p style={{ opacity: 0.6, marginBottom: 20 }}>
        {moduleContent?.description}
      </p>

      {/* QUESTIONS */}
      {moduleContent?.items?.map((item, index) => {
        const q = item.question;
        if (!q)
          return (
            <div
              key={index}
              style={{
                padding: 20,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                marginBottom: 20,
              }}
            >
              Question coming soon...
            </div>
          );

        const id = item.id || q._id;
        const isSpeaking = q.skill === "speaking";
        const isFreeText = q.type === "free-text";

        return (
          <div
            key={id}
            style={{
              background: "#020617",
              padding: 30,
              borderRadius: 20,
              marginBottom: 30,
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <span style={{ opacity: 0.5 }}>#{index + 1}</span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.08)",
                  fontSize: 12,
                  textTransform: "capitalize",
                }}
              >
                {q.skill}
              </span>
              <span style={{ opacity: 0.5 }}>
                Level:{" "}
                {q.difficulty >= 1.5
                  ? "Advanced"
                  : q.difficulty >= 0
                  ? "Intermediate"
                  : "Beginner"}
              </span>
            </div>

            <p style={{ fontSize: 18, lineHeight: 1.6 }}>{q.text}</p>

            {/* Audio Section */}
            {q.audioText && (
              <div
                style={{
                  marginTop: 20,
                  padding: 20,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 12,
                }}
              >
                <button
                  onClick={() => {
                    const u = new SpeechSynthesisUtterance(q.audioText);
                    u.rate = 0.8;
                    speechSynthesis.speak(u);
                  }}
                  style={{
                    ...btnPrimary,
                    padding: "10px 14px",
                    marginBottom: 10,
                  }}
                >
                  🔊 Play Audio
                </button>
                <details>
                  <summary>Transcript</summary>
                  <p style={{ opacity: 0.6, marginTop: 10 }}>
                    {q.audioText}
                  </p>
                </details>
              </div>
            )}

            {/* Answer Form */}
            <form
              onSubmit={(e) => handleSubmit(e, item)}
              style={{ marginTop: 20 }}
            >
              {isSpeaking ? (
                <div>
                  <VoiceInput
                    onTranscriptChange={(t) => {
                      setVoiceAnswers((prev) => ({
                        ...prev,
                        [id]: t,
                      }));
                      setAnswers((prev) => ({ ...prev, [id]: t }));
                    }}
                  />
                </div>
              ) : isFreeText ? (
                <textarea
                  value={answers[id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [id]: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Write your answer..."
                  style={textAreaStyle}
                />
              ) : q.options?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((opt, i) => (
                    <button
                      type="button"
                      key={i}
                      style={{
                        ...optionStyle,
                        background:
                          answers[id] === opt
                            ? "#6366f1"
                            : "rgba(255,255,255,0.05)",
                      }}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [id]: opt }))
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  value={answers[id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [id]: e.target.value,
                    }))
                  }
                  placeholder="Your answer..."
                  style={inputStyle}
                />
              )}

              <button
                type="submit"
                disabled={evaluating}
                style={{ ...btnPrimary, marginTop: 20 }}
              >
                {evaluating ? "Evaluating..." : "Submit Answer"}
              </button>
            </form>

            {/* Feedback */}
            {feedback[id] && (
              <div
                style={{
                  marginTop: 20,
                  padding: 20,
                  background: feedback[id].correct
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)",
                  borderRadius: 12,
                }}
              >
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {feedback[id].message}
                </p>
              </div>
            )}

            {/* AI HELP BUTTON */}
            {!feedback[id] && (
              <button
                disabled={loadingAI}
                onClick={() => getAIHelpForQuestion(q.text, id)}
                style={{
                  ...btnGhost,
                  marginTop: 20,
                  padding: "12px 16px",
                }}
              >
                {loadingAI ? "Loading..." : "💡 Get AI Help"}
              </button>
            )}

            {/* AI HELP DISPLAY */}
            {aiHelp[id] && (
              <div
                style={{
                  marginTop: 15,
                  padding: 20,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#6366f1,#22d3ee)",
                  color: "#020617",
                  fontWeight: 600,
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiHelp[id]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================
   AI PRACTICE MODAL
============================ */
function AIPracticeModal({
  activeAIQuestion,
  setActiveAIQuestion,
  aiAnswer,
  setAiAnswer,
  aiFeedback,
  setAiFeedback,
  token,
}) {
  async function evaluateAIAnswer() {
    if (!aiAnswer.trim()) return;
    try {
      const isLong = aiAnswer.split(/\s+/).length > 10;
      let result;

      if (isLong) {
        result = await evaluateResponse(token, aiAnswer);
        setAiFeedback({
          correct: result.passed,
          message: result.evaluation.feedback,
          score: result.evaluation.grade,
        });
      } else {
        const correct =
          aiAnswer.toLowerCase() ===
          activeAIQuestion.answer.toLowerCase();
        setAiFeedback({
          correct,
          message: correct
            ? "Correct!"
            : `Incorrect. Answer: ${activeAIQuestion.answer}`,
        });
      }
    } catch (e) {
      setAiFeedback({
        correct: false,
        message: "Error evaluating answer.",
      });
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          background: "#020617",
          padding: 40,
          borderRadius: 20,
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
          🤖 AI Generated Question
        </h3>

        <p style={{ opacity: 0.7, marginBottom: 20 }}>
          {activeAIQuestion.text}
        </p>

        <textarea
          value={aiAnswer}
          onChange={(e) => setAiAnswer(e.target.value)}
          placeholder="Your answer..."
          rows={4}
          style={textAreaStyle}
        />

        <button
          onClick={evaluateAIAnswer}
          style={{ ...btnPrimary, width: "100%", marginTop: 20 }}
        >
          Submit
        </button>

        {aiFeedback && (
          <div
            style={{
              marginTop: 20,
              padding: 20,
              borderRadius: 12,
              background: aiFeedback.correct
                ? "rgba(34,197,94,0.15)"
                : "rgba(239,68,68,0.15)",
            }}
          >
            <p>{aiFeedback.message}</p>
          </div>
        )}

        <button
          onClick={() => setActiveAIQuestion(null)}
          style={{ ...btnGhost, width: "100%", marginTop: 20 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ============================
   SHARED COMPONENTS & STYLES
============================ */
function StatCard({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#020617",
        padding: 30,
        borderRadius: 20,
        boxShadow: "0 30px 100px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const btnPrimary = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#6366f1",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const btnGhost = {
  ...btnPrimary,
  background: "rgba(255,255,255,0.1)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  background: "#020617",
  color: "white",
  outline: "1px solid rgba(255,255,255,0.1)",
};

const textAreaStyle = {
  ...inputStyle,
  resize: "vertical",
};

const optionStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  color: "white",
  cursor: "pointer",
  textAlign: "left",
};
