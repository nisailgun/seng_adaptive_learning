import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkNeedsGeneration,
  getWrongResponseAnalysis
} from "../api";
import LearningPath from "./LearningPath";
import InitialPathGenerator from "../components/InitialPathGenerator";
import { BookOpen, LogOut, Layers, User, HelpCircle } from "lucide-react";

/* ---------------------------------------
   SIDEBAR NAV ITEM
--------------------------------------- */
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
        fontWeight: 600
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ---------------------------------------
   MAIN DASHBOARD COMPONENT
--------------------------------------- */
export default function Dashboard({ token, user, onLogout }) {
  const navigate = useNavigate();

  const [analysisText, setAnalysisText] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [needsPathGeneration, setNeedsPathGeneration] = useState(false);
  const [checkingPath, setCheckingPath] = useState(true);
  const [generatedPath, setGeneratedPath] = useState(null);
  const [showPath, setShowPath] = useState(true);

  /* ----------------------------
     INITIAL PATH CHECK
  ---------------------------- */
  const checkInitialPath = async () => {
    try {
      setCheckingPath(true);
      const result = await checkNeedsGeneration(token);
      setNeedsPathGeneration(result.needsGeneration);
    } catch (e) {
      setNeedsPathGeneration(false);
    } finally {
      setCheckingPath(false);
    }
  };

  useEffect(() => {
    checkInitialPath();
  }, []);

  const handlePathGenerated = (path) => {
    setGeneratedPath(path);
    setNeedsPathGeneration(false);
  };

  /* ----------------------------
     AI ANALYSIS
  ---------------------------- */
  const loadWrongAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const result = await getWrongResponseAnalysis(token);
      setAnalysisText(result.analysis);
      setShowAnalysis(true);
    } catch (e) {
      setAnalysisText("Failed to load analysis.");
      setShowAnalysis(true);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  /* ----------------------------
     LOADING VIEW
  ---------------------------- */
  if (checkingPath) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          justifyContent: "center",
          alignItems: "center",
          background: "#0f172a",
          color: "white",
          fontSize: 20
        }}
      >
        Setting up your dashboard…
      </div>
    );
  }

  /* ----------------------------
     FIRST TIME USER (NO PATH)
  ---------------------------- */
  if (needsPathGeneration) {
    return (
      <div
        style={{
          padding: 40,
          minHeight: "100vh",
          background: "#0f172a",
          color: "white"
        }}
      >
        <InitialPathGenerator token={token} onComplete={handlePathGenerated} />
      </div>
    );
  }

  /* ----------------------------
     MAIN DASHBOARD
  ---------------------------- */
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f172a",
        color: "white"
      }}
    >
      {/* ------------------------------------
          SIDEBAR
      ------------------------------------ */}
      <aside
        style={{
          width: 260,
          padding: 30,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          gap: 18
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Dashboard</h2>

        <NavItem
          icon={<BookOpen size={18} />}
          label="Dashboard"
          onClick={() => navigate("/dashboard")}
        />

        <NavItem
          icon={<Layers size={18} />}
          label="Learning Path"
          onClick={() => setShowPath(true)}
        />

        <NavItem
          icon={<HelpCircle size={18} />}
          label="Support"
          onClick={() => navigate("/support")}
        />

        <NavItem
          icon={<User size={18} />}
          label="Account"
          onClick={() => navigate("/account")}
        />

        <div style={{ flex: 1 }} />

        <NavItem
          icon={<LogOut size={18} />}
          label="Logout"
          danger
          onClick={onLogout}
        />
      </aside>

      {/* ------------------------------------
          MAIN CONTENT
      ------------------------------------ */}
      <main style={{ flex: 1, padding: 60, overflowY: "auto" }}>
        {/* WELCOME SECTION */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
            Welcome back, {user?.username}! 👋
          </h1>
          <p style={{ opacity: 0.6 }}>
            Ready to continue your English learning journey?
          </p>
        </div>

        {/* AI ANALYSIS */}
        <div
          style={{
            marginBottom: 40,
            background: "#020617",
            padding: 30,
            borderRadius: 20,
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
            maxWidth: 900
          }}
        >
          <button
            onClick={loadWrongAnalysis}
            disabled={loadingAnalysis}
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
              marginBottom: 20
            }}
          >
            {loadingAnalysis ? "Analyzing…" : "Analyze My Mistakes (AI)"}
          </button>

          {showAnalysis && (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                borderRadius: 14,
                background: "rgba(255,255,255,0.05)"
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
                AI Mistake Analysis
              </h3>
              <p style={{ opacity: 0.8, whiteSpace: "pre-wrap" }}>
                {analysisText}
              </p>
            </div>
          )}
        </div>

        {/* LEARNING PATH PANEL */}
        {showPath && (
          <div
            style={{
              background: "transparent",
              padding: 0,
              borderRadius: 20
            }}
          >
            <LearningPath token={token} user={user} onLogout={onLogout} />
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------
   SHARED BUTTON STYLES (OPTIONAL EXPORT)
--------------------------------------- */
const btnPrimary = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#6366f1",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};

const btnGhost = {
  ...btnPrimary,
  background: "rgba(255,255,255,0.1)"
};
