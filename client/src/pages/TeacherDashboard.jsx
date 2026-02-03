import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Award,
  BookOpen,
  LogOut,
  User,
  Shield,
  RefreshCw,
  Download
} from "lucide-react";

/* -----------------------------------------------------------------------------
    Sidebar NavItem (Account.jsx ile birebir)
----------------------------------------------------------------------------- */
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

/* -----------------------------------------------------------------------------
    Main Teacher Dashboard Component
----------------------------------------------------------------------------- */
export default function TeacherDashboard({ token, user, onLogout }) {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);

  /* ---------------- LOAD ALL DATA ON START ---------------- */
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadStudents(), loadAnalytics()]);
    setLoading(false);
  }

  async function refreshData() {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }

  async function loadStudents() {
    try {
      const res = await fetch("http://localhost:4000/api/teacher/students", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStudents(data);
    } catch (e) {
      console.error("Failed to load students:", e);
    }
  }

  async function loadAnalytics() {
    try {
      const reportRes = await fetch(
        "http://localhost:8000/api/reports/class/101"
      );
      const reportData = await reportRes.json();
      setReport(reportData);

      const statsRes = await fetch(
        "http://localhost:8000/api/reports/class/101/average"
      );
      const statsData = await statsRes.json();
      setStats(statsData);

      setAnalyticsError(null);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setAnalyticsError(
        "Analytics service is currently unavailable (optional feature)"
      );
    }
  }

  async function exportCSV() {
    try {
      const studentIds = students.map((s) => s._id);
      const response = await fetch(
        "http://localhost:4000/api/reports/class/csv",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ studentIds })
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `class-report-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        alert("Failed to export CSV.");
      }
    } catch (e) {
      alert("Error exporting CSV.");
    }
  }

  /* ---------------- LOADING SCREEN ---------------- */
  if (loading) {
    return (
      <div
        style={{
          background: "#0f172a",
          color: "white",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 24
        }}
      >
        Loading Teacher Dashboard…
      </div>
    );
  }

  /* ---------------- CALCULATE METRICS ---------------- */
  const totalStudents = students.length;
  const avgTheta =
    students.reduce((sum, s) => sum + (s.theta || 0), 0) / totalStudents || 0;
  const totalQuestions = students.reduce(
    (sum, s) => sum + (s.stats?.totalQuestions || 0),
    0
  );

  /* ---------------- MAIN UI ---------------- */
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f172a",
        color: "white"
      }}
    >
      {/* ----------------------------------------------------------------------
          SIDEBAR — ACCOUNT.JSX İLE AYNI
      ---------------------------------------------------------------------- */}
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
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Teacher Panel</h2>

        <NavItem
          icon={<BookOpen size={18} />}
          label="Dashboard"
          onClick={() => navigate("/dashboard")}
        />

        <NavItem
          icon={<Users size={18} />}
          label="Students"
          onClick={() => {}}
        />

        <NavItem
          icon={<TrendingUp size={18} />}
          label="Performance"
          onClick={() => {}}
        />

        <NavItem
          icon={<User size={18} />}
          label="Account"
          onClick={() => navigate("/account")}
        />

        {user?.role === "admin" && (
          <NavItem
            icon={<Shield size={18} />}
            label="Admin Panel"
            onClick={() => navigate("/admin")}
          />
        )}

        <div style={{ flex: 1 }} />

        <NavItem
          icon={<LogOut size={18} />}
          label="Logout"
          danger
          onClick={onLogout}
        />
      </aside>

      {/* ----------------------------------------------------------------------
          MAIN CONTENT
      ---------------------------------------------------------------------- */}
      <main style={{ flex: 1, padding: 60, overflowY: "auto" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900 }}>
            Teacher Dashboard
          </h1>
          <p style={{ opacity: 0.6 }}>
            Monitor class performance, ability scores and analytics
          </p>

          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button
              onClick={refreshData}
              disabled={refreshing}
              style={btnPrimary}
            >
              <RefreshCw
                size={18}
                style={{ marginRight: 6, animation: refreshing ? "spin 1s linear infinite" : "none" }}
              />
              Refresh
            </button>

            <button onClick={exportCSV} style={btnGhost}>
              <Download size={18} style={{ marginRight: 6 }} />
              Export CSV
            </button>
          </div>
        </div>

        {/* STATS GRID */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 40
          }}
        >
          {/* CARD 1 */}
          <div style={statCard("#6366f1")}>
            <Users size={30} />
            <div style={statValue}>{totalStudents}</div>
            <div style={statLabel}>Total Students</div>
          </div>

          {/* CARD 2 */}
          <div style={statCard("#38bdf8")}>
            <TrendingUp size={30} />
            <div style={statValue}>{avgTheta.toFixed(2)}</div>
            <div style={statLabel}>Avg Ability (θ)</div>
          </div>

          {/* CARD 3 */}
          <div style={statCard("#f472b6")}>
            <BookOpen size={30} />
            <div style={statValue}>{totalQuestions}</div>
            <div style={statLabel}>Total Questions</div>
          </div>

          {/* CARD 4 */}
          {stats && (
            <div style={statCard("#4ade80")}>
              <Award size={30} />
              <div style={statValue}>{stats.average_retention}%</div>
              <div style={statLabel}>Avg Retention</div>
            </div>
          )}
        </div>

        {/* STUDENTS TABLE */}
        <div style={tableCard}>
          <h2 style={{ marginBottom: 20 }}>Student Details</h2>

          {students.length === 0 ? (
            <p style={{ opacity: 0.6 }}>No students found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Ability (θ)</th>
                    <th>Total Questions</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((s) => {
                    const accuracy = s.stats?.accuracy || 0;
                    const risk = accuracy < 50 || s.theta < -1;

                    return (
                      <tr key={s._id}>
                        <td style={bold}>{s.username}</td>
                        <td>
                          {s.firstName && s.lastName
                            ? `${s.firstName} ${s.lastName}`
                            : "-"}
                        </td>
                        <td style={center}>{s.theta?.toFixed(2)}</td>
                        <td style={center}>{s.stats?.totalQuestions || 0}</td>
                        <td style={center}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              background:
                                accuracy >= 70
                                  ? "rgba(34,197,94,0.2)"
                                  : accuracy >= 50
                                  ? "rgba(234,179,8,0.2)"
                                  : "rgba(239,68,68,0.2)",
                              color:
                                accuracy >= 70
                                  ? "#4ade80"
                                  : accuracy >= 50
                                  ? "#facc15"
                                  : "#f87171",
                              fontWeight: 700
                            }}
                          >
                            {accuracy}%
                          </span>
                        </td>

                        <td style={center}>
                          {risk ? (
                            <span style={riskBadge}>⚠️ AT RISK</span>
                          ) : (
                            <span style={okBadge}>✓ On Track</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ANALYTICS TABLE */}
        {report?.data?.length > 0 && (
          <div style={{ ...tableCard, marginTop: 40 }}>
            <h2 style={{ marginBottom: 20 }}>Advanced Analytics</h2>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Retention</th>
                    <th>Risk</th>
                  </tr>
                </thead>

                <tbody>
                  {report.data.map((r) => (
                    <tr key={r.id}>
                      <td style={bold}>{r.name}</td>
                      <td>{r.level}</td>
                      <td>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            background:
                              r.retention >= 70
                                ? "rgba(34,197,94,0.2)"
                                : r.retention >= 50
                                ? "rgba(234,179,8,0.2)"
                                : "rgba(239,68,68,0.2)",
                            color:
                              r.retention >= 70
                                ? "#4ade80"
                                : r.retention >= 50
                                ? "#facc15"
                                : "#f87171",
                            fontWeight: 700
                          }}
                        >
                          {r.retention}%
                        </span>
                      </td>
                      <td>
                        {r.risk ? (
                          <span style={riskBadge}>⚠️ AT RISK</span>
                        ) : (
                          <span style={okBadge}>✓ On Track</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {analyticsError && (
              <p style={{ opacity: 0.6, marginTop: 10 }}>{analyticsError}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* -----------------------------------------------------------------------------
    SHARED STYLES
----------------------------------------------------------------------------- */

const btnPrimary = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#6366f1",
  color: "white",
  fontWeight: 700,
  cursor: "pointer"
};

const btnGhost = {
  ...btnPrimary,
  background: "rgba(255,255,255,0.1)"
};

const statCard = (color) => ({
  width: 220,
  padding: 24,
  borderRadius: 20,
  background: "#020617",
  boxShadow: "0 40px 120px rgba(0,0,0,0.4)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  border: `1px solid ${color}30`
});

const statValue = {
  fontSize: 32,
  fontWeight: 900
};

const statLabel = {
  opacity: 0.6
};

const tableCard = {
  background: "#020617",
  padding: 40,
  borderRadius: 20,
  boxShadow: "0 40px 120px rgba(0,0,0,0.5)"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  color: "white"
};

const center = { textAlign: "center" };
const bold = { fontWeight: 700 };

const riskBadge = {
  padding: "4px 10px",
  borderRadius: 6,
  background: "rgba(239,68,68,0.2)",
  color: "#f87171",
  fontWeight: 800
};

const okBadge = {
  padding: "4px 10px",
  borderRadius: 6,
  background: "rgba(34,197,94,0.2)",
  color: "#4ade80",
  fontWeight: 800
};
