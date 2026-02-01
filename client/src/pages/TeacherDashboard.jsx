import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Award, BookOpen, LogOut, User, Shield, RefreshCw, Download } from 'lucide-react';

export default function TeacherDashboard({ token, user, onLogout }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([
      loadStudents(),
      loadAnalytics()
    ]);
    setLoading(false);
  }

  async function refreshData() {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }

  async function loadStudents() {
    try {
      const res = await fetch('http://localhost:4000/api/teacher/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStudents(data);
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  }

  async function loadAnalytics() {
    try {
      const reportRes = await fetch('http://localhost:8000/api/reports/class/101');
      const reportData = await reportRes.json();
      setReport(reportData);

      const statsRes = await fetch('http://localhost:8000/api/reports/class/101/average');
      const statsData = await statsRes.json();
      setStats(statsData);
      
      setAnalyticsError(null);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setAnalyticsError("Analytics service not available (optional)");
    }
  }

  async function exportPDF() {
    try {
      // Get all student IDs
      const studentIds = students.map(s => s._id);
      
      // Call the export endpoint
      const response = await fetch('http://localhost:4000/api/reports/class/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentIds })
      });

      if (response.ok) {
        // Download the CSV file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `class-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export report');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting report');
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-main">
          <div className="teacher-loading-container">
            <div className="teacher-loading-text">
              Loading teacher dashboard...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalStudents = students.length;
  const avgTheta = students.reduce((sum, s) => sum + (s.theta || 0), 0) / totalStudents || 0;
  const totalQuestions = students.reduce((sum, s) => sum + (s.stats?.totalQuestions || 0), 0);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h1>Teacher Dashboard</h1>
            <p className="header-subtitle">Monitor student progress and performance</p>
          </div>
          <div className="teacher-header-actions">
            <button 
              className="logout-btn teacher-btn-refresh" 
              onClick={refreshData}
              disabled={refreshing}
              title="Refresh all data"
            >
              <RefreshCw size={20} className={refreshing ? 'spinning' : ''} />
              Refresh
            </button>
            <button 
              className="logout-btn teacher-btn-export" 
              onClick={exportPDF}
              title="Download CSV Report (FR13)"
            >
              <Download size={20} />
              Export CSV
            </button>
            <button 
              className="logout-btn teacher-btn-dashboard" 
              onClick={() => navigate('/dashboard')}
            >
              <BookOpen size={20} />
              Dashboard
            </button>
            <button 
              className="logout-btn teacher-btn-account" 
              onClick={() => navigate('/account')}
            >
              <User size={20} />
              Account
            </button>
            {user?.role === 'admin' && (
              <button 
                className="logout-btn teacher-btn-admin" 
                onClick={() => navigate('/admin')}
              >
                <Shield size={20} />
                Admin
              </button>
            )}
            <button className="logout-btn" onClick={onLogout}>
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="teacher-dashboard-content">
        <h2 className="teacher-header-title">
          <Users size={36} color="#667eea" />
          Student Overview
        </h2>
        <p className="teacher-header-subtitle">
          Class performance metrics and individual progress tracking
        </p>

        {/* Stats Overview */}
        <div className="teacher-stats-grid"
        >
          <div className="teacher-stat-card teacher-stat-card-purple">
            <div className="teacher-stat-header">
              <Users size={24} />
              <span className="teacher-stat-label">Total Students</span>
            </div>
            <div className="teacher-stat-value">{totalStudents}</div>
          </div>

          <div className="teacher-stat-card teacher-stat-card-blue">
            <div className="teacher-stat-header">
              <TrendingUp size={24} />
              <span className="teacher-stat-label">Avg Ability (θ)</span>
            </div>
            <div className="teacher-stat-value">{avgTheta.toFixed(2)}</div>
          </div>

          <div className="teacher-stat-card teacher-stat-card-pink">
            <div className="teacher-stat-header">
              <BookOpen size={24} />
              <span className="teacher-stat-label">Total Questions</span>
            </div>
            <div className="teacher-stat-value">{totalQuestions}</div>
          </div>

          {stats && (
            <div className="teacher-stat-card teacher-stat-card-green">
              <div className="teacher-stat-header">
                <Award size={24} />
                <span className="teacher-stat-label">Avg Retention</span>
              </div>
              <div className="teacher-stat-value">{stats.average_retention}%</div>
            </div>
          )}
        </div>

        {/* Students Table */}
        <div className="teacher-students-table">
          <h3 className="teacher-table-title">
            Student Performance Details
          </h3>

          {students.length === 0 ? (
            <div className="teacher-empty-state">
              No students found. Students will appear here once they register.
            </div>
          ) : (
            <div className="teacher-table-scroll">
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th className="center">Ability (θ)</th>
                    <th className="center">Questions</th>
                    <th className="center">Accuracy</th>
                    <th className="center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const accuracy = student.stats?.accuracy || 0;
                    const isAtRisk = accuracy < 50 || student.theta < -1;
                    
                    return (
                      <tr key={student._id}>
                        <td className="bold">
                          {student.username}
                        </td>
                        <td>
                          {student.firstName && student.lastName 
                            ? `${student.firstName} ${student.lastName}`
                            : '-'}
                        </td>
                        <td className="center">
                          <span className="teacher-theta-badge">
                            {student.theta?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="center bold">
                          {student.stats?.totalQuestions || 0}
                        </td>
                        <td className="center">
                          <span className={
                            accuracy >= 70 ? 'teacher-accuracy-high' :
                            accuracy >= 50 ? 'teacher-accuracy-medium' : 'teacher-accuracy-low'
                          }>
                            {accuracy}%
                          </span>
                        </td>
                        <td className="center">
                          {isAtRisk ? (
                            <span className="teacher-status-risk">
                              ⚠️ AT RISK
                            </span>
                          ) : (
                            <span className="teacher-status-good">
                              ✓ ON TRACK
                            </span>
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

        {/* Advanced Analytics Section */}
        {report && report.data && report.data.length > 0 && (
          <div className="teacher-analytics-section">
            <h3 className="teacher-analytics-title">
              📊 Advanced Analytics (from Analytics Service)
            </h3>
            
            <div className="teacher-table-scroll">
              <table className="teacher-analytics-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Retention Score</th>
                    <th>Risk Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.map((student) => (
                    <tr key={student.id}>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.level}</td>
                      <td>
                        <span className={
                          student.retention >= 70 ? 'teacher-retention-high' :
                          student.retention >= 50 ? 'teacher-retention-medium' : 'teacher-retention-low'
                        }>
                          {student.retention}%
                        </span>
                      </td>
                      <td>
                        {student.risk ? (
                          <span className="teacher-status-risk">
                            ⚠️ AT RISK
                          </span>
                        ) : (
                          <span className="teacher-status-good">
                            ✓ ON TRACK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Error/Info Message */}
        {analyticsError && (
          <div className="teacher-analytics-error">
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <span>{analyticsError} - Running on port 8000 (optional service)</span>
          </div>
        )}
      </div>
    </div>
  );
}
