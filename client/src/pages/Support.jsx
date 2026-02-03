import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSupportTicket, getSupportTickets, resolveSupportTicket } from '../api';

export default function Support({ token }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

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
    if (activeTab === 'history') loadTickets();
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !message) {
      setSubmitMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await createSupportTicket(token, subject, message, priority);
      setSubmitMessage({ type: 'success', text: res.message || 'Request sent successfully.' });
      setSubject('');
      setMessage('');
      setPriority('normal');
    } catch {
      setSubmitMessage({ type: 'error', text: 'Something went wrong.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitMessage(null), 4000);
    }
  };

  const statusColor = (s) =>
    s === 'open' ? '#4facfe' :
    s === 'in_progress' ? '#f59e0b' :
    s === 'resolved' ? '#22c55e' : '#9ca3af';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea, #764ba2)',
      padding: '40px 20px'
    }}>
      {/* HEADER */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
      }}>
        <h1 style={{ margin: 0 }}>🎫 Support Center</h1>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 10,
            cursor: 'pointer'
          }}
        >
          ← Dashboard
        </button>
      </div>

      {/* CARD */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        background: 'white',
        borderRadius: 20,
        padding: 30,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        {/* TABS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
          {['new', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: activeTab === tab
                  ? 'linear-gradient(135deg,#667eea,#764ba2)'
                  : '#f3f4f6',
                color: activeTab === tab ? 'white' : '#374151'
              }}
            >
              {tab === 'new' ? '📝 New Request' : '📋 My Requests'}
            </button>
          ))}
        </div>

        {/* NEW REQUEST */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
            {submitMessage && (
              <div style={{
                marginBottom: 20,
                padding: 12,
                borderRadius: 10,
                background: submitMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: submitMessage.type === 'success' ? '#166534' : '#991b1b'
              }}>
                {submitMessage.text}
              </div>
            )}

            <label style={label}>Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={input}
              placeholder="Short summary"
            />

            <label style={label}>Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              style={input}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <label style={label}>Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              style={{ ...input, resize: 'vertical' }}
            />

            <button
              disabled={submitting}
              style={{
                marginTop: 20,
                width: '100%',
                padding: 14,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: 'linear-gradient(135deg,#4facfe,#00f2fe)',
                color: 'white'
              }}
            >
              {submitting ? 'Sending...' : 'Submit Request'}
            </button>
          </form>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <>
            {loadingTickets ? (
              <p>Loading...</p>
            ) : tickets.length === 0 ? (
              <p>No support requests yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {tickets.map(t => (
                  <div key={t.id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 14,
                    padding: 16
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>#{t.id} – {t.subject}</strong>
                      <span style={{
                        background: statusColor(t.status),
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12
                      }}>
                        {t.status}
                      </span>
                    </div>

                    <p style={{ color: '#555', margin: '10px 0' }}>
                      {t.message}
                    </p>

                    {t.status === 'open' && (
                      <button
                        onClick={async () => {
                          await resolveSupportTicket(token, t.id);
                          loadTickets();
                        }}
                        style={{
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 8,
                          cursor: 'pointer'
                        }}
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const label = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 600,
  marginTop: 16
};

const input = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #d1d5db',
  outline: 'none'
};
