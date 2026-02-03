import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  UserCheck,
  UserCog,
  LogOut,
  BookOpen,
  User
} from 'lucide-react';

export default function AdminDashboard({ token, onLogout }) {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('http://localhost:4000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(userId, role) {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(
        `http://localhost:4000/api/admin/users/${userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ role })
        }
      );

      if (res.ok) await fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  }

  if (loading) {
    return (
      <div style={page}>
        <div style={{ padding: 60 }}>Loading users…</div>
      </div>
    );
  }

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    student: users.filter(u => !u.role || u.role === 'student').length
  };

  return (
    <div style={page}>
      {/* HEADER */}
      <header style={header}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>Admin Dashboard</h1>
          <p style={{ opacity: 0.6 }}>Manage users and system settings</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <HeaderBtn icon={<BookOpen />} onClick={() => navigate('/dashboard')} />
          <HeaderBtn icon={<User />} onClick={() => navigate('/account')} />

          <HeaderBtn
            icon={<Shield />}
            onClick={() => navigate('/admin/audit-logs')}
            danger
          />
          <HeaderBtn icon={<LogOut />} onClick={onLogout} />
        </div>
      </header>

      <main style={{ padding: 50 }}>
        {/* STATS */}
        <div style={statGrid}>
          <StatCard title="Admins" value={roleStats.admin} icon={<Shield />} />
          <StatCard title="Teachers" value={roleStats.teacher} icon={<UserCheck />} />
          <StatCard title="Students" value={roleStats.student} icon={<Users />} />
          <StatCard title="Total Users" value={users.length} icon={<UserCog />} />
        </div>

        {/* TABLE */}
        <div style={tableCard}>
          <h3 style={{ marginBottom: 20, fontSize: 20 }}>User Management</h3>

          <table style={table}>
            <thead>
              <tr>
                <Th>Username</Th>
                <Th>Email</Th>
                <Th center>Role</Th>
                <Th center>θ</Th>
                <Th center>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={row}>
                  <Td>{u.username}</Td>
                  <Td>{u.email || '-'}</Td>

                  <Td center>
                    <span style={badge(u.role || 'student')}>
                      {u.role || 'student'}
                    </span>
                  </Td>

                  <Td center>{u.theta?.toFixed(2) || '0.00'}</Td>

                  <Td center>
                    <select
                      value={u.role || 'student'}
                      onChange={e => updateRole(u._id, e.target.value)}
                      disabled={updatingUserId === u._id}
                      style={select}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function HeaderBtn({ icon, onClick, accent, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btn,
        background: danger
          ? 'rgba(239,68,68,0.2)'
          : accent
          ? 'rgba(79,172,254,0.2)'
          : 'rgba(255,255,255,0.08)',
        color: danger ? '#fecaca' : 'white'
      }}
    >
      {icon}
    </button>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div style={statCard}>
      <div style={{ opacity: 0.7 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, opacity: 0.6 }}>{title}</div>
        <div style={{ fontSize: 32, fontWeight: 900 }}>{value}</div>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const page = {
  minHeight: '100vh',
  background: '#0f172a',
  color: 'white'
};

const header = {
  padding: '24px 40px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)'
};

const btn = {
  border: 'none',
  padding: 10,
  borderRadius: 10,
  cursor: 'pointer'
};

const statGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 20,
  marginBottom: 40
};

const statCard = {
  background: 'linear-gradient(135deg,#6366f1,#22d3ee)',
  color: '#020617',
  borderRadius: 18,
  padding: 24,
  display: 'flex',
  gap: 14,
  alignItems: 'center',
  fontWeight: 800
};

const tableCard = {
  background: '#020617',
  borderRadius: 20,
  padding: 30,
  boxShadow: '0 40px 120px rgba(0,0,0,0.5)'
};

const table = {
  width: '100%',
  borderCollapse: 'collapse'
};

const Th = ({ children, center }) => (
  <th
    style={{
      textAlign: center ? 'center' : 'left',
      opacity: 0.6,
      paddingBottom: 12
    }}
  >
    {children}
  </th>
);

const Td = ({ children, center }) => (
  <td
    style={{
      padding: '14px 0',
      textAlign: center ? 'center' : 'left'
    }}
  >
    {children}
  </td>
);

const row = {
  borderBottom: '1px solid rgba(255,255,255,0.05)'
};

const badge = role => ({
  padding: '6px 14px',
  borderRadius: 20,
  fontWeight: 800,
  background:
    role === 'admin'
      ? '#f43f5e'
      : role === 'teacher'
      ? '#38bdf8'
      : '#a78bfa',
  color: '#020617'
});

const select = {
  background: '#020617',
  color: 'white',
  borderRadius: 8,
  padding: '6px 10px',
  border: '1px solid rgba(255,255,255,0.2)'
};
