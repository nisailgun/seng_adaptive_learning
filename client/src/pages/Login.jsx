import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginWithGoogle } from '../api';
import { ArrowRight, ChevronLeft } from 'lucide-react';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(username, password);
      onLogin(res.token, res.user);
      navigate('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const demoToken = 'demo-google-token-' + Date.now();
      const res = await loginWithGoogle(demoToken);
      if (res.success) {
        onLogin(res.token, res.user);
        navigate('/dashboard');
      } else {
        setErr(res.error || 'Google sign-in failed.');
      }
    } catch {
      setErr('Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.background} />

      <form onSubmit={submit} style={styles.card}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={styles.back}
        >
          <ChevronLeft size={18} />
          Back to Home
        </button>

        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>
          Sign in to continue your personalized learning journey
        </p>

        {err && <div style={styles.error}>{err}</div>}

        <input
          style={styles.input}
          placeholder="Email or Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={styles.google}
        >
          <img
            alt="google"
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            style={{ width: 18, marginRight: 8 }}
          />
          Sign in with Google
        </button>

        <button
          type="submit"
          disabled={loading}
          style={styles.primary}
        >
          {loading ? 'Signing in…' : 'Sign In'}
          {!loading && <ArrowRight size={18} />}
        </button>

        <p style={styles.footerText}>
          Don’t have an account?{' '}
          <span
            onClick={() => navigate('/register')}
            style={styles.link}
          >
            Create one
          </span>
        </p>
      </form>
    </div>
  );
}

/* ================= INLINE THEME ================= */

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    fontFamily: 'Segoe UI, sans-serif'
  },

  background: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'url(https://images.unsplash.com/photo-1523580846011-d3a5bc25702b)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.15
  },

  card: {
    position: 'relative',
    width: 360,
    padding: 32,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.97)',
    boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },

  back: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    fontWeight: 600
  },

  title: {
    margin: '10px 0 0',
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center'
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#555',
    marginBottom: 10
  },

  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #ddd',
    fontSize: 14,
    outline: 'none',
    transition: '0.2s'
  },

  primary: {
    marginTop: 10,
    padding: '12px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },

  google: {
    marginTop: 6,
    padding: '10px',
    borderRadius: 12,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },

  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    textAlign: 'center'
  },

  footerText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8
  },

  link: {
    color: '#667eea',
    fontWeight: 600,
    cursor: 'pointer'
  }
};
