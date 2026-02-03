import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  createSupportTicket,
  getSupportTickets,
  resolveSupportTicket
} from "../api";
import { LogOut, BookOpen, Layers, HelpCircle, User, Inbox } from "lucide-react";

/* ------------------------------------
   SIDEBAR ITEM
------------------------------------ */
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

/* ------------------------------------
   MAIN COMPONENT
------------------------------------ */
export default function Support({ token, onLogout }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("new");

  // FORM STATE
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  // HISTORY STATE
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const loadTickets = async () => {
    try {
      setLoadingTickets(true);
      const data = await getSupportTickets(token);
      setTickets(data.tickets || []);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadTickets();
  }, [activeTab]);

  /* ------------------------------------
     FORM SUBMIT
  ------------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) {
      setSubmitMessage({
        type: "error",
        text: "Please fill in all required fields."
      });
      return;
    }

    try {
      setSubmitting(true);
      const result = await createSupportTicket(
        token,
        subject,
        message,
        priority
      );

      setSubmitMessage({
        type: "success",
        text: result.message || "Request submitted successfully!"
      });

      setSubject("");
      setMessage("");
      setPriority("normal");

      setTimeout(() => setSubmitMessage(null), 3500);
    } catch (e) {
      setSubmitMessage({
        type: "error",
        text: "Failed to submit request."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = {
    open: "#3b82f6",
    in_progress: "#f59e0b",
    resolved: "#22c55e",
    closed: "#9ca3af"
  };

  const priorityLabels = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent"
  };

  /* ------------------------------------
     MAIN RENDER
  ------------------------------------ */
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f172a",
        color: "white"
      }}
    >
      {/* SIDEBAR */}
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
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Support</h2>

        <NavItem
          icon={<BookOpen size={18} />}
          label="Dashboard"
          onClick={() => navigate("/dashboard")}
        />

        <NavItem
          icon={<Layers size={18} />}
          label="Learning Path"
          onClick={() => navigate("/dashboard")}
        />

        <NavItem
          icon={<HelpCircle size={18} />}
          label="Support"
          onClick={() => {}}
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

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: 60, overflowY: "auto" }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
          🎫 Help & Support
        </h1>
        <p style={{ opacity: 0.6, marginBottom: 30 }}>
          Submit requests or review your past support tickets.
        </p>

        {/* TABS */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 30
          }}
        >
          <button
            style={{
              ...tabStyle,
              background:
                activeTab === "new"
                  ? "linear-gradient(135deg,#6366f1,#22d3ee)"
                  : "rgba(255,255,255,0.08)",
              color: activeTab === "new" ? "#020617" : "white"
            }}
            onClick={() => setActiveTab("new")}
          >
            📝 Create Request
          </button>

          <button
            style={{
              ...tabStyle,
              background:
                activeTab === "history"
                  ? "linear-gradient(135deg,#6366f1,#22d3ee)"
                  : "rgba(255,255,255,0.08)",
              color: activeTab === "history" ? "#020617" : "white"
            }}
            onClick={() => setActiveTab("history")}
          >
            📋 My Requests
          </button>
        </div>

        {/* ------------------------------------
            NEW SUPPORT REQUEST FORM
        ------------------------------------ */}
        {activeTab === "new" && (
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontWeight: 800 }}>
              Create Support Request
            </h2>
            <p style={{ opacity: 0.6, marginBottom: 20 }}>
              Describe your issue below.
            </p>

            {submitMessage && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  marginBottom: 20,
                  background:
                    submitMessage.type === "success"
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(239,68,68,0.15)"
                }}
              >
                {submitMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* SUBJECT */}
              <label style={labelStyle}>Subject *</label>
              <input
                style={inputStyle}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Unable to log in"
              />

              {/* PRIORITY */}
              <label style={labelStyle}>Priority</label>
              <select
                style={inputStyle}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              {/* MESSAGE */}
              <label style={labelStyle}>Message *</label>
              <textarea
                style={{ ...inputStyle, height: 120 }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue in detail..."
              />

              <button
                type="submit"
                disabled={submitting}
                style={{ ...btnPrimary, marginTop: 20 }}
              >
                {submitting ? "Submitting..." : "📤 Submit Request"}
              </button>
            </form>
          </div>
        )}

        {/* ------------------------------------
            HISTORY VIEW
        ------------------------------------ */}
        {activeTab === "history" && (
          <div style={cardStyle}>
            <h2 style={{ fontWeight: 800, marginBottom: 20 }}>
              Your Support Requests
            </h2>

            {loadingTickets ? (
              <div style={{ opacity: 0.6 }}>Loading…</div>
            ) : tickets.length === 0 ? (
              <div
                style={{
                  padding: 60,
                  textAlign: "center",
                  opacity: 0.5,
                  fontSize: 18
                }}
              >
                <Inbox size={40} style={{ marginBottom: 10 }} />
                <p>No previous support tickets found.</p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  style={{
                    marginBottom: 20,
                    padding: 20,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(6px)"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10
                    }}
                  >
                    <strong>
                      #{t.id} — {t.subject}
                    </strong>

                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        background: statusColor[t.status] || "#666",
                        color: "black",
                        fontWeight: 700,
                        fontSize: 12
                      }}
                    >
                      {t.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  <p style={{ opacity: 0.7, marginBottom: 10 }}>
                    {t.message.length > 140
                      ? t.message.substring(0, 140) + "…"
                      : t.message}
                  </p>

                  {t.status === "open" && (
                    <button
                      onClick={async () => {
                        await resolveSupportTicket(token, t.id);
                        loadTickets();
                      }}
                      style={{
                        ...btnPrimary,
                        background: "#22c55e",
                        marginBottom: 10
                      }}
                    >
                      Mark as Resolved
                    </button>
                  )}

                  <div style={{ opacity: 0.6, fontSize: 14 }}>
                    Priority: {priorityLabels[t.priority]} •{" "}
                    {new Date(t.createdAt).toLocaleDateString("en-US")}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------
   SHARED STYLES
------------------------------------ */
const cardStyle = {
  background: "#020617",
  padding: 40,
  borderRadius: 20,
  boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
  maxWidth: 900
};

const labelStyle = {
  display: "block",
  opacity: 0.7,
  marginBottom: 6,
  marginTop: 20,
  fontSize: 14
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "none",
  outline: "1px solid rgba(255,255,255,0.1)",
  color: "white"
};

const tabStyle = {
  padding: "12px 20px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  border: "none"
};

const btnPrimary = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#6366f1",
  color: "white",
  cursor: "pointer",
  fontWeight: 700
};
