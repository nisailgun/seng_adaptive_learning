import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  LogOut,
  Save,
  X,
  Shield,
  Users,
  BookOpen
} from 'lucide-react';

export default function Account({ token, user, onLogout }) {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const res = await fetch('http://localhost:4000/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProfile(data);
    setForm({
      email: data.email || '',
      firstName: data.firstName || '',
      lastName: data.lastName || ''
    });
  }

  async function saveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setNotice('');

    try {
      const res = await fetch('http://localhost:4000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error();

      const updated = await res.json();
      setProfile(updated);
      setEdit(false);
      setNotice('Changes saved');
    } catch {
      setNotice('Save failed');
    } finally {
      setLoading(false);
      setTimeout(() => setNotice(''), 3000);
    }
  }

  if (!profile) {
    return <div style={{ padding: 60 }}>Loading profile…</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: 'white' }}>
      
      {/* ===== SIDEBAR (ROUTES BİREBİR) ===== */}
      <aside style={{
        width: 260,
        padding: 30,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Account</h2>

        <NavItem
          icon={<BookOpen size={18} />}
          label="Dashboard"
          onClick={() => navigate('/dashboard')}
        />

        <div style={{ flex: 1 }} />

        <NavItem
          icon={<LogOut size={18} />}
          label="Logout"
          danger
          onClick={onLogout}
        />
      </aside>

      {/* ===== MAIN ===== */}
      <main style={{ flex: 1, padding: 60 }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>
          Profile Overview
        </h1>
        <p style={{ opacity: 0.6, marginBottom: 40 }}>
          Manage your personal information
        </p>

        <form onSubmit={saveProfile} style={{
          maxWidth: 720,
          background: '#020617',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 40px 120px rgba(0,0,0,0.5)'
        }}>

          <Row label="Username">
            <Static>{profile.username}</Static>
          </Row>

          <Row label="Role">
            <Badge role={profile.role}>{profile.role}</Badge>
          </Row>

          <Row label="Email">
            <Input
              disabled={!edit}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </Row>

          <Row label="First Name">
            <Input
              disabled={!edit}
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
            />
          </Row>

          <Row label="Last Name">
            <Input
              disabled={!edit}
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
            />
          </Row>

          {user?.role === 'student' && (
            <div style={{
              marginTop: 30,
              padding: 20,
              borderRadius: 14,
              background: 'linear-gradient(135deg,#6366f1,#22d3ee)',
              color: '#020617'
            }}>
              <strong>Ability Score</strong>
              <div style={{ fontSize: 32, fontWeight: 900 }}>
                θ {profile.theta?.toFixed(2) || '0.00'}
              </div>
            </div>
          )}

          {notice && (
            <div style={{ marginTop: 20, opacity: 0.8 }}>{notice}</div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
            {!edit && (
              <button
                type="button"
                onClick={() => setEdit(true)}
                style={btnPrimary}
              >
                Edit Profile
              </button>
            )}

            {edit && (
              <>
                <button type="submit" disabled={loading} style={btnPrimary}>
                  <Save size={16} /> Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEdit(false);
                    setForm({
                      email: profile.email || '',
                      firstName: profile.firstName || '',
                      lastName: profile.lastName || ''
                    });
                  }}
                  style={btnGhost}
                >
                  <X size={16} /> Cancel
                </button>
              </>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

/* ===== UI PARTS ===== */

function NavItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '12px 14px',
        borderRadius: 10,
        background: danger
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(255,255,255,0.08)',
        color: danger ? '#fecaca' : 'white',
        border: 'none',
        cursor: 'pointer'
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ opacity: 0.5, fontSize: 13, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: 10,
        border: 'none',
        background: '#020617',
        color: 'white',
        outline: '1px solid rgba(255,255,255,0.1)'
      }}
    />
  );
}

function Static({ children }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.06)'
    }}>
      {children}
    </div>
  );
}

function Badge({ role, children }) {
  const colors = {
    admin: '#f43f5e',
    teacher: '#38bdf8',
    student: '#a78bfa'
  };

  return (
    <span style={{
      padding: '6px 14px',
      borderRadius: 20,
      background: colors[role] || '#64748b',
      color: '#020617',
      fontWeight: 800
    }}>
      {children}
    </span>
  );
}

const btnPrimary = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 20px',
  borderRadius: 10,
  border: 'none',
  background: '#6366f1',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer'
};

const btnGhost = {
  ...btnPrimary,
  background: 'rgba(255,255,255,0.1)'
};
