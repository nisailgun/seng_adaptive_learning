import React, { useEffect, useState } from 'react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/api/audit-logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error('Audit fetch error:', err));
  }, []);

  const filteredLogs = logs.filter(log =>
    log.user.toLowerCase().includes(filter.toLowerCase()) ||
    log.action.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #020617, #000)',
      color: '#e5e7eb',
      padding: 50
    }}>

      {/* HEADER */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1px' }}>
          Audit Control Center
        </h1>
        <p style={{ opacity: 0.6 }}>
          Real-time security & system activity monitoring
        </p>
      </div>

      {/* SEARCH */}
      <div style={{ marginBottom: 30 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search by user or action…"
          style={{
            width: 360,
            padding: '14px 18px',
            borderRadius: 14,
            background: '#020617',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.12)',
            outline: 'none',
            fontSize: 15
          }}
        />
      </div>

      {/* LOG GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 22
      }}>
        {filteredLogs.map(log => (
          <div
            key={log._id}
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 18,
              padding: 22,
              backdropFilter: 'blur(8px)'
            }}
          >
            {/* TOP */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14
            }}>
              <span style={{
                fontSize: 12,
                opacity: 0.6
              }}>
                {new Date(log.timestamp).toLocaleString()}
              </span>

              <StatusChip status={log.status} />
            </div>

            {/* ACTION */}
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 6,
              color: '#38bdf8'
            }}>
              {log.action}
            </div>

            {/* USER */}
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              👤 {log.user}
            </div>

            {/* IP */}
            <div style={{
              fontSize: 13,
              fontFamily: 'monospace',
              opacity: 0.6,
              marginTop: 4
            }}>
              IP: {log.ip_address}
            </div>

            {/* DETAILS */}
            {log.details && (
              <div style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px dashed rgba(255,255,255,0.15)',
                fontSize: 13,
                opacity: 0.7,
                lineHeight: 1.5
              }}>
                {log.details}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div style={{ marginTop: 60, opacity: 0.5 }}>
          No logs match your search.
        </div>
      )}
    </div>
  );
}

/* ---------- SMALL UI PARTS ---------- */

function StatusChip({ status }) {
  const isFail = status === 'FAILURE';

  return (
    <span style={{
      padding: '6px 14px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: '0.5px',
      background: isFail
        ? 'rgba(239,68,68,0.2)'
        : 'rgba(34,197,94,0.2)',
      color: isFail ? '#fca5a5' : '#86efac'
    }}>
      {isFail ? 'FAILURE' : 'SUCCESS'}
    </span>
  );
}
