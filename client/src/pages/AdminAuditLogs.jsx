import React, { useState, useEffect } from 'react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');

  // Pull Data
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/api/audit-logs', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error("Log hatası:", err));
  }, []);

  // Filtering Logic (For Search Box)
  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(filter.toLowerCase()) || 
    log.action.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
      
      <h2 style={{ color: '#d32f2f', borderBottom: '2px solid #d32f2f', paddingBottom: '10px' }}>
        🛡️ SECURITY AUDIT LOGS
      </h2>

      {/* Search Box*/}
      <input 
        type="text" 
        placeholder="Search user or action..." 
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ padding: '10px', width: '300px', marginBottom: '20px', border: '1px solid #ccc' }}
      />

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <thead style={{ backgroundColor: '#333', color: 'white' }}>
          <tr>
            <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>User</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>IP Address</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map(log => (
            <tr key={log._id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{new Date(log.timestamp).toLocaleString()}</td>
              <td style={{ padding: '10px', fontWeight: 'bold', color: '#0288d1' }}>{log.action}</td>
              <td style={{ padding: '10px' }}>{log.user}</td>
              <td style={{ padding: '10px', fontFamily: 'monospace' }}>{log.ip_address}</td>
              <td style={{ padding: '10px' }}>
                {log.status === 'FAILURE' ? 
                  <span style={{ backgroundColor: 'red', color: 'white', padding: '3px 8px', borderRadius: '4px' }}>FAIL</span> : 
                  <span style={{ color: 'green' }}>OK</span>
                }
              </td>
              <td style={{ padding: '10px', color: '#666' }}>{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}