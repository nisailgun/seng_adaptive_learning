import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkNeedsGeneration } from '../api';
import LearningPath from './LearningPath';
import InitialPathGenerator from '../components/InitialPathGenerator';

function getLanguageCode() {
  return localStorage.getItem("languageCode") || "en";
}

function appendOfflineProgress(entry) {
  const key = "offlineProgress";
  const existingRaw = localStorage.getItem(key);
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  const list = Array.isArray(existing) ? existing : [existing];
  list.push(entry);
  localStorage.setItem(key, JSON.stringify(list));
}

export default function Dashboard({ token, user, onLogout }) {
  const navigate = useNavigate();
  const [needsPathGeneration, setNeedsPathGeneration] = useState(false);
  const [checkingPath, setCheckingPath] = useState(true);
  const [generatedPath, setGeneratedPath] = useState(null);
  const [showPath, setShowPath] = useState(true);

  const load = async () => {
    try {
      const lang = getLanguageCode();
      const q = await getNextQuestion(token, lang);

      if (q.message) {
        setQuestion(null);
        setStatus(q.message);
      } else {
        setQuestion(q);
        setStatus(null);
      }
    } catch (e) {
      setStatus(e.response?.data?.error || 'Failed to load');
    }
  };

  const checkInitialPath = async () => {
    try {
      setCheckingPath(true);
      const result = await checkNeedsGeneration(token);
      setNeedsPathGeneration(result.needsGeneration);
    } catch (e) {
      console.error('Failed to check path generation:', e);
      setNeedsPathGeneration(false);
    } finally {
      setCheckingPath(false);
    }
  };

  useEffect(() => {
    checkInitialPath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePathGenerated = (path) => {
    setGeneratedPath(path);
    setNeedsPathGeneration(false);
  };

  // Show loading state while checking
  if (checkingPath) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading-wrapper">
          <div className="dashboard-spinner" />
          <p className="dashboard-spinner-text">Setting up your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show path generator for new users
  if (needsPathGeneration) {
    return (
      <div className="dashboard-container">
        <InitialPathGenerator 
          token={token} 
          onComplete={handlePathGenerated}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-full">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-container">
          <h1 className="dashboard-title">📖 Adaptive English</h1>
          <div className="dashboard-nav-links">
            <button className="nav-link" onClick={() => navigate('/dashboard')}>Dashboard</button>
            <button className="nav-link" onClick={() => setShowPath((s) => !s)}>Learning Path</button>
            <button className="nav-link" onClick={() => navigate('/support')}>Support</button>
            <button className="nav-link" onClick={() => navigate('/account')}>Account</button>
            <button className="btn-logout" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2 className="welcome-text">Welcome back, {user?.username}! 👋</h2>
          <p className="welcome-subtitle">Ready to continue your English learning journey?</p>
        </div>

        {showPath && (
          <div className="content-panel">
            <LearningPath token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
