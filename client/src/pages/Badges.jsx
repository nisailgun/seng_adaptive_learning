import React, { useState, useEffect } from 'react';

export default function Badges({ token, user }) {
  const [gamification, setGamification] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('badges'); // 'badges' or 'leaderboard'

  useEffect(() => {
    loadGamificationData();
  }, []);

  async function loadGamificationData() {
    try {
      const [gamifRes, leaderRes] = await Promise.all([
        fetch(`http://localhost:4000/api/gamification/user/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:4000/api/gamification/leaderboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (gamifRes.ok) {
        const gamifData = await gamifRes.json();
        setGamification(gamifData);
      }

      if (leaderRes.ok) {
        const leaderData = await leaderRes.json();
        setLeaderboard(leaderData);
      }
    } catch (e) {
      console.error('Failed to load gamification data:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="badges-page"><div className="loading">Loading achievements...</div></div>;
  }

  const getRarityColor = (rarity) => {
    const colors = {
      common: '#95a5a6',
      uncommon: '#3498db',
      rare: '#9b59b6',
      epic: '#e74c3c',
      legendary: '#f39c12'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityGlow = (rarity) => {
    const colors = {
      common: 'rgba(149, 165, 166, 0.3)',
      uncommon: 'rgba(52, 152, 219, 0.3)',
      rare: 'rgba(155, 89, 182, 0.3)',
      epic: 'rgba(231, 76, 60, 0.3)',
      legendary: 'rgba(243, 156, 18, 0.3)'
    };
    return colors[rarity] || colors.common;
  };

  return (
    <div className="badges-page">
      <div className="badges-container">
        <h1>🏆 Achievements & Leaderboard</h1>
        
        {/* Stats Summary */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">💎</div>
            <div className="stat-content">
              <div className="stat-value">{gamification?.totalPoints || 0}</div>
              <div className="stat-label">Total Points</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏅</div>
            <div className="stat-content">
              <div className="stat-value">{gamification?.totalBadges || 0}</div>
              <div className="stat-label">Badges Earned</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">{gamification?.streak || 0}</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            🏅 My Badges
          </button>
          <button
            className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            👑 Leaderboard
          </button>
        </div>

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="badges-content">
            {gamification?.badges && gamification.badges.length > 0 ? (
              <div className="badges-grid">
                {gamification.badges.map((badge, index) => (
                  <div
                    key={index}
                    className={`badge-card badge-${badge.rarity}`}
                  >
                    <div className="badge-icon">{badge.icon}</div>
                    <h3 className="badge-name">{badge.name}</h3>
                    <p className="badge-description">{badge.description}</p>
                    <div className="badge-meta">
                      <span
                        className={`badge-rarity badge-rarity-${badge.rarity}`}
                      >
                        {badge.rarity}
                      </span>
                      <span className="badge-points">+{badge.points} pts</span>
                    </div>
                    <div className="badge-earned">
                      Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <h3>No Badges Yet</h3>
                <p>Complete lessons and quizzes to earn your first badge!</p>
              </div>
            )}

            {/* Rarity Breakdown */}
            {gamification?.badgesByRarity && (
              <div className="rarity-breakdown">
                <h3>Badges by Rarity</h3>
                <div className="rarity-bars">
                  {Object.entries(gamification.badgesByRarity).map(([rarity, count]) => (
                    <div key={rarity} className="rarity-bar-item">
                      <span className="rarity-name">{rarity}</span>
                      <div className="rarity-bar-bg">
                        <div
                          className={`rarity-bar-fill rarity-bar-${rarity}`}
                          style={{ width: `${(count / gamification.totalBadges) * 100}%` }}
                        />
                      </div>
                      <span className="rarity-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="leaderboard-content">
            {leaderboard.length > 0 ? (
              <div className="leaderboard-table">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.username === user.username;
                  const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                  
                  return (
                    <div
                      key={index}
                      className={`leaderboard-row ${isCurrentUser ? 'current-user' : ''}`}
                    >
                      <div className="rank">
                        {rankIcon || `#${entry.rank}`}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{entry.name}</div>
                        <div className="user-stats">
                          {entry.badges} badges • θ={entry.theta}
                        </div>
                      </div>
                      <div className="user-points">
                        <div className="points-value">{entry.points}</div>
                        <div className="points-label">points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👑</div>
                <h3>Leaderboard Empty</h3>
                <p>Be the first to earn points and climb to the top!</p>
              </div>
            )}
          </div>
        )}
      </div>

<style>{
`
/* ================================
   GLOBAL PAGE CONTAINER
================================ */
.badges-page {
  padding: 30px 16px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  background: #0f172a;
  min-height: 100vh;
  color: white;
  box-sizing: border-box;
}

/* ================================
   TITLE
================================ */
.badges-container h1 {
  font-size: clamp(26px, 4vw, 38px);
  margin-bottom: 32px;
  text-align: center;
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ================================
   STATS CARDS
================================ */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: clamp(18px, 2vw, 26px);
  display: flex;
  align-items: center;
  gap: 16px;
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.4);
}

.stat-icon {
  font-size: clamp(36px, 4vw, 52px);
}

.stat-value {
  font-size: clamp(22px, 3.5vw, 36px);
  font-weight: 900;
  color: #38bdf8;
}

.stat-label {
  font-size: clamp(13px, 2vw, 16px);
  opacity: 0.6;
}

/* ================================
   TABS
================================ */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid rgba(255,255,255,0.1);
  overflow-x: auto;
}

.tab {
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: clamp(14px, 2.5vw, 18px);
  font-weight: 700;
  white-space: nowrap;
  color: #94a3b8;
  border-bottom: 3px solid transparent;
  transition: 0.25s;
}

.tab.active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
}

/* ================================
   BADGES GRID
================================ */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: clamp(16px, 3vw, 24px);
  width: 100%;
}

.badge-card {
  background: #1e293b;
  border-radius: 16px;
  padding: clamp(18px, 3vw, 26px);
  text-align: center;
  border: 3px solid;
  transition: 0.3s;
  box-shadow: 0 0 20px rgba(0,0,0,0.4);
}

.badge-card:hover {
  transform: translateY(-4px);
}

.badge-icon {
  font-size: clamp(48px, 5vw, 72px);
  margin-bottom: 12px;
}

.badge-name {
  font-size: clamp(18px, 3.5vw, 22px);
  font-weight: 800;
  margin-bottom: 8px;
}

.badge-description {
  font-size: clamp(13px, 2.5vw, 15px);
  opacity: 0.7;
  margin-bottom: 12px;
}

.badge-meta {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.badge-rarity {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: clamp(11px, 2vw, 13px);
  font-weight: 700;
}

.badge-points {
  padding: 4px 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  font-size: clamp(11px, 2vw, 13px);
  color: #38bdf8;
}

.badge-earned {
  font-size: clamp(11px, 2vw, 13px);
  opacity: 0.6;
}

/* ================================
   RARITY BREAKDOWN
================================ */
.rarity-breakdown {
  background: #1e293b;
  border-radius: 14px;
  padding: clamp(20px, 3vw, 28px);
  margin-top: 32px;
}

.rarity-breakdown h3 {
  font-size: clamp(18px, 3vw, 22px);
  margin-bottom: 16px;
}

.rarity-bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rarity-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rarity-name {
  width: clamp(80px, 18vw, 120px);
  font-weight: 700;
  text-transform: capitalize;
  font-size: clamp(13px, 2.5vw, 15px);
}

.rarity-bar-bg {
  flex: 1;
  height: 20px;
  background: rgba(255,255,255,0.15);
  border-radius: 10px;
  overflow: hidden;
}

.rarity-bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.4s ease;
}

.rarity-count {
  width: clamp(30px, 8vw, 50px);
  font-weight: 700;
  text-align: right;
  font-size: clamp(14px, 2.5vw, 18px);
}

/* ================================
   LEADERBOARD
================================ */
.leaderboard-table {
  background: #1e293b;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.leaderboard-row {
  display: flex;
  align-items: center;
  padding: clamp(12px, 3vw, 20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  gap: 16px;
  flex-wrap: wrap;
}

.leaderboard-row:hover {
  background: rgba(255,255,255,0.05);
}

.leaderboard-row.current-user {
  background: rgba(56,189,248,0.2);
  border-left: 4px solid #38bdf8;
}

.rank {
  width: clamp(46px, 10vw, 60px);
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 900;
  text-align: center;
}

.user-info {
  flex: 1;
  min-width: 140px;
}

.user-name {
  font-size: clamp(16px, 3vw, 20px);
  font-weight: 800;
}

.user-stats {
  font-size: clamp(12px, 2.5vw, 14px);
  opacity: 0.7;
}

.user-points {
  text-align: right;
  min-width: 80px;
}

.points-value {
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 900;
  color: #38bdf8;
}

.points-label {
  font-size: clamp(11px, 2vw, 13px);
  opacity: 0.6;
}

/* ================================
   EMPTY STATE
================================ */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #1e293b;
  border-radius: 14px;
}

.empty-icon {
  font-size: clamp(60px, 15vw, 100px);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: clamp(20px, 4vw, 28px);
  margin-bottom: 8px;
}

.empty-state p {
  opacity: 0.7;
  font-size: clamp(14px, 2.5vw, 16px);
}

/* ================================
   LOADING
================================ */
.loading {
  text-align: center;
  padding: 60px;
  font-size: clamp(18px, 3vw, 22px);
  opacity: 0.7;
}
`
}</style>


    </div>
  );
}
