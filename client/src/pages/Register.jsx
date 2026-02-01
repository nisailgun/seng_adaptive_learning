import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api';
import { Mail, Lock, User, ArrowRight, CheckCircle, ChevronLeft } from 'lucide-react';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMsg('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await register(username, password);
      setSuccess(true);
      setMsg('✨ Account created successfully!');
      // Auto-login after successful registration
      if (res.token && res.user) {
        onLogin(res.token, res.user);
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch(e) {
      setMsg(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80" alt="background" />
      </div>
      <form onSubmit={submit} className="auth-card">
        <button type="button" className="back-button" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
          Back
        </button>
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Start your learning adventure today</p>
        </div>
        
        {success && <div className="success-alert"><CheckCircle size={20} /> {msg}</div>}
        {!success && msg && <div className="error-alert">{msg}</div>}
        
        <div className="form-group">
          <label>Username</label>
          <div className="input-wrapper">
            <input 
              type="text"
              placeholder="Choose a username" 
              value={username} 
              onChange={e=>setUsername(e.target.value)}
              required
              minLength={3}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="input-wrapper">
            <input 
              type="password"
              placeholder="Create a strong password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <div className="input-wrapper">
            <input 
              type="password"
              placeholder="Confirm your password" 
              value={confirmPassword} 
              onChange={e=>setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
          {!loading && <ArrowRight size={20} />}
        </button>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <p className="auth-switch">
          <button 
            type="button" 
            className="link-button-auth" 
            onClick={() => navigate('/login')}
          >
            Sign in instead
          </button>
        </p>
      </form>
    </div>
  );
}
